import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage, WorkspacePage } from "../../pages";

/**
 * Drag-reorder workspace tabs along the tab bar.
 */
test.describe("Workspace tab reorder", () => {
  test("Drag second query tab before the first", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `tab-reorder-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.setupConnection(config);

      await test.step("Open two query tabs", async () => {
        await sqlEditor.open();
        await sqlEditor.clearEditor();
        await sqlEditor.focus();
        await page.keyboard.insertText("SELECT 1;");
        await page.getByRole("button", { name: "sql", exact: true }).click();
        await expect(workspace.getTabs()).toHaveCount(2, { timeout: 15000 });
      });

      await test.step("Drag the second tab before the first", async () => {
        const firstId = await workspace.getTabs().nth(0).getAttribute("data-tab-id");
        const secondId = await workspace.getTabs().nth(1).getAttribute("data-tab-id");
        if (!firstId || !secondId) {
          throw new Error("workspace tabs missing data-tab-id");
        }

        await workspace.reorderTab(secondId, firstId);

        await expect(workspace.getTabs().nth(0)).toHaveAttribute(
          "data-tab-id",
          secondId,
        );
        await expect(workspace.getTabs().nth(1)).toHaveAttribute(
          "data-tab-id",
          firstId,
        );
      });
    });
  });

  test("Drag settings tab before the query tab", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `tab-reorder-settings-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const settingsPage = new SettingsPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.setupConnection(config);

      await test.step("Open a query tab and Settings", async () => {
        await sqlEditor.open();
        await settingsPage.open();
        await expect(workspace.getTabs()).toHaveCount(2, { timeout: 15000 });
        await expect(workspace.getTabs().nth(1)).toHaveAttribute(
          "data-testid",
          "workspace-tab-settings",
        );
      });

      await test.step("Drag Settings before the query tab", async () => {
        const queryId = await workspace.getTabs().nth(0).getAttribute("data-tab-id");
        const settingsId = await workspace.getTabs().nth(1).getAttribute("data-tab-id");
        if (!queryId || !settingsId) {
          throw new Error("workspace tabs missing data-tab-id");
        }

        await workspace.reorderTab(settingsId, queryId);

        await expect(workspace.getTabs().nth(0)).toHaveAttribute(
          "data-tab-id",
          settingsId,
        );
        await expect(workspace.getTabs().nth(1)).toHaveAttribute(
          "data-tab-id",
          queryId,
        );
        await expect(workspace.getTabs().nth(0)).toHaveAttribute(
          "data-testid",
          "workspace-tab-settings",
        );
      });
    });
  });
});
