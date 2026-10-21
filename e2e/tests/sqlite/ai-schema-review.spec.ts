import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  clearActiveAiProfile,
  saveAiSetup,
  setAiMode,
} from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { checkSchemaReview, reviewFixture } from "../../helpers/schemaReview";
import { ConnectionPage, SettingsPage } from "../../pages";

test.describe("AI schema review (sqlite)", () => {
  test("cards in the chat, Fix proposes, findings and fixes through the API", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo)
      .replace(/[^a-z0-9_]/gi, "_")
      .toLowerCase();
    const connectionName = `ai-review-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-review-${suffix}.db`;
    ensureSqliteDbFile(dbPath);
    const llm = new FakeLlm();
    const llmUrl = await llm.start();
    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        for (const sql of reviewFixture("")) {
          await page.request.post("/api/query/raw", {
            data: { connectionId, query: sql },
          });
        }

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await setAiMode(page, "agent");

        await test.step("The review shows as cards, and Fix makes a proposal to review", async () => {
          llm.script = { name: "review_schema", args: {} };
          const composer = page.getByTestId("ai-chat-input");
          await composer.fill("review my schema");
          await composer.press("Enter");
          const card = page.getByTestId("ai-review-card").last();
          await expect(card).toBeVisible({ timeout: 15000 });
          const unindexed = card.locator(
            '[data-testid="ai-review-suggestion"][data-kind="foreign_key_without_index"]',
          );
          await expect(unindexed).toContainText("comments(post_id)");
          await expect(
            card.locator('[data-kind="no_primary_key"]'),
          ).toContainText("logs");

          await unindexed.getByTestId("ai-review-fix").click();
          await expect(page.getByTestId("ai-changeset-dock")).toContainText(
            "1 change pending",
            { timeout: 15000 },
          );
          await expect(unindexed.getByTestId("ai-review-fix")).toBeDisabled();
          await page.getByTestId("ai-dock-reject-all").click();
          await expect(page.getByTestId("ai-changeset-dock")).toHaveCount(0);
        });

        await test.step("The findings and an applied fix through the API", async () => {
          await checkSchemaReview(page, llm, connectionId);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
