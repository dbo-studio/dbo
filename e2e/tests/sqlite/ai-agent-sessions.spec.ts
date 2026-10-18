import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Chats run their turns in parallel: a running chat keeps going while the user works in another one. */
test.describe("AI Agent Workspace sessions", () => {
  test("a running chat stays running while another chat answers", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-sessions-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-sessions-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const workspace = page.getByTestId("ai-agent-workspace");
        const composer = page.getByTestId("ai-chat-input");
        const items = page
          .getByTestId("ai-workspace-sessions")
          .getByTestId("ai-history-item");
        const message = (text: string) =>
          page.getByTestId("ai-message").filter({ hasText: text });
        // A hanging turn never gets a title from the server, the answered one is titled by its prompt.
        const hanging = items.filter({ hasNotText: "hello" });
        const send = async (text: string): Promise<void> => {
          await composer.fill(text);
          await composer.press("Enter");
        };

        // A turn sent as "slow" answers only once released.
        let release: () => void = () => undefined;
        const released = new Promise<void>((resolve) => {
          release = resolve;
        });

        // A turn sent as "hang" never answers, so it stays running.
        await page.route("**/api/ai/chat/stream", async (route) => {
          const { message } = route.request().postDataJSON() as {
            message?: string;
          };
          if (message === "slow") {
            await released;
          }
          if (message === "hang") {
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
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await expect(workspace).toBeVisible();

        await test.step("The first chat starts a turn that keeps running", async () => {
          await send("hang");
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible({
            timeout: 15000,
          });
          await expect(
            items.first().getByTestId("ai-session-status"),
          ).toHaveAttribute("data-status", "running");
        });

        await test.step("A second chat answers while the first is still running", async () => {
          await workspace.getByRole("button", { name: /new chat/i }).click();
          await expect(items).toHaveCount(2);
          // The new chat has no running turn of its own.
          await expect(page.getByTestId("ai-chat-cancel")).toHaveCount(0);

          await send("hello");
          await expect(message("ok").last()).toBeVisible({ timeout: 15000 });
          await expect(
            hanging.getByTestId("ai-session-status"),
          ).toHaveAttribute("data-status", "running");
        });

        await test.step("Going back to the first chat shows its turn still running, and Stop ends only that turn", async () => {
          await hanging.click();
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible();
          await expect(message("hang")).toBeVisible();

          await page.getByTestId("ai-chat-cancel").click();
          await expect(page.getByTestId("ai-chat-cancel")).toHaveCount(0, {
            timeout: 10000,
          });
          await expect(hanging.getByTestId("ai-session-status")).toHaveCount(0);

          await items.filter({ hasText: "hello" }).click();
          await expect(message("ok").last()).toBeVisible();
        });

        await test.step("A turn that finishes in the background is marked done until opened", async () => {
          await workspace.getByRole("button", { name: /new chat/i }).click();
          await expect(items).toHaveCount(3);
          await send("slow");
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible({
            timeout: 15000,
          });

          await workspace.getByRole("button", { name: /new chat/i }).click();
          await expect(items).toHaveCount(4);
          release();

          const finished = items.filter({ hasText: "slow" });
          await expect(
            finished.getByTestId("ai-session-status"),
          ).toHaveAttribute("data-status", "done", {
            timeout: 15000,
          });
          await finished.click();
          await expect(message("slow").first()).toBeVisible();
          await expect(finished.getByTestId("ai-session-status")).toHaveCount(
            0,
          );
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
