import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../../pages";

/**
 * Perf baseline (docs/development/frontend-performance.md section 4). Opt-in: PERF=1.
 * Run against a production build: E2E_PREVIEW=1 E2E_PREVIEW_DIR=<dist> PERF=1 npm test -- tests/sqlite/perf-baseline.spec.ts --project=sqlite --trace=off
 * Results are appended to PERF_OUT (default e2e/perf-results.jsonl).
 */
test.skip(process.env.PERF !== "1", "perf only");

const COLS = Number(process.env.PERF_COLS ?? 100);
const ROWS = Number(process.env.PERF_ROWS ?? 50000);
const OUT = process.env.PERF_OUT ?? path.resolve(__dirname, "../../perf-results.jsonl");

function wideSql(rows: number, cols: number): string {
  const sel = Array.from({ length: cols }, (_, i) =>
    i === 0 ? "n AS c0" : i % 3 === 0 ? `'text value ' || n || '_${i}' AS c${i}` : `n * ${i} AS c${i}`,
  ).join(", ");
  return `WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${rows}) SELECT ${sel} FROM s;`;
}

function record(id: string, metrics: Record<string, number | string>) {
  fs.appendFileSync(OUT, JSON.stringify({ id, ...metrics, at: new Date().toISOString() }) + "\n");
  console.log(`[perf] ${id} ${JSON.stringify(metrics)}`);
}

// Preview builds do not expose window.monaco, so type through the keyboard instead of the page-object helper.
async function setSql(page: Page, sql: string) {
  const ed = page.locator(".monaco-editor").first();
  await ed.scrollIntoViewIfNeeded();
  await ed.click({ position: { x: 40, y: 10 } });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.insertText(sql);
}

async function runSql(page: Page, sqlEditor: SqlEditorPage, sql: string) {
  await setSql(page, sql);
  await sqlEditor.runQuery();
}

async function heapMb(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  await cdp.detach();
  return Math.round((metrics.find((m) => m.name === "JSHeapUsedSize")!.value / 1048576) * 10) / 10;
}

const domNodes = (page: Page) => page.evaluate(() => document.getElementsByTagName("*").length);

async function installIdbCounter(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __idb: { tx: number; ms: number; first: number; last: number } };
    w.__idb = { tx: 0, ms: 0, first: 0, last: 0 };
    const orig = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<typeof orig>) {
      const t0 = performance.now();
      const tx = orig.apply(this, args);
      w.__idb.tx++;
      if (!w.__idb.first) w.__idb.first = t0;
      const done = () => {
        w.__idb.last = performance.now();
        w.__idb.ms = w.__idb.last - w.__idb.first;
      };
      tx.addEventListener("complete", done);
      tx.addEventListener("abort", done);
      return tx;
    };
  });
}

const idb = (page: Page) =>
  page.evaluate(() => (window as unknown as { __idb: { tx: number; ms: number; first: number; last: number } }).__idb);

test("B1 B3 B4 wide result, edit, typing", async ({ page }, testInfo) => {
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `perf-${suffix}`;
  const dbPath = `/tmp/dbo-e2e-perf-${suffix}.db`;
  await installIdbCounter(page);

  await withConnectionCleanup(page, connectionName, async () => {
    try {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);
      ensureSqliteDbFile(dbPath);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await sqlEditor.open();

      // B1: run query, time to first rows visible
      await setSql(page, wideSql(ROWS, COLS));
      await page.evaluate(() => {
        const w = window as unknown as { __idb: { tx: number; ms: number; first: number; last: number } };
        w.__idb.tx = 0;
        w.__idb.ms = 0;
        w.__idb.first = 0;
        w.__idb.last = 0;
      });
      const t0 = Date.now();
      await sqlEditor.clickRun();
      await dataGrid.waitForData();
      const b1 = Date.now() - t0;
      await page.waitForTimeout(2000); // let background IndexedDB writes finish
      const b1idb = await idb(page);
      record("B1", {
        rows: ROWS, cols: COLS, shown: (await page.getByText(/\d[\d,]* rows/).first().innerText().catch(() => "?")), firstRowsMs: b1, idbTx: b1idb.tx, idbMs: Math.round(b1idb.ms),
        heapMb: await heapMb(page), dom: await domNodes(page),
      });

      // B2: scroll grid top to bottom, frame times
      const scroller = dataGrid.grid.locator("..").first();
      await page.evaluate(() => {
        const w = window as unknown as { __frames: number[] };
        w.__frames = [];
        let last = performance.now();
        const tick = (n: number) => {
          w.__frames.push(n - last);
          last = n;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const box = await dataGrid.grid.boundingBox();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      for (let i = 0; i < 60; i++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(16);
      }
      const frames = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames);
      void scroller;
      const sorted = [...frames].sort((a, b) => a - b);
      record("B2", {
        frames: frames.length,
        p50: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
        p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
        over50: frames.filter((f) => f > 50).length,
        dom: await domNodes(page),
      });

      // B3 needs an editable table; use a small keyed table.
      await runSql(page, sqlEditor, "DROP TABLE IF EXISTS perf_t;");
      await runSql(page, sqlEditor, "CREATE TABLE perf_t (id INTEGER PRIMARY KEY, name TEXT);");
      await runSql(
        page,
        sqlEditor,
        "INSERT INTO perf_t(id,name) WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n < 5000) SELECT n, 'name_' || n FROM s;",
      );
      await runSql(page, sqlEditor, "SELECT * FROM perf_t ORDER BY id;");
      await dataGrid.waitForData("name_1");
      await page.evaluate(() => {
        const w = window as unknown as { __idb: { tx: number; ms: number; first: number; last: number } };
        w.__idb.tx = 0;
        w.__idb.ms = 0;
        w.__idb.first = 0;
        w.__idb.last = 0;
      });
      const e0 = Date.now();
      await dataGrid.editCell("name_2", "name_edited");
      await dataGrid.expectCellVisible("name_edited");
      const b3 = Date.now() - e0;
      await page.waitForTimeout(1500);
      const b3idb = await idb(page);
      record("B3", { editMs: b3, idbTx: b3idb.tx, idbMs: Math.round(b3idb.ms) });
      await dataGrid.discardChanges();

      // B4: type 200 chars at 30 ms, count IndexedDB transactions
      await sqlEditor.clearEditor();
      await page.keyboard.press("Backspace");
      await page.evaluate(() => {
        const w = window as unknown as { __idb: { tx: number; ms: number; first: number; last: number } };
        w.__idb.tx = 0;
        w.__idb.ms = 0;
        w.__idb.first = 0;
        w.__idb.last = 0;
      });
      const k0 = Date.now();
      await page.keyboard.type("a".repeat(200), { delay: 30 });
      const typeMs = Date.now() - k0;
      await page.waitForTimeout(1000);
      const b4 = await idb(page);
      record("B4", { chars: 200, typeMs, idbTx: b4.tx, idbMs: Math.round(b4.ms) });
      expect(b4.tx).toBeGreaterThanOrEqual(0);
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
