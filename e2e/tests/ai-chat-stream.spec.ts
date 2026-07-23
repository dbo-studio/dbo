import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../pages";

test.describe("AI Chat", () => {
  test("opens assistant panel and shows composer", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);
    const connectionName = `ai-chat-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(config);

      if (!(await settingsPage.isRightSidebarVisible())) {
        await settingsPage.toggleRightSidebar();
      }

      await expect(page.getByRole("tab", { name: "Assistant" })).toBeVisible();
      await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible();
    });
  });
});
