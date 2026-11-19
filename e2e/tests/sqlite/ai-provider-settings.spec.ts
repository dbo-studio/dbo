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
          await expect(form).not.toContainText("API key is required");
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
          await expect(page.getByRole("option", { name: "other-model" })).toHaveCount(0);
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

        await test.step("The saved key is kept when the field is only clicked and the form saved again", async () => {
          await page.reload();
          await settingsPage.open();
          await settingsPage.navigateTo("AI");
          const key = form.getByTestId("ai-provider-api-key");
          await expect(key).toHaveValue("");
          await expect(key).toHaveAttribute("placeholder", /Saved key/);
          await key.click();
          await form.getByTestId("ai-provider-url").click();
          await form.getByTestId("ai-provider-test").click();
          await expect(page.getByTestId("ai-connection-result")).toContainText("3 models available");
          await form.getByTestId("ai-provider-save").click();
          await expect(page.getByTestId("ai-provider-status-openai")).toHaveText("In use");
          const body = (await (await page.request.get("/api/ai/providers")).json()) as {
            data: Array<{ type: string; apiKey?: string }>;
          };
          expect(body.data.find((item) => item.type === "openai")?.apiKey).toBe("****");
        });
      });
    } finally {
      await llm.stop();
    }
  });

  test("saves OpenAI without a key and uses a separate autocomplete model", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-provider-nokey-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-provider-nokey-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    llm.models = ["fake-model", "fake-model-mini", "other-model"];
    const url = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const form = page.getByTestId("ai-provider-form");

        await clearActiveAiProfile(page);
        const listed = (await (
          await page.request.get("/api/ai/providers")
        ).json()) as { data: Array<{ id: number; type: string }> };
        const openai = listed.data.find((item) => item.type === "openai");
        expect(openai, "openai provider exists").toBeDefined();
        await page.request.patch(`/api/ai/providers/${openai?.id}`, {
          data: { apiKey: "" },
        });
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await settingsPage.open();
        await settingsPage.navigateTo("AI");
        await page.getByTestId("ai-provider-openai").click();

        await test.step("URL and models save with the API key left blank", async () => {
          await form.getByTestId("ai-provider-url").fill(url);
          await form.getByTestId("ai-provider-test").click();
          await expect(page.getByTestId("ai-connection-result")).toContainText(
            "3 models available",
          );
          await form.getByTestId("ai-model-input").fill("fake-model");
          await page.getByRole("option", { name: "fake-model", exact: true }).click();
          await form.getByTestId("ai-completion-model-input").fill("other");
          await page.getByRole("option", { name: "other-model" }).click();
          await form.getByTestId("ai-provider-save").click();
          await expect(
            page.getByTestId("ai-provider-status-openai"),
          ).toHaveText("In use");

          const body = (await (
            await page.request.get("/api/ai/providers")
          ).json()) as {
            data: Array<{
              type: string;
              isActive: boolean;
              model: string;
              completionModel: string;
              apiKey?: string | null;
            }>;
          };
          expect(body.data.find((item) => item.type === "openai")).toMatchObject({
            isActive: true,
            model: "fake-model",
            completionModel: "other-model",
          });
          expect(body.data.find((item) => item.type === "openai")?.apiKey).toBeNull();
        });

        await test.step("Complete uses the autocomplete model, not chat", async () => {
          const connections = (await (
            await page.request.get("/api/connections")
          ).json()) as { data: Array<{ id: number; name: string }> };
          const connectionId = connections.data.find(
            (item) => item.name === connectionName,
          )?.id;
          expect(connectionId).toBeDefined();

          const complete = await page.request.post("/api/ai/complete", {
            data: {
              connectionId,
              contextOpts: { prompt: "SELECT ", suffix: "" },
            },
          });
          expect(complete.status(), await complete.text()).toBe(200);
          expect(llm.requestedModels.at(-1)).toBe("other-model");
        });

        await test.step("The chat footer picker changes only the chat model", async () => {
          await settingsPage.close();
          await settingsPage.openRightSidebar();
          await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({
            timeout: 15000,
          });
          await page.getByTestId("ai-model-picker").click();
          await page.getByRole("menuitem", { name: /fake-model-mini/ }).click();
          await expect(page.getByTestId("ai-model-picker")).toContainText(
            "fake-model-mini",
          );

          const body = (await (
            await page.request.get("/api/ai/providers")
          ).json()) as {
            data: Array<{
              type: string;
              model: string;
              completionModel: string;
            }>;
          };
          expect(body.data.find((item) => item.type === "openai")).toMatchObject({
            model: "fake-model-mini",
            completionModel: "other-model",
          });
        });
      });
    } finally {
      await llm.stop();
    }
  });
});
