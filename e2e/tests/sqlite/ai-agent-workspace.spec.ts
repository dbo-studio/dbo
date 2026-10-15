import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage, WorkspacePage } from "../../pages";

/**
 * Agent Workspace shell: full-window overlay over the app, opened from the
 * side panel or Alt+Shift+E, closed with Back / Esc. The real backend and agent
 * loop run against a fake OpenAI-compatible model.
 */
test.describe("AI Agent Workspace", () => {
  test("opens from the panel and shortcut, keeps the chat, restores the app", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-workspace-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-workspace-${suffix}.db`;
    const editorText = `SELECT 'keep me ${suffix}';`;
    const otherPath = `${dbPath}.other`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const tabs = new WorkspacePage(page).getTabs();
        const workspace = page.getByTestId("ai-agent-workspace");
        const composer = page.getByTestId("ai-chat-input");
        // Chat titles repeat the first prompt, so match message rows only.
        const message = (text: string) => page.getByTestId("ai-message").filter({ hasText: text });

        // A turn sent as "hang" never answers, so Stop can be exercised.
        await page.route("**/api/ai/chat/stream", async (route) => {
          if ((route.request().postDataJSON() as { message?: string }).message === "hang") {
            await new Promise(() => {
              /* hang until the client aborts */
            });
            return;
          }
          await route.continue();
        });

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await sqlEditor.open();
        await sqlEditor.typeQuery(editorText);

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({ timeout: 15000 });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await expect(composer).toBeVisible({ timeout: 15000 });

        const tabCount = await tabs.count();
        const editorBefore = await sqlEditor.getMonacoValue();
        expect(editorBefore).toContain(editorText);

        await test.step("Expand to Agent opens the workspace with the composer focused", async () => {
          await page.getByTestId("ai-expand-to-agent").click();
          await expect(workspace).toBeVisible();
          await expect(composer).toHaveCount(1);
          await expect(composer).toBeFocused();
        });

        await test.step("A message sent in the workspace gets an answer", async () => {
          await composer.fill("hello workspace");
          await composer.press("Enter");
          await expect(message("hello workspace")).toBeVisible({ timeout: 15000 });
          await expect(message("ok").last()).toBeVisible({ timeout: 15000 });
        });

        await test.step("App shortcuts do not act on the hidden app", async () => {
          await page.keyboard.press("Alt+t");
          await expect(workspace).toBeVisible();
        });

        await test.step("Back restores the app and the panel shows the same chat", async () => {
          await page.getByTestId("ai-workspace-back").click();
          await expect(workspace).toHaveCount(0);
          await expect(message("hello workspace")).toBeVisible();
          await expect(tabs).toHaveCount(tabCount);
          expect(await sqlEditor.getMonacoValue()).toBe(editorBefore);
        });

        await test.step("Shortcut opens it; Esc leaves the composer first, then the workspace", async () => {
          await page.keyboard.press("Alt+Shift+E");
          await expect(workspace).toBeVisible();
          await expect(composer).toBeFocused();

          await page.keyboard.press("Escape");
          await expect(composer).not.toBeFocused();
          await expect(workspace).toBeVisible();

          await page.keyboard.press("Escape");
          await expect(workspace).toHaveCount(0);
        });

        await test.step("Esc during a running turn stops it and keeps the workspace open", async () => {
          await page.keyboard.press("Alt+Shift+E");
          await expect(workspace).toBeVisible();
          const aborted = page.waitForEvent("requestfailed", (request) =>
            new URL(request.url()).pathname.endsWith("/api/ai/chat/stream"),
          );
          await composer.fill("hang");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible({ timeout: 15000 });

          await message("hello workspace").click();
          await page.keyboard.press("Escape");
          await aborted;
          await expect(page.getByTestId("ai-chat-cancel")).toHaveCount(0, { timeout: 10000 });
          await expect(workspace).toBeVisible();
        });

        await test.step("Sessions list switches chats and the panel follows", async () => {
          const sessions = page.getByTestId("ai-workspace-sessions");
          const items = sessions.getByTestId("ai-history-item");
          await expect(items).toHaveCount(1);

          await workspace.getByRole("button", { name: /new chat/i }).click();
          await expect(items).toHaveCount(2);
          await expect(message("hello workspace")).toHaveCount(0);
          await composer.fill("second chat");
          await composer.press("Enter");
          await expect(message("second chat")).toBeVisible({ timeout: 15000 });

          await sessions.locator('[data-testid="ai-history-item"][data-selected="false"]').click();
          await expect(message("hello workspace")).toBeVisible();

          await page.getByTestId("ai-workspace-back").click();
          await expect(message("hello workspace")).toBeVisible();
          await expect(message("second chat")).toHaveCount(0);
        });

        await test.step("Switching connection from the workspace closes the other connection's chat", async () => {
          const otherName = `${connectionName}-other`;
          ensureSqliteDbFile(otherPath);
          const created = await page.request.post("/api/connections", {
            data: { name: otherName, type: "sqlite", options: { path: otherPath } },
          });
          expect(created.ok()).toBeTruthy();
          await page.reload();
          await connectionPage.waitForReady();

          await page.keyboard.press("Alt+Shift+E");
          await expect(workspace).toBeVisible();
          await composer.fill("before switch");
          await composer.press("Enter");
          await expect(message("before switch")).toBeVisible({ timeout: 15000 });

          await page.getByTestId("ai-workspace-connection").click();
          await page.getByRole("menuitem", { name: otherName }).click();
          await expect(page.getByTestId("ai-workspace-connection")).toContainText(otherName);
          await expect(message("before switch")).toHaveCount(0);
          await expect(page.getByTestId("ai-workspace-sessions").getByTestId("ai-history-item")).toHaveCount(0);
        });
      });
    } finally {
      await llm.stop();
      const list = (await (await page.request.get("/api/connections")).json()) as {
        data?: Array<{ id: number; name: string }>;
      };
      const other = list.data?.find((item) => item.name === `${connectionName}-other`);
      if (other) await page.request.delete(`/api/connections/${other.id}`);
      removeSqliteDbFile(dbPath);
      removeSqliteDbFile(otherPath);
    }
  });
});
