import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../pages";

/**
 * AI Assistant panel smoke (no provider / no stream).
 */
test.describe("AI Chat panel", () => {
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

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Ensure right sidebar visible", async () => {
        if (!(await settingsPage.rightSidebarTab().isVisible().catch(() => false))) {
          await settingsPage.toggleRightSidebar();
        }
        await expect(settingsPage.rightSidebarTab()).toBeVisible({
          timeout: 15000,
        });
      });

      await test.step("Composer is visible", async () => {
        await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({
          timeout: 10000,
        });
      });
    });
  });
});
