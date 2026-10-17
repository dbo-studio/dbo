import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/**
 * Feedback reactions: a thumb asks first, then the rating, question and answer
 * go to the DBO website (a local stand-in here, see APP_FEEDBACK_URL in
 * scripts/start-stack.mjs). Nothing is kept in the app database.
 */

const FEEDBACK_PORT = 4599;

type Received = { rating: string; comment?: string; prompt: string; answer: string; model?: string; client: string };

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  return body.data.find((item) => item.name === name)?.id as number;
}

test.describe("AI chat feedback", () => {
  test("asks first, sends rating with question and answer, keeps nothing locally", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-feedback-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-feedback-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    const received: Received[] = [];
    let respondWith = 201;
    const website: Server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        if (respondWith < 300) {
          received.push(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Received);
        }
        res.writeHead(respondWith, { "content-type": "application/json" });
        res.end("{}");
      });
    });
    await new Promise<void>((resolve) => website.listen(FEEDBACK_PORT, "127.0.0.1", resolve));

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const composer = page.getByPlaceholder(/ask anything/i);
        const up = page.getByTestId("ai-feedback-up");
        const down = page.getByTestId("ai-feedback-down");
        const dialog = page.getByTestId("ai-feedback-dialog");

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
          expect(received).toHaveLength(0);
        });

        await test.step("A thumb opens the consent dialog and cancel sends nothing", async () => {
          await composer.fill("rate this answer");
          await composer.press("Enter");
          await expect(page.getByText("ok", { exact: true }).first()).toBeVisible({ timeout: 20000 });

          await down.click();
          await expect(dialog).toBeVisible();
          await expect(page.getByTestId("ai-feedback-prompt")).toContainText("rate this answer");

          await page.getByTestId("ai-feedback-cancel").click();
          await expect(dialog).toHaveCount(0);
          expect(received).toHaveLength(0);
          await expect(down).toHaveAttribute("aria-pressed", "false");
        });

        await test.step("A failing website keeps the buttons usable", async () => {
          respondWith = 500;
          await down.click();
          await page.getByTestId("ai-feedback-send").click();
          await expect(page.getByText("Could not send feedback")).toBeVisible({ timeout: 10000 });
          await page.getByTestId("ai-feedback-cancel").click();
          await expect(down).toBeEnabled();
          respondWith = 201;
        });

        await test.step("Send delivers rating, comment, question and answer", async () => {
          await down.click();
          await page.getByTestId("ai-feedback-comment").fill("too vague");
          await page.getByTestId("ai-feedback-send").click();

          await expect.poll(() => received.length).toBe(1);
          expect(received[0]).toMatchObject({
            rating: "down",
            comment: "too vague",
            prompt: "rate this answer",
            answer: "ok",
            model: "fake-model",
            client: "web",
          });

          await expect(down).toHaveAttribute("aria-pressed", "true");
          await expect(down).toBeDisabled();
          await expect(up).toBeDisabled();
        });

        await test.step("Nothing is stored in the app and the rating is not restored", async () => {
          const chats = await page.request.get("/api/ai/chats", { params: { connectionId, page: 1, count: 50 } });
          const list = ((await chats.json()) as { data: Array<{ id: number; title: string }> }).data;
          const chatId = list.find((chat) => chat.title.includes("rate this answer"))?.id as number;

          const detail = await page.request.get(`/api/ai/chats/${chatId}`);
          const messages = ((await detail.json()) as { data: { messages: Array<Record<string, unknown>> } }).data.messages;
          expect(messages.every((message) => !("feedback" in message))).toBe(true);

          await page.reload();
          await settingsPage.openRightSidebar();
          await page.getByRole("button", { name: "Chat history" }).click();
          await page.getByTestId("ai-history-item").filter({ hasText: "rate this answer" }).first().click();
          // The history menu stays open after picking a chat and would cover the thumbs.
          await composer.click({ force: true });
          await expect(page.getByTestId("ai-history-item")).toHaveCount(0);
          await expect(down).toHaveAttribute("aria-pressed", "false");
        });
      });
    } finally {
      await llm.stop();
      await new Promise<void>((resolve) => website.close(() => resolve()));
    }
  });
});
