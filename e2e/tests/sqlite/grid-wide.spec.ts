import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../../pages";

/** Column virtualization (docs/development/frontend-performance.md P6): wide results render only the visible columns. */
test("Wide result renders visible columns and reaches the last one by scrolling", async ({ page }, testInfo) => {
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `grid-wide-${suffix}`;
  const dbPath = `/tmp/dbo-e2e-grid-wide-${suffix}.db`;
  const cols = 100;
  const select = Array.from({ length: cols }, (_, i) => `${i + 1} AS col_${i}`).join(", ");

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
      await sqlEditor.typeAndRun(`SELECT ${select};`);
      await dataGrid.waitForData();

      const header = (name: string) => dataGrid.grid.locator("thead").getByText(name, { exact: true });
      await expect(header("col_0")).toBeVisible();
      await expect(header("col_99")).toHaveCount(0); // not rendered until scrolled to

      const container = page.getByTestId("data-grid-container");
      await container.evaluate((el) => (el.scrollLeft = el.scrollWidth));
      await expect(header("col_99")).toBeVisible();
      await expect(dataGrid.grid.locator("tbody").getByText("100", { exact: true }).first()).toBeVisible();
      await expect(header("col_0")).toHaveCount(0);

      await container.evaluate((el) => (el.scrollLeft = 0));
      await expect(header("col_0")).toBeVisible();
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
