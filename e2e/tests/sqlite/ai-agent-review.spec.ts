import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** A confirmed Agent Mode write card stays confirmed after a reload and cannot be confirmed twice. */

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  return body.data.find((item) => item.name === name)?.id as number;
}

async function rawQuery(page: Page, connectionId: number, query: string): Promise<void> {
  const response = await page.request.post("/api/query/raw", { data: { connectionId, query, confirmed: false } });
  expect(response.status()).toBe(200);
}

test.describe("AI Agent Mode review persistence", () => {
  test("confirmed write card survives a reload and is single-use", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-review-${suffix}`;
    const table = `e2e_review_users_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-review-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const card = page.getByTestId("ai-permission-card");

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connectionId = await connectionIdByName(page, connectionName);

        await rawQuery(page, connectionId, `CREATE TABLE ${table} (id INTEGER PRIMARY KEY, email TEXT)`);
        await rawQuery(page, connectionId, `INSERT INTO ${table} (id, email) VALUES (1, 'a@x.io')`);

        const created = await page.request.post("/api/ai/chats", { data: { connectionId, title: "review chat" } });
        const chatId = ((await created.json()) as { data: { id: number } }).data.id;
        llm.script = { name: "execute_write", args: { sql: `UPDATE ${table} SET email = 'b@x.io' WHERE id = 1` } };
        const sent = await page.request.post("/api/ai/chat/stream", {
          data: { connectionId, chatId, message: "change the email", mode: "agent" },
        });
        expect(await sent.text()).toContain("permission_request");

        const reopen = async (): Promise<void> => {
          await page.reload();
          await settingsPage.openRightSidebar();
          await page.getByRole("button", { name: "Chat history" }).click();
          await page.getByTestId("ai-history-item").filter({ hasText: "change the email" }).first().click();
        };

        await test.step("Pending card is restored and confirms once", async () => {
          await reopen();
          await expect(card).toHaveAttribute("data-decision", "pending", { timeout: 15000 });
          await page.getByTestId("ai-permission-confirm").click();
          await expect(card).toHaveAttribute("data-decision", "confirmed", { timeout: 15000 });
        });

        await test.step("Confirmed card stays confirmed after a reload", async () => {
          await reopen();
          await expect(card).toHaveAttribute("data-decision", "confirmed", { timeout: 15000 });
          await expect(page.getByTestId("ai-permission-confirm")).toHaveCount(0);
        });

        await test.step("A second confirm claim is refused by the server", async () => {
          const detail = await page.request.get(`/api/ai/chats/${chatId}`);
          const messages = ((await detail.json()) as { data: { messages: Array<{ type: string; content: string }> } }).data
            .messages;
          const requestId = (JSON.parse(messages.find((m) => m.type === "permission")?.content ?? "{}") as { requestId: string })
            .requestId;
          const again = await page.request.post(`/api/ai/chats/${chatId}/review`, {
            data: { id: requestId, decision: "confirmed" },
          });
          expect(again.status()).toBe(409);
        });
      });
    } finally {
      await llm.stop();
    }
  });
});
