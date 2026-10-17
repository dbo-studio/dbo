import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Compare with another model: re-asks the last prompt on a different model, in Ask mode, and labels each answer. */

type ProviderRow = { id: number; type: string };
type StreamBody = { message: string; mode?: string; model?: string; providerId?: number };

const FIRST_MODEL = "gpt-4o";
const SECOND_MODEL = "gpt-4o-mini";

async function configureProvider(page: Page): Promise<number> {
  const list = await page.request.get("/api/ai/providers");
  const body = (await list.json()) as { data?: ProviderRow[] };
  const provider = body.data?.find((item) => item.type === "openai") ?? body.data?.[0];
  expect(provider, "an AI provider row exists").toBeDefined();

  const update = await page.request.patch(`/api/ai/providers/${provider?.id}`, {
    data: {
      url: "http://127.0.0.1:9/v1",
      apiKey: "sk-e2e-fake-key",
      model: FIRST_MODEL,
      models: [FIRST_MODEL, SECOND_MODEL],
      isActive: true,
    },
  });
  expect(update.status()).toBe(200);
  return provider?.id as number;
}

test.describe("AI chat compare models", () => {
  test("re-asks on another model in Ask mode and labels both answers", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-compare-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-compare-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const settingsPage = new SettingsPage(page);
      const bodies: StreamBody[] = [];

      await page.route("**/api/ai/chat/stream", async (route) => {
        const body = route.request().postDataJSON() as StreamBody;
        bodies.push(body);
        const model = body.model ?? FIRST_MODEL;
        const done = {
          type: "done",
          chatId: 0,
          title: "compare e2e",
          messages: [
            {
              role: "assistant",
              type: "explanation",
              language: "text",
              model,
              content: `answer from ${model}`,
              createdAt: new Date().toISOString(),
            },
          ],
        };
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify(done) + "\n",
        });
      });

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      const providerId = await configureProvider(page);
      await page.reload();
      await settingsPage.openRightSidebar();

      const composer = page.getByPlaceholder(/ask anything/i);
      await composer.fill("which index helps?");
      await composer.press("Enter");
      await expect(page.getByText(`answer from ${FIRST_MODEL}`)).toBeVisible({ timeout: 15000 });
      // One model so far: no label noise.
      await expect(page.getByTestId("ai-message-model")).toHaveCount(0);

      await test.step("Compare menu lists only the other model", async () => {
        await page.getByTestId("ai-compare").click();
        const options = page.getByTestId("ai-compare-option");
        // Other ready providers (e.g. Ollama needs no key) may add entries; the answering model must not be offered.
        await expect(options.filter({ hasText: SECOND_MODEL })).toHaveCount(1);
        await expect(options.getByText(FIRST_MODEL, { exact: true })).toHaveCount(0);
        await options.filter({ hasText: SECOND_MODEL }).click();
      });

      await test.step("Second answer is requested with the override, in Ask mode", async () => {
        await expect(page.getByText(`answer from ${SECOND_MODEL}`)).toBeVisible({ timeout: 15000 });
        const compare = bodies.at(-1);
        expect(compare?.message).toBe("which index helps?");
        expect(compare?.model).toBe(SECOND_MODEL);
        expect(compare?.providerId).toBe(providerId);
        expect(compare?.mode).toBe("ask");
      });

      await test.step("Both answers carry a model label", async () => {
        const labels = page.getByTestId("ai-message-model");
        await expect(labels).toHaveText([FIRST_MODEL, SECOND_MODEL]);
      });
    });
  });

  test("backend rejects a model the provider does not offer", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-compare-bad-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-compare-bad-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      const providerId = await configureProvider(page);

      const response = await page.request.post("/api/ai/chat", {
        data: { connectionId: 1, message: "hi", providerId, model: "not-a-model" },
      });
      expect(response.status()).toBe(400);
    });
  });
});
