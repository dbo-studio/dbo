import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** A message typed while the agent answers is queued and sent when the turn ends; Send now stops the turn first. */
test.describe("AI chat message queue", () => {
  test("queues while running, sends after, and Send now interrupts", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-queue-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-queue-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const sent: string[] = [];
        await page.route("**/api/ai/chat/stream", async (route) => {
          sent.push((route.request().postDataJSON() as { message: string }).message);
          await route.continue();
        });

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.reload();
        await settingsPage.openRightSidebar();
        const composer = page.getByTestId("ai-chat-input");
        const message = (text: string) => page.getByTestId("ai-message").filter({ hasText: text });

        await test.step("A message typed during a turn waits and is sent after it", async () => {
          llm.reply = { text: "first answer done", wordDelayMs: 10, startDelayMs: 2500 };
          await composer.fill("first question");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible();

          await composer.fill("second question");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-queued")).toContainText("second question");
          await expect(composer).toHaveValue("");

          llm.reply = null;
          await expect(message("first answer done")).toHaveCount(1, { timeout: 15000 });
          await expect(page.getByTestId("ai-queued")).toHaveCount(0, { timeout: 15000 });
          await expect.poll(() => sent).toEqual(["first question", "second question"]);
          // The first answer is kept: the queued message waited until it was stored.
          await expect(message("first answer done")).toHaveCount(1);
          await expect(page.getByTestId("ai-message").filter({ hasText: /^ok$/ })).toHaveCount(1, { timeout: 15000 });
        });

        await test.step("Cancel drops the queued message", async () => {
          llm.reply = { text: "third answer done", wordDelayMs: 10, startDelayMs: 2500 };
          await expect(page.getByTestId("ai-chat-cancel")).toHaveCount(0, { timeout: 15000 });
          await composer.fill("third question");
          await composer.press("Enter");
          await composer.fill("never sent");
          await composer.press("Enter");
          await page.getByTestId("ai-queued-cancel").click();
          await expect(page.getByTestId("ai-queued")).toHaveCount(0);
          await expect(message("third answer done")).toHaveCount(1, { timeout: 15000 });
          expect(sent).not.toContain("never sent");
        });

        await test.step("Send now stops the running turn and sends the queued message", async () => {
          llm.reply = { text: "slow answer", wordDelayMs: 10, startDelayMs: 8000 };
          await composer.fill("slow question");
          await composer.press("Enter");
          await composer.fill("urgent question");
          await composer.press("Enter");
          llm.reply = null;
          await page.getByTestId("ai-queued-send-now").click();
          await expect.poll(() => sent.at(-1), { timeout: 15000 }).toBe("urgent question");
          await expect(page.getByTestId("ai-queued")).toHaveCount(0);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
