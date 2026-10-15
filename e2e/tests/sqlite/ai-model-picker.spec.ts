import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/**
 * Provider empty states (no provider / ready) and switching
 * the model from the composer footer without leaving the chat.
 */

type ProviderRow = { id: number; type: string; model: string; isActive: boolean };

const KNOWN_TOOL_MODEL = "gpt-4o";
const UNKNOWN_MODEL = "custom-e2e-model";

async function activeProvider(page: Page): Promise<ProviderRow | undefined> {
  const response = await page.request.get("/api/ai/providers");
  const body = (await response.json()) as { data?: ProviderRow[] };
  return body.data?.find((item) => item.isActive);
}

async function configureProvider(page: Page): Promise<void> {
  const list = await page.request.get("/api/ai/providers");
  const body = (await list.json()) as { data?: ProviderRow[] };
  const provider = body.data?.find((item) => item.type === "openai") ?? body.data?.[0];
  expect(provider, "an AI provider row exists").toBeDefined();

  const update = await page.request.patch(`/api/ai/providers/${provider?.id}`, {
    data: {
      url: "http://127.0.0.1:9/v1",
      apiKey: "sk-e2e-fake-key",
      model: KNOWN_TOOL_MODEL,
      models: [KNOWN_TOOL_MODEL, UNKNOWN_MODEL],
      isActive: true,
    },
  });
  expect(update.status()).toBe(200);
}

async function openAssistant(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  await settingsPage.openRightSidebar();
  await expect(settingsPage.rightSidebarTab()).toBeVisible({ timeout: 15000 });
}

test.describe("AI model picker and empty states", () => {
  // The assistant panel is only mounted while a connection is active (Layout.tsx),
  // so the "no connection" empty-state variant is not reachable from the sidebar.
  test("empty state: no provider, then ready", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-empty-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-empty-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const empty = page.getByTestId("ai-chat-empty");

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await openAssistant(page);

      await test.step("No provider: onboarding with a Settings deep link", async () => {
        await expect(empty).toContainText("Connect an AI provider");
        await expect(page.getByTestId("ai-empty-open-settings")).toBeVisible();
        await expect(page.getByTestId("ai-empty-quick-setup")).toBeVisible();
        await expect(page.getByTestId("ai-model-picker")).toHaveCount(0);
      });

      await test.step("Provider configured: contextual starters and tip", async () => {
        await configureProvider(page);
        await page.reload();
        await openAssistant(page);

        await expect(empty).toContainText("How can I help with your database?");
        await expect(page.getByTestId("ai-whats-new")).toBeVisible();
        await expect(empty.locator('[data-testid^="ai-starter-"]').first()).toBeVisible();
        await expect(page.getByTestId("ai-model-picker")).toBeVisible();
      });
    });
  });

  test("switch model mid-chat from the composer footer", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-model-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-model-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const picker = page.getByTestId("ai-model-picker");
      const reply = "Here is a first answer.";

      await page.route("**/api/ai/chat/stream", async (route) => {
        const events = [
          { type: "status", label: "Thinking..." },
          { type: "block_start", blockType: "explanation" },
          { type: "content_delta", content: reply },
          { type: "block_end" },
          {
            type: "done",
            chatId: 0,
            title: "model e2e",
            messages: [
              {
                role: "assistant",
                type: "explanation",
                language: "text",
                content: reply,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ];
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: events.map((event) => JSON.stringify(event)).join("\n") + "\n",
        });
      });

      await clearActiveAiProfile(page);
      await configureProvider(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await openAssistant(page);

      await test.step("Footer shows provider and model; Agent mode shows a tools badge", async () => {
        await expect(picker).toContainText(KNOWN_TOOL_MODEL);
        await page.getByTestId("ai-mode-agent").click();
        await expect(page.getByTestId("ai-model-capability")).toContainText("Tools");
        await expect(page.getByTestId("ai-model-capability")).toContainText("128K");
      });

      await test.step("Chat once", async () => {
        const composer = page.getByPlaceholder(/ask anything/i);
        await composer.fill("hello");
        await composer.press("Enter");
        await expect(page.getByText(reply)).toBeVisible({ timeout: 15000 });
      });

      await test.step("Switch model in place: chat stays, label and server update", async () => {
        await picker.click();
        await page.getByRole("menuitem", { name: new RegExp(UNKNOWN_MODEL) }).click();

        await expect(picker).toContainText(UNKNOWN_MODEL);
        await expect(page.getByText(reply)).toBeVisible();
        await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible();
        await expect.poll(async () => (await activeProvider(page))?.model).toBe(UNKNOWN_MODEL);
      });

      await test.step("A model without known tool support is flagged in Agent mode", async () => {
        await expect(page.getByTestId("ai-model-capability")).toContainText("No tools");
      });

      await test.step("Manage providers deep link is in the menu", async () => {
        await picker.click();
        await expect(page.getByTestId("ai-manage-providers")).toBeVisible();
        await page.keyboard.press("Escape");
      });
    });
  });
});
