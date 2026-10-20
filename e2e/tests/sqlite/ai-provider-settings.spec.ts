import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The provider form in Settings: field validation, connection test, model search, save. */
test.describe("AI provider settings form", () => {
  test("validates, tests the connection, picks a model and saves", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-provider-form-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-provider-form-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    llm.requiredKey = "sk-right";
    llm.models = ["fake-model", "fake-model-mini", "other-model"];
    const url = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const form = page.getByTestId("ai-provider-form");

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await settingsPage.open();
        await settingsPage.navigateTo("AI");
        await page.getByTestId("ai-provider-openai").click();

        await test.step("Saving an empty form shows each field's error", async () => {
          await form.getByTestId("ai-provider-url").fill("not a url");
          await form.getByTestId("ai-provider-save").click();
          await expect(form).toContainText("Enter a valid http(s) URL");
          await expect(form).toContainText("Api key is required");
        });

        await test.step("A wrong key is reported by the connection test", async () => {
          await form.getByTestId("ai-provider-url").fill(url);
          await form.getByTestId("ai-provider-api-key").fill("sk-wrong");
          await form.getByTestId("ai-provider-test").click();
          await expect(page.getByTestId("ai-connection-result")).toContainText(
            "rejected the API key",
          );
        });

        await test.step("A right key lists the models to search", async () => {
          await form.getByTestId("ai-provider-api-key").fill("sk-right");
          await form.getByTestId("ai-provider-test").click();
          await expect(page.getByTestId("ai-connection-result")).toContainText(
            "3 models available",
          );
          await form.getByTestId("ai-model-input").fill("mini");
          await expect(page.getByTestId("ai-model-option")).toHaveCount(2);
          await page.getByRole("option", { name: "fake-model-mini" }).click();
        });

        await test.step("Save activates the provider with the chosen model", async () => {
          await form.getByTestId("ai-provider-save").click();
          await expect(
            page.getByTestId("ai-provider-status-openai"),
          ).toHaveText("In use");
          const body = (await (
            await page.request.get("/api/ai/providers")
          ).json()) as {
            data: Array<{ type: string; isActive: boolean; model: string }>;
          };
          expect(body.data.find((item) => item.isActive)).toMatchObject({
            type: "openai",
            model: "fake-model-mini",
          });
        });
      });
    } finally {
      await llm.stop();
    }
  });
});
