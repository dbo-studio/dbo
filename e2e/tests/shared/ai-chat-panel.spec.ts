import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/**
 * AI Assistant panel smoke (no provider / no stream).
 */
test.describe("AI Chat panel", () => {
  test("shows in-place setup until a provider is saved", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);
    const connectionName = `ai-chat-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await clearActiveAiProfile(page);
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

      await test.step("In-place setup is visible before a profile exists", async () => {
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 10000,
        });
        await expect(page.getByPlaceholder(/ask anything/i)).toHaveCount(0);
      });

      await test.step("Save provider and show composer", async () => {
        await saveAiSetup(page, "sk-e2e-fake-key");
        await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({
          timeout: 10000,
        });
      });
    });
  });
});
