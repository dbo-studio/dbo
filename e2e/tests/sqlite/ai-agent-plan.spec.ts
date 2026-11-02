import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup, setAiMode } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The agent shows a plan checklist in Agent mode only. */
test.describe("AI Agent plan checklist", () => {
  test("update_plan renders a checklist and is agent-only", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-plan-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-plan-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const composer = page.getByTestId("ai-chat-input");
        const plan = page.getByTestId("ai-plan-card");
        const send = async (message: string): Promise<void> => {
          await composer.fill(message);
          await composer.press("Enter");
        };

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
        await expect(composer).toBeVisible({ timeout: 15000 });

        await test.step("Ask mode is not offered the plan tool", async () => {
          await setAiMode(page, "ask");
          await send("hello");
          await expect(
            page.getByTestId("ai-message").filter({ hasText: "ok" }).last(),
          ).toBeVisible({ timeout: 15000 });
          expect(llm.offeredTools.flat()).not.toContain("update_plan");
        });

        await setAiMode(page, "agent");

        await test.step("Agent mode shows the checklist", async () => {
          llm.script = {
            name: "update_plan",
            args: {
              steps: [
                { title: "Inspect users", status: "done" },
                { title: "Draft the migration", status: "in_progress" },
                { title: "Ask for review", status: "pending" },
              ],
            },
          };
          // A slow answer keeps the turn running, so the pinned plan line can be seen.
          llm.reply = { text: "Working on it.", wordDelayMs: 10, startDelayMs: 1500 };
          await send("plan it");
          await expect(page.getByTestId("ai-plan-pinned")).toContainText("Draft the migration", { timeout: 15000 });
          await expect(page.getByTestId("ai-plan-pinned")).toBeHidden({ timeout: 15000 });
          llm.reply = null;
          await expect(plan).toBeVisible({ timeout: 15000 });
          await expect(plan).toContainText("1/3 done");
          await expect(plan.getByTestId("ai-plan-step")).toHaveCount(3);
          await expect(plan.getByTestId("ai-plan-step").nth(1)).toHaveAttribute(
            "data-status",
            "in_progress",
          );
        });

        await test.step("A later turn shows its own updated plan", async () => {
          llm.script = {
            name: "update_plan",
            args: {
              steps: [
                { title: "Inspect users", status: "done" },
                { title: "Draft the migration", status: "done" },
                { title: "Ask for review", status: "done" },
              ],
            },
          };
          await send("finish it");
          await expect(plan.last()).toContainText("3/3 done", {
            timeout: 15000,
          });
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
