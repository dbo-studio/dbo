import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/** Optimize answers can be compared line by line with the SQL the user selected. */

async function openAssistant(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  await settingsPage.openRightSidebar();
  await page.getByTestId("ai-empty-quick-setup").click();
  await expect(settingsPage.aiSetupForm()).toBeVisible({ timeout: 15000 });
  await saveAiSetup(page, "sk-e2e-fake-key");
  await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({ timeout: 15000 });
}

test.describe("AI chat optimize diff", () => {
  test("code block toggles a diff against the selected query", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-diff-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-diff-${suffix}.db`;
    const original = "SELECT * FROM sqlite_master WHERE type = 'table'";
    const optimized = "SELECT name FROM sqlite_master WHERE type = 'table'";
    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const streamBodies: Array<{ message: string; contextOpts?: { selectedQuery?: string } }> = [];

      await page.route("**/api/ai/chat/stream", async (route) => {
        streamBodies.push(route.request().postDataJSON());
        // Follow-up turns answer with different SQL so earlier answers can be diffed against each other.
        const sql = [optimized, "SELECT id FROM sqlite_master", "SELECT type FROM sqlite_master"][
          Math.min(streamBodies.length, 3) - 1
        ];
        const done = {
          type: "done",
          chatId: 0,
          title: "diff e2e",
          // The backend splits an answer into prose and typed code messages.
          messages: [
            {
              role: "assistant",
              type: "explanation",
              language: "text",
              content: "Select only the column you need:",
              createdAt: new Date().toISOString(),
            },
            { role: "assistant", type: "code", language: "sql", content: sql, createdAt: new Date().toISOString() },
          ],
        };
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify(done) + "\n",
        });
      });

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await sqlEditor.open();
      await sqlEditor.typeQuery(original);
      await openAssistant(page);

      await test.step("Optimize selection sends the query and shows a diff toggle", async () => {
        await page.locator(".monaco-editor").first().click({ button: "right" });
        // Monaco's context menu ignores synthetic clicks; hover to focus the item, then confirm with the keyboard.
        await page.getByRole("menuitem", { name: "Optimize selection" }).hover();
        await page.keyboard.press("Enter");

        await expect(page.getByTestId("ai-code-diff-toggle")).toBeVisible({ timeout: 15000 });
        expect(streamBodies.at(-1)?.contextOpts?.selectedQuery).toContain("SELECT * FROM sqlite_master");
      });

      await test.step("Diff marks removed and added lines, and toggles back", async () => {
        await page.getByTestId("ai-code-diff-toggle").click();
        const diff = page.getByTestId("ai-sql-diff");
        await expect(diff).toBeVisible();
        await expect(diff.locator('[data-diff="del"]')).toContainText("SELECT *");
        await expect(diff.locator('[data-diff="add"]')).toContainText("SELECT name");

        await page.getByTestId("ai-code-diff-toggle").click();
        await expect(diff).toHaveCount(0);
      });

      await test.step("Earlier answers diff against the previous SQL answer", async () => {
        const composer = page.getByPlaceholder(/ask anything/i);
        for (const text of ["use the id column", "use the type column"]) {
          await composer.fill(text);
          await composer.press("Enter");
        }
        await expect.poll(() => streamBodies.length).toBe(3);

        // Turn 1 has nothing before it; turns 2 and 3 can be compared.
        await expect(page.getByTestId("ai-code-diff-toggle")).toHaveCount(2, { timeout: 15000 });
        await page.getByTestId("ai-code-diff-toggle").first().click();
        const diff = page.getByTestId("ai-sql-diff");
        await expect(diff.locator('[data-diff="del"]')).toContainText("SELECT name");
        await expect(diff.locator('[data-diff="add"]')).toContainText("SELECT id");
      });
    });
  });
});
