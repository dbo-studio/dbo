import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../../pages";

/** Tab open/close leak check (docs/development/frontend-performance.md B11, P14). Opt-in: PERF=1. */
test.skip(process.env.PERF !== "1", "perf only");

const TABS = Number(process.env.PERF_TABS ?? 30);
const OUT =
  process.env.PERF_OUT ?? path.resolve(__dirname, "../../perf-results.jsonl");

function record(id: string, metrics: Record<string, number | string>) {
  fs.appendFileSync(
    OUT,
    JSON.stringify({ id, ...metrics, at: new Date().toISOString() }) + "\n",
  );
  console.log(`[perf] ${id} ${JSON.stringify(metrics)}`);
}

/** Record counts per IndexedDB store across every database of the page. */
const idbCounts = (page: Page) =>
  page.evaluate(async () => {
    const out: Record<string, number> = {};
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((ok, err) => {
        const r = indexedDB.open(info.name!);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => err(r.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        out[store] = await new Promise<number>((ok, err) => {
          const r = db.transaction(store).objectStore(store).count();
          r.onsuccess = () => ok(r.result);
          r.onerror = () => err(r.error);
        });
      }
      db.close();
    }
    return out;
  });

async function heapMb(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  await cdp.detach();
  return (
    Math.round(
      (metrics.find((m) => m.name === "JSHeapUsedSize")!.value / 1048576) * 10,
    ) / 10
  );
}

test("B11 open and close tabs, check leaks", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `perf-tabs-${suffix}`;
  const dbPath = `/tmp/dbo-e2e-perf-tabs-${suffix}.db`;
  ensureSqliteDbFile(dbPath);

  await withConnectionCleanup(page, connectionName, async () => {
    try {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(
        getDbConfig("sqlite", connectionName, dbPath),
      );
      await sqlEditor.open();

      const tabs = page.locator("[data-tab-id]");
      expect(await tabs.count()).toBe(1);
      const heap0 = await heapMb(page);
      const idb0 = await idbCounts(page);

      const CYCLES = Number(process.env.PERF_CYCLES ?? 1);
      for (let cycle = 0; cycle < CYCLES; cycle++) {
        if ((await tabs.count()) === 0) await sqlEditor.open();
        const open0 = Date.now();
        for (let i = 0; i < TABS; i++) {
          if (i > 0) {
            await tabs.last().click(); // move focus out of the editor so the shortcut is not swallowed
            await page.keyboard.press("Alt+T");
            await expect(tabs).toHaveCount(i + 1, { timeout: 15000 });
            await expect(
              page.locator(".monaco-editor:visible").first(),
            ).toBeVisible();
            await page.waitForTimeout(500);
          }
          await expect(async () => {
            await page
              .locator(".monaco-editor:visible")
              .first()
              .click({ position: { x: 60, y: 40 } });
            await page.keyboard.press(
              process.platform === "darwin" ? "Meta+A" : "Control+A",
            );
            await page.keyboard.insertText(
              `SELECT ${i} AS n, 'tab_${i}' AS label;`,
            );
            await expect(
              page.locator(".monaco-editor:visible .view-lines").first(),
            ).toContainText(`tab_${i}`, { timeout: 1500 });
          }).toPass({ timeout: 15000 });
          await page.waitForTimeout(300); // let the editor change reach the tab store
          await sqlEditor.clickRun();
          await expect(
            page.getByTestId("data-grid").getByText(`tab_${i}`).first(),
          ).toBeVisible({ timeout: 15000 });
        }
        const openMs = Date.now() - open0;
        await page.waitForTimeout(1500);
        const heapOpen = await heapMb(page);
        const idbOpen = await idbCounts(page);

        // close every tab that was opened (confirm dialog appears for non-empty queries)
        const close0 = Date.now();
        for (let i = 0; i < TABS; i++) {
          const tab = tabs.last();
          await tab.hover();
          await tab.locator("svg").last().click({ force: true });
          const yes = page.getByRole("button", { name: "Yes" });
          if (await yes.isVisible({ timeout: 800 }).catch(() => false))
            await yes.click();
          await expect(tabs).toHaveCount(TABS - i - 1, { timeout: 15000 });
        }
        const closeMs = Date.now() - close0;
        await page.waitForTimeout(1500);
        const heapClosed = await heapMb(page);
        const idbClosed = await idbCounts(page);

        record("B11", {
          cycle,
          tabs: TABS,
          openMs,
          closeMs,
          heapStart: heap0,
          heapOpen,
          heapClosed,
          idbStart: JSON.stringify(idb0),
          idbOpen: JSON.stringify(idbOpen),
          idbClosed: JSON.stringify(idbClosed),
        });
      }
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
