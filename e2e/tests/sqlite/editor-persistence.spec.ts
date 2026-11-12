import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../../pages";

/** Guards the debounced tab-query save (docs/development/frontend-performance.md P3). */
test.describe("Editor text persistence SQLite", () => {
  for (const [name, waitMs] of [
    ["after a pause", 1500],
    ["reload right after typing", 0],
  ] as const) {
    // Reload with no pause loses the text on current AND old code (IndexedDB write cannot finish during unload).
    const run = waitMs ? test : test.fixme;
    run(`Typed query is restored ${name}`, async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `editor-persist-${suffix}`;
      const dbPath = `/tmp/dbo-e2e-editor-persist-${suffix}.db`;
      const sql = `SELECT 'persist_${suffix}' AS v;`;

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          const connectionPage = new ConnectionPage(page);
          const sqlEditor = new SqlEditorPage(page);
          ensureSqliteDbFile(dbPath);
          await connectionPage.goto();
          await connectionPage.waitForReady();
          await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
          await sqlEditor.open();

          await sqlEditor.clearEditor();
          await page.keyboard.insertText(sql);
          if (waitMs) await page.waitForTimeout(waitMs);

          await page.reload();
          await connectionPage.waitForReady();
          await expect(page.locator(".monaco-editor")).toContainText(sql.slice(0, 30), {
            timeout: 15000,
          });
        } finally {
          removeSqliteDbFile(dbPath);
        }
      });
    });
  }
});
