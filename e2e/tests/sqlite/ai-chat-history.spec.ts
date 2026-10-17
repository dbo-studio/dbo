import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Chat history drawer: search, pin, export, delete with confirm. */

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  const connection = body.data.find((item) => item.name === name);
  expect(connection, `connection ${name} exists`).toBeDefined();
  return connection?.id as number;
}

async function createChat(page: Page, connectionId: number, title: string): Promise<void> {
  const response = await page.request.post("/api/ai/chats", { data: { connectionId, title } });
  expect(response.status()).toBe(200);
}

test.describe("AI chat history", () => {
  test("search, pin, export and delete with confirm", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-history-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-history-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const settingsPage = new SettingsPage(page);
      const items = page.getByTestId("ai-history-item");

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      const connectionId = await connectionIdByName(page, connectionName);

      for (const title of ["blog schema", "orders report", "users cleanup"]) {
        await createChat(page, connectionId, title);
      }

      // Provider is not needed to browse history, but the panel renders it either way.
      await page.reload();
      await settingsPage.toggleRightSidebar();
      await expect(settingsPage.rightSidebarTab()).toBeVisible({ timeout: 15000 });

      await test.step("Drawer lists chats with relative time", async () => {
        await page.getByRole("button", { name: "Chat history" }).click();
        await expect(items).toHaveCount(3);
        await expect(items.first()).toContainText(/now|ago|min|sec/i);
        await expect(page.getByTestId("ai-history-connection")).toHaveText(connectionName);
      });

      await test.step("Search finds a chat and reopens it", async () => {
        await page.getByTestId("ai-history-search").fill("blog");
        await expect(items).toHaveCount(1);
        await expect(items.first()).toContainText("blog schema");

        await items.first().click();
        await expect(page.getByTestId("ai-chat-item").filter({ hasText: "blog schema" })).toBeVisible();

        await page.getByTestId("ai-history-search").fill("zzz-no-match");
        await expect(items).toHaveCount(0);
        await expect(page.getByTestId("ai-history-empty")).toBeVisible();
        await page.getByTestId("ai-history-search").fill("");
        await expect(items).toHaveCount(3);
      });

      await test.step("Server-side search filters by term and escapes LIKE wildcards", async () => {
        const search = async (term: string): Promise<string[]> => {
          const response = await page.request.get("/api/ai/chats", {
            params: { connectionId, page: 1, count: 50, search: term },
          });
          expect(response.status()).toBe(200);
          const body = (await response.json()) as { data: Array<{ title: string }> };
          return body.data.map((chat) => chat.title);
        };

        expect(await search("ORDERS")).toEqual(["orders report"]);
        expect(await search("%")).toEqual([]);
        expect(await search("_")).toEqual([]);
        expect(await search("")).toHaveLength(3);
      });

      await test.step("Pin moves a chat to the top and persists", async () => {
        const target = items.filter({ hasText: "users cleanup" });
        await target.getByTestId("ai-history-pin").click();
        await expect(items.first()).toContainText("users cleanup");

        const list = await page.request.get(`/api/ai/chats?connectionId=${connectionId}&page=1&count=50`);
        const body = (await list.json()) as { data: Array<{ title: string; pinned: boolean }> };
        expect(body.data[0]).toMatchObject({ title: "users cleanup", pinned: true });
      });

      await test.step("Export downloads Markdown", async () => {
        const downloadPromise = page.waitForEvent("download");
        await items.filter({ hasText: "orders report" }).getByTestId("ai-history-export").click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe("orders-report.md");
      });

      await test.step("Delete asks for confirmation", async () => {
        const target = items.filter({ hasText: "orders report" });
        await target.getByTestId("ai-history-delete").click();
        await page.getByRole("button", { name: "Cancel" }).click();
        // The confirm dialog sits outside the drawer, so it closes; reopen to check.
        await page.getByRole("button", { name: "Chat history" }).click();
        await expect(items).toHaveCount(3);

        await target.getByTestId("ai-history-delete").click();
        await page.getByRole("button", { name: /^(delete|confirm)$/i }).click();
        await page.getByRole("button", { name: "Chat history" }).click();
        await expect(items).toHaveCount(2);
        await expect(items.filter({ hasText: "orders report" })).toHaveCount(0);
      });
    });
  });

  test("search matches message bodies, not just titles", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-history-body-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-history-body-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connectionId = await connectionIdByName(page, connectionName);

        // The title is the first 20 characters, so the keyword only appears in the message body.
        const created = await page.request.post("/api/ai/chats", { data: { connectionId, title: "inventory" } });
        const chatId = ((await created.json()) as { data: { id: number } }).data.id;
        const sent = await page.request.post("/api/ai/chat/stream", {
          data: { connectionId, chatId, message: "please summarize the quarterly zebra inventory", mode: "ask" },
        });
        expect(sent.status()).toBe(200);
        expect(await sent.text()).toContain('"type":"done"');

        const search = async (term: string): Promise<number[]> => {
          const response = await page.request.get("/api/ai/chats", {
            params: { connectionId, page: 1, count: 50, search: term },
          });
          expect(response.status()).toBe(200);
          return ((await response.json()) as { data: Array<{ id: number }> }).data.map((chat) => chat.id);
        };

        expect(await search("zebra")).toEqual([chatId]);
        expect(await search("ZEBRA")).toEqual([chatId]);
        expect(await search("giraffe")).toEqual([]);
      });
    } finally {
      await llm.stop();
    }
  });
});
