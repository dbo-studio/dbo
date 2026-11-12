import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { removeSqliteDbFile, setupSqliteConnection } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ObjectTreePage } from "../../pages";

/** Tree perf (docs/development/frontend-performance.md B5-B7). Opt-in: PERF=1. See perf-baseline.spec.ts for how to run. */
test.skip(process.env.PERF !== "1", "perf only");

const TABLES = Number(process.env.PERF_TABLES ?? 5000);
const OUT = process.env.PERF_OUT ?? path.resolve(__dirname, "../../perf-results.jsonl");

function record(id: string, metrics: Record<string, number | string>) {
  fs.appendFileSync(OUT, JSON.stringify({ id, ...metrics, at: new Date().toISOString() }) + "\n");
  console.log(`[perf] ${id} ${JSON.stringify(metrics)}`);
}

function seed(dbPath: string) {
  removeSqliteDbFile(dbPath);
  const ddl = Array.from({ length: TABLES }, (_, i) => `create table t_${String(i).padStart(5, "0")}(id integer primary key);`).join("\n");
  execFileSync("sqlite3", [dbPath], { input: ddl });
}

async function startObservers(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __long: number; __frames: number[] };
    w.__long = 0;
    w.__frames = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long += e.duration;
    }).observe({ type: "longtask", buffered: false });
    let last = performance.now();
    const tick = (n: number) => {
      w.__frames.push(n - last);
      last = n;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const resetObservers = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __long: number; __frames: number[] };
    w.__long = 0;
    w.__frames = [];
  });

const readObservers = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __long: number; __frames: number[] };
    const s = [...w.__frames].sort((a, b) => a - b);
    return {
      longTaskMs: Math.round(w.__long),
      p95: Math.round(s[Math.floor(s.length * 0.95)] ?? 0),
      over50: s.filter((f) => f > 50).length,
    };
  });

test("B5 B6 B7 tree with thousands of tables", async ({ page }, testInfo) => {
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `perf-tree-${suffix}`;
  const dbPath = `/tmp/dbo-e2e-perf-tree-${suffix}.db`;
  seed(dbPath);

  await withConnectionCleanup(page, connectionName, async () => {
    try {
      await setupSqliteConnection(page, connectionName, dbPath);
      const tree = new ObjectTreePage(page);
      const root = tree.getTreeNode(connectionName);
      await expect(root).toBeVisible();
      if ((await root.getAttribute("aria-expanded")) !== "true") {
        await root.focus();
        await page.keyboard.press("ArrowRight");
      }
      const tables = tree.getTreeNode("Tables");
      await expect(tables).toBeVisible();
      await startObservers(page);

      // B5: expand the big folder
      await resetObservers(page);
      const t0 = Date.now();
      await tables.click();
      await tables.press("ArrowRight");
      await expect(tree.getTreeNode("t_00000")).toBeVisible({ timeout: 60000 });
      const b5 = Date.now() - t0;
      await page.waitForTimeout(500);
      record("B5", { tables: TABLES, expandMs: b5, ...(await readObservers(page)), dom: await page.evaluate(() => document.getElementsByTagName("*").length) });

      // B6: reload the whole tree with the folder loaded
      await resetObservers(page);
      const r0 = Date.now();
      await page.getByRole("button", { name: "refresh", exact: true }).first().click();
      await page.locator('[role="progressbar"]').first().waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
      await page.locator('[role="progressbar"]').waitFor({ state: "hidden", timeout: 60000 }).catch(() => undefined);
      await expect(tree.getTreeNode("t_00000")).toBeVisible({ timeout: 60000 });
      const b6 = Date.now() - r0;
      await page.waitForTimeout(500);
      record("B6", { tables: TABLES, reloadMs: b6, ...(await readObservers(page)) });

      // B7: keyboard navigation through 150 rows
      await tree.getTreeNode("t_00000").focus();
      await resetObservers(page);
      const k0 = Date.now();
      for (let i = 0; i < 150; i++) {
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(16);
      }
      record("B7", { rows: 150, wallMs: Date.now() - k0, ...(await readObservers(page)) });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
