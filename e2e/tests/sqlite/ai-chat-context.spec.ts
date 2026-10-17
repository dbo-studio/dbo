import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/**
 * Context chips: @ menu, pin/follow, removing a chip changes the next request,
 * and chips come back when a chat is reopened from history. Uses the real
 * backend with a fake OpenAI-compatible model.
 */

async function openAssistant(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  await settingsPage.openRightSidebar();
  await expect(settingsPage.rightSidebarTab()).toBeVisible({ timeout: 15000 });
}

test.describe("AI chat context chips", () => {
  test("@ mentions, follow/pin, request context, restore from history", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-context-${suffix}`;
    const usersTable = `e2e_ctx_users_${suffix}`;
    const ordersTable = `e2e_ctx_orders_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-context-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const composer = page.getByPlaceholder(/ask anything/i);
        const chipsBar = page.getByTestId("ai-context-follow");
        const chip = (name: string) => page.getByTestId("ai-context-chip").filter({ has: page.getByText(name, { exact: true }) });
        const removeChip = async (name: string): Promise<void> => {
          await chip(name).hover();
          const remove = chip(name).getByTestId("ai-context-chip-remove");
          await expect(remove).toBeVisible();
          // The icon swaps in on hover and the bar re-renders; dispatch instead of chasing a moving target.
          await remove.dispatchEvent("click");
        };

        const requests: Array<{ message: string; contextOpts?: { tables?: string[]; schema?: string; query?: string } }> = [];
        await page.route("**/api/ai/chat/stream", async (route) => {
          requests.push(route.request().postDataJSON() as (typeof requests)[number]);
          await route.continue();
        });

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        // Schema apply (unlike raw SQL) invalidates the autocomplete cache the @ menu reads.
        const created = await page.request.post("/api/schema/changes/apply", {
          data: {
            connectionId,
            ops: [usersTable, ordersTable].map((table) => ({
              op: "create_table",
              table,
              columns: [{ name: "id", type: "INTEGER", primary: true }],
            })),
          },
        });
        expect(created.status()).toBe(200);
        // Applying a schema change invalidates the cached autocomplete the @ menu reads.
        await page.reload();
        await sqlEditor.open();
        await sqlEditor.typeAndRun("SELECT 1 AS one");
        await openAssistant(page);

        await test.step("Follow indicator toggles between following and pinned", async () => {
          await expect(chipsBar).toHaveAttribute("data-following", "true");
          await chipsBar.click();
          await expect(chipsBar).toHaveAttribute("data-following", "false");
          await expect(chipsBar).toContainText("pinned");
          await chipsBar.click();
          await expect(chipsBar).toHaveAttribute("data-following", "true");
        });

        await test.step("Token budget meter is shown", async () => {
          await expect(page.getByTestId("ai-context-budget")).toContainText("tokens");
        });

        await test.step("Removing the query chip stops sending the editor query", async () => {
          const queryChip = page.getByTestId("ai-context-chip").filter({ hasText: "SELECT 1 AS one" });
          await expect(queryChip).toBeVisible();
          await composer.fill("with the query");
          await composer.press("Enter");
          await expect.poll(() => requests.at(-1)?.message).toBe("with the query");
          expect(requests.at(-1)?.contextOpts?.query).toContain("SELECT 1 AS one");

          await queryChip.dispatchEvent("mouseenter");
          await queryChip.getByTestId("ai-context-chip-remove").dispatchEvent("click");
          await expect(queryChip).toHaveCount(0);

          const before = requests.length;
          await composer.fill("without the query");
          await composer.press("Enter");
          await expect.poll(() => requests.length).toBe(before + 1);
          expect(requests.at(-1)?.contextOpts?.query).toBeUndefined();
          // Leave the follow chip's tooltip so it cannot cover the chips below.
          await page.mouse.move(0, 0);
        });

        await test.step("@ menu offers tables and the active query", async () => {
          await composer.fill(`look at @${usersTable.slice(0, 12)}`);
          const options = page.getByTestId("ai-mention-option");
          await expect(options.filter({ hasText: usersTable })).toBeVisible();
          await composer.fill("@que");
          await expect(options.filter({ hasText: "@query" })).toBeVisible();
          await composer.fill("");
        });

        await test.step("Mentioning a table adds a chip and is sent with the request", async () => {
          await composer.fill(`@${usersTable.slice(0, 12)}`);
          await expect(page.getByTestId("ai-mention-option").filter({ hasText: usersTable })).toBeVisible();
          await composer.press("Tab");
          await expect(chip(usersTable)).toBeVisible();

          await composer.press("Enter");
          await expect(page.getByText("ok", { exact: true }).first()).toBeVisible({ timeout: 20000 });
          await expect.poll(() => requests.length).toBeGreaterThanOrEqual(1);
          expect(requests.at(-1)?.contextOpts?.tables).toContain(usersTable);
        });

        await test.step("Removing a chip drops it from the next request", async () => {
          await removeChip(usersTable);
          await expect(chip(usersTable)).toHaveCount(0);

          const before = requests.length;
          await composer.fill("second question");
          await composer.press("Enter");
          await expect.poll(() => requests.length).toBe(before + 1);
          expect(requests.at(-1)?.contextOpts?.tables ?? []).not.toContain(usersTable);
        });

        await test.step("Reopening the chat from history restores its chips", async () => {
          // The chat's saved context is the last request's: add orders and send.
          await composer.fill(`@${ordersTable.slice(0, 12)}`);
          await expect(page.getByTestId("ai-mention-option").filter({ hasText: ordersTable })).toBeVisible();
          await composer.press("Tab");
          await composer.press("Enter");
          await expect.poll(() => requests.length).toBeGreaterThanOrEqual(3);

          // Switch to a fresh chat with no chips, then come back through history.
          await page.getByRole("button", { name: "New chat" }).click();
          await removeChip(ordersTable);
          await expect(chip(ordersTable)).toHaveCount(0);

          await page.getByRole("button", { name: "Chat history" }).click();
          await page.getByTestId("ai-history-item").filter({ hasText: "with the query" }).first().click();
          await expect(chip(ordersTable)).toBeVisible({ timeout: 15000 });
        });

      });
    } finally {
      await llm.stop();
    }
  });
});
