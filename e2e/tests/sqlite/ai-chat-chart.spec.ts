import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** An aggregate result (labels plus numbers) can be shown as a chart; other results offer none. */

const reply = (content: string): string =>
  JSON.stringify({
    type: "done",
    chatId: 0,
    title: "chart e2e",
    messages: [
      {
        role: "assistant",
        type: "explanation",
        language: "text",
        content,
        createdAt: new Date().toISOString(),
      },
    ],
  }) + "\n";

test.describe("AI chat chart", () => {
  test("aggregate results toggle a chart, others do not", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-chart-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-chart-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const composer = page.getByTestId("ai-chat-input");
        const send = async (message: string): Promise<void> => {
          await composer.fill(message);
          await composer.press("Enter");
        };

        await page.route("**/api/ai/chat/stream", async (route) => {
          const { message } = route.request().postDataJSON() as {
            message: string;
          };
          const rows =
            message === "totals"
              ? [
                  { category: "books", total: 12 },
                  { category: "games", total: 30 },
                  { category: "music", total: 7 },
                ]
              : [
                  { id: 1, name: "alpha" },
                  { id: 2, name: "beta" },
                ];
          await route.fulfill({
            status: 200,
            contentType: "application/x-ndjson",
            body: reply("```json\n" + JSON.stringify(rows) + "\n```"),
          });
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
        await expect(composer).toBeVisible({ timeout: 15000 });

        await test.step("Labels plus numbers offer a chart, shown on demand", async () => {
          await send("totals");
          await expect(
            page.getByTestId("ai-table-row-count").last(),
          ).toContainText("3", { timeout: 15000 });
          await expect(page.getByTestId("ai-chart")).toHaveCount(0);

          await page.getByTestId("ai-table-chart").last().click();
          await expect(page.getByTestId("ai-chart")).toBeVisible();
          await expect(page.getByTestId("ai-chart")).toContainText("books");

          await page.getByTestId("ai-table-chart").last().click();
          await expect(page.getByTestId("ai-chart")).toHaveCount(0);
        });

        await test.step("A result without a numeric column has no chart", async () => {
          await send("people");
          await expect(
            page.getByTestId("ai-table-row-count").last(),
          ).toContainText("2", { timeout: 15000 });
          await expect(page.getByTestId("ai-table-chart")).toHaveCount(1);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
