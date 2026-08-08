import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import {
  ConnectionPage,
  DataGridPage,
  SqlEditorPage,
  WorkspacePage,
} from "../pages";

async function closeFirstTab(
  page: import("@playwright/test").Page,
): Promise<string> {
  const tab = page.locator('[data-testid^="workspace-tab-"]').first();
  await expect(tab).toBeVisible({ timeout: 15000 });
  const testId = await tab.getAttribute("data-testid");
  if (!testId?.startsWith("workspace-tab-")) {
    throw new Error(`unexpected tab testid: ${testId}`);
  }
  await tab.hover();
  await tab.locator("svg").last().click({ force: true });
  return testId.replace("workspace-tab-", "");
}

/**
 * Dirty workspace tab close confirmation (PostgreSQL).
 */
test.describe("Workspace dirty tab", () => {
  test("Dirty Query Cancel keeps tab", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `dirty-cancel-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(config);
      await sqlEditor.open();
      await sqlEditor.selectContext("default", "public");
      // Prefer keyboard so Monaco onChange updates tab store (dirty check).
      await sqlEditor.clearEditor();
      await sqlEditor.focus();
      await page.keyboard.insertText("SELECT 1;");

      await test.step("Close dirty tab and Cancel", async () => {
        const slug = await closeFirstTab(page);
        await expect(workspace.dirtyConfirmMessage).toBeVisible({
          timeout: 10000,
        });
        await workspace.confirmCancel.click();
        await expect(page.getByTestId(`workspace-tab-${slug}`)).toBeVisible();
      });
    });
  });

  test("Dirty Query Yes closes tab", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `dirty-yes-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(config);
      await sqlEditor.open();
      await sqlEditor.selectContext("default", "public");
      await sqlEditor.clearEditor();
      await sqlEditor.focus();
      await page.keyboard.insertText("SELECT 2;");

      await test.step("Close dirty tab and confirm Yes", async () => {
        const slug = await closeFirstTab(page);
        await expect(workspace.dirtyConfirmMessage).toBeVisible({
          timeout: 10000,
        });
        await workspace.confirmYes.click();
        await expect(page.getByTestId(`workspace-tab-${slug}`)).toBeHidden({
          timeout: 10000,
        });
      });
    });
  });

  test("Clean empty Query closes without confirm", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `dirty-clean-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(config);
      await sqlEditor.open();
      await sqlEditor.selectContext("default", "public");
      await sqlEditor.clearEditor();

      await test.step("Close clean tab", async () => {
        const slug = await closeFirstTab(page);
        await expect(workspace.dirtyConfirmMessage).toBeHidden({
          timeout: 2000,
        });
        await expect(page.getByTestId(`workspace-tab-${slug}`)).toBeHidden({
          timeout: 10000,
        });
      });
    });
  });

  test("Dirty Query with grid edit Cancel keeps tab", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `dirty-data-${suffix}`;
    const tableName = `e2e_dirty_tab_${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(config);
      await sqlEditor.open();
      await sqlEditor.selectContext("default", "public");
      await sqlEditor.typeAndRun(
        `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
INSERT INTO ${tableName} (name) VALUES ('Keep'), ('EditMe');
SELECT * FROM ${tableName} ORDER BY id;
        `.trim(),
      );
      await dataGrid.waitForData("EditMe");
      await dataGrid.editCell("EditMe", "Dirty");

      await test.step("Close after unsaved grid edit — Cancel", async () => {
        const slug = await closeFirstTab(page);
        await expect(workspace.dirtyConfirmMessage).toBeVisible({
          timeout: 10000,
        });
        await workspace.confirmCancel.click();
        await expect(page.getByTestId(`workspace-tab-${slug}`)).toBeVisible();
      });

      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });
  });
});
