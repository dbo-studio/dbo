import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../../pages";

/**
 * Guards the IndexedDB row cache (docs/development/frontend-performance.md P1, P2).
 * Written against current behavior before any perf change.
 */
async function setup(
  page: import("@playwright/test").Page,
  connectionName: string,
  tableName: string,
  dbPath: string,
) {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataGrid = new DataGridPage(page);

  ensureSqliteDbFile(dbPath);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(
    getDbConfig("sqlite", connectionName, dbPath),
  );
  await connectionPage.expectConnectionActive(connectionName);
  await sqlEditor.open();
  await sqlEditor.typeAndRun(
    `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
INSERT INTO ${tableName} (name) VALUES ('alpha_row'), ('beta_row'), ('gamma_row');
    `.trim(),
  );
  await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
  await dataGrid.waitForData("gamma_row");
  return { connectionPage, sqlEditor, dataGrid };
}

test.describe("Grid persistence SQLite", () => {
  // By design: useStartup clears the table cache on app start, so a reload refetches. Tab switches keep it (last test).
  test("Query result is dropped on a page reload (cache is session-scoped)", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-persist-${suffix}`;
    const tableName = `e2e_persist_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-grid-persist-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { connectionPage, dataGrid } = await setup(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        await page.reload();
        await connectionPage.waitForReady();

        await expect(page.getByText("No results yet")).toBeVisible({
          timeout: 15000,
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Edit then discard restores the row", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-discard-${suffix}`;
    const tableName = `e2e_discard_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-grid-discard-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { dataGrid } = await setup(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        await dataGrid.editCell("beta_row", "beta_edited");
        await dataGrid.expectCellVisible("beta_edited");
        await dataGrid.discardChanges();
        await dataGrid.expectCellVisible("beta_row");
        await dataGrid.expectCellHidden("beta_edited");
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Edit then save persists across a reload", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-save-${suffix}`;
    const tableName = `e2e_save_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-grid-save-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { connectionPage, sqlEditor, dataGrid } = await setup(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        await dataGrid.editCell("beta_row", "beta_saved");
        await dataGrid.saveChanges();
        await dataGrid.expectCellVisible("beta_saved");

        await page.reload();
        await connectionPage.waitForReady();
        // Grid is empty after reload (P2), so re-run to read the saved value from the DB.
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
        await dataGrid.waitForData("beta_saved");
        await dataGrid.expectCellHidden("beta_row");
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Unsaved edit is dropped on a page reload (cache is session-scoped)", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-unsaved-${suffix}`;
    const tableName = `e2e_unsaved_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-grid-unsaved-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { connectionPage, dataGrid } = await setup(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        await dataGrid.editCell("beta_row", "beta_unsaved");
        await dataGrid.expectCellVisible("beta_unsaved");

        await page.reload();
        await connectionPage.waitForReady();
        await expect(page.getByText("No results yet")).toBeVisible({
          timeout: 15000,
        });
        await expect(
          dataGrid.grid.getByText("beta_unsaved", { exact: true }),
        ).toHaveCount(0);
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Switching tabs restores the result without querying the server again", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-switch-${suffix}`;
    const tableName = `e2e_switch_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-grid-switch-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataGrid } = await setup(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        const firstTab = page.locator("[data-tab-id]").first();
        const tabId = await firstTab.getAttribute("data-tab-id");
        expect(tabId).toBeTruthy();

        // Second editor tab (first one holds a query, so Alt+T opens a new one).
        await firstTab.click();
        await page.keyboard.press("Alt+T");
        await expect(page.locator("[data-tab-id]")).toHaveCount(2);

        const queryCalls: string[] = [];
        page.on("request", (r) => {
          if (
            r.method() === "POST" &&
            /\/query(\/|$)/.test(
              new URL(r.url()).pathname.replace(/^\/api/, ""),
            )
          )
            queryCalls.push(r.url());
        });

        await page.locator(`[data-tab-id="${tabId}"]`).click();
        await dataGrid.waitForData("gamma_row");
        await dataGrid.expectDataRowCount(3);
        await page.waitForTimeout(500);
        expect(queryCalls).toHaveLength(0);
        void sqlEditor;
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});
