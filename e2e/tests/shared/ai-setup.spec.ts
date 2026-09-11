import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/**
 * In-place AI profile setup from Query and Chat (no real LLM).
 */
test.describe("AI in-place setup", () => {
  test("Query switch opens setup popover and becomes ready after save", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const settingsPage = new SettingsPage(page);
    const connectionName = `ai-setup-query-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and open editor", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
      });

      await test.step("AI switch opens in-place setup, not Settings", async () => {
        await sqlEditor.openAiSetup();
        await expect(settingsPage.panel).toHaveCount(0);
      });

      await test.step("Save provider key and enable AI", async () => {
        await saveAiSetup(page, "sk-e2e-fake-key");
        await expect(page.getByTestId("ai-setup-form")).toHaveCount(0, {
          timeout: 10000,
        });
        await sqlEditor.expectAiEnabled();
      });
    });
  });
});
