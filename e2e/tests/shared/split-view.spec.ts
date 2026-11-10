import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import {
  ConnectionPage,
  SettingsPage,
  SqlEditorPage,
  WorkspacePage,
} from "../../pages";

/**
 * Workspace split view: tabs can live in a second pane next to the first.
 */
test.describe("Workspace split view", () => {
  test("Split right, move back, and persist layout", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `split-view-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const settings = new SettingsPage(page);
      const workspace = new WorkspacePage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(config);
      await sqlEditor.open();
      await settings.open();

      const settingsTab = workspace.getTab("settings");
      const pane0 = page.getByTestId("workspace-pane-0");
      const pane1 = page.getByTestId("workspace-pane-1");

      await test.step("Single pane before split", async () => {
        await expect(pane0).toBeVisible();
        await expect(pane1).toHaveCount(0);
      });

      await test.step("Split right via tab context menu", async () => {
        await settingsTab.click({ button: "right" });
        await page.getByText("Split right", { exact: true }).click();
        await expect(pane1).toBeVisible();
        await expect(pane1.locator('[data-testid="workspace-tab-settings"]')).toBeVisible();
        await expect(pane0.locator('[data-testid="workspace-tab-settings"]')).toHaveCount(0);
      });

      await test.step("Layout survives reload", async () => {
        await page.reload();
        await expect(pane1).toBeVisible({ timeout: 15000 });
        await expect(pane1.locator('[data-testid="workspace-tab-settings"]')).toBeVisible();
      });

      await test.step("Move back to left pane collapses split", async () => {
        await settingsTab.click({ button: "right" });
        await page.getByText("Move to left pane", { exact: true }).click();
        await expect(pane1).toHaveCount(0);
        await expect(pane0.locator('[data-testid="workspace-tab-settings"]')).toBeVisible();
      });
    });
  });
});
