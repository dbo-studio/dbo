import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Feedback reactions: thumbs on the newest answer are stored server-side and survive a reload. */

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  return body.data.find((item) => item.name === name)?.id as number;
}

test.describe("AI chat feedback", () => {
  test("rate, clear and restore the newest answer", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-feedback-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-feedback-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const composer = page.getByPlaceholder(/ask anything/i);
        const up = page.getByTestId("ai-feedback-up");
        const down = page.getByTestId("ai-feedback-down");

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connectionId = await connectionIdByName(page, connectionName);
        await page.reload();
        await settingsPage.openRightSidebar();
        await expect(settingsPage.rightSidebarTab()).toBeVisible({ timeout: 15000 });

        await test.step("Server rejects unknown ratings and chats without an answer", async () => {
          const created = await page.request.post("/api/ai/chats", { data: { connectionId, title: "empty chat" } });
          const chatId = ((await created.json()) as { data: { id: number } }).data.id;

          const invalid = await page.request.post(`/api/ai/chats/${chatId}/feedback`, { data: { rating: "meh" } });
          expect(invalid.status()).toBe(422);

          const unanswered = await page.request.post(`/api/ai/chats/${chatId}/feedback`, { data: { rating: "up" } });
          expect(unanswered.status()).toBe(404);
        });

        await test.step("Thumbs up is stored and toggles off", async () => {
          await composer.fill("rate this answer");
          await composer.press("Enter");
          await expect(page.getByText("ok", { exact: true }).first()).toBeVisible({ timeout: 20000 });

          await expect(up).toHaveAttribute("aria-pressed", "false");
          await up.click();
          await expect(up).toHaveAttribute("aria-pressed", "true");
          await expect(down).toHaveAttribute("aria-pressed", "false");

          // Switching the rating replaces it.
          await down.click();
          await expect(down).toHaveAttribute("aria-pressed", "true");
          await expect(up).toHaveAttribute("aria-pressed", "false");
        });

        await test.step("Rating survives a reload", async () => {
          await page.reload();
          await settingsPage.openRightSidebar();
          await page.getByRole("button", { name: "Chat history" }).click();
          await page.getByTestId("ai-history-item").filter({ hasText: "rate this answer" }).first().click();
          await expect(page.getByText("ok", { exact: true }).first()).toBeVisible({ timeout: 15000 });
          await expect(down).toHaveAttribute("aria-pressed", "true");

          await down.click();
          await expect(down).toHaveAttribute("aria-pressed", "false");
        });
      });
    } finally {
      await llm.stop();
    }
  });
});
