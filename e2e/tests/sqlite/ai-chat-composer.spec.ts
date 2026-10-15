import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/** Composer shortcuts and message polish against a mocked NDJSON stream. */

type Event = Record<string, unknown>;

const ndjson = (events: Event[]): string => events.map((event) => JSON.stringify(event)).join("\n") + "\n";

const message = (type: string, content: string, language = "text") => ({
  role: "assistant",
  type,
  language,
  content,
  createdAt: new Date().toISOString(),
});

const done = (messages: unknown[]): Event => ({ type: "done", chatId: 0, title: "composer e2e", messages });

async function openAssistant(page: Page): Promise<void> {
  const settingsPage = new SettingsPage(page);
  if (!(await settingsPage.rightSidebarTab().isVisible().catch(() => false))) {
    await settingsPage.toggleRightSidebar();
  }
  await page.getByTestId("ai-empty-quick-setup").click();
  await expect(settingsPage.aiSetupForm()).toBeVisible({ timeout: 15000 });
  await saveAiSetup(page, "sk-e2e-fake-key");
  await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({ timeout: 15000 });
}

async function send(page: Page, text: string): Promise<void> {
  const composer = page.getByPlaceholder(/ask anything/i);
  await composer.fill(text);
  await composer.press("Enter");
}

test.describe("AI chat composer and message polish", () => {
  test("shortcuts, copy error, code fences, table actions, diagram thumbnail", async ({ page, context }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-composer-${suffix}`;
    const table = `e2e_composer_items_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-composer-${suffix}.db`;
    const select = `SELECT id, name FROM ${table}`;
    ensureSqliteDbFile(dbPath);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);

      await page.route("**/api/ai/chat/stream", async (route) => {
        const body = route.request().postDataJSON() as { message: string };
        let events: Event[];

        switch (body.message) {
          case "boom":
            events = [{ type: "error", message: "Provider exploded" }];
            break;
          case "fence":
            events = [
              done([message("explanation", "Try this:\n\n```sql\nSELECT 1 AS one;\n```\n\nDone.")]),
            ];
            break;
          case "table": {
            const trace = {
              id: "call_sql",
              name: "execute_sql",
              args: JSON.stringify({ sql: select }),
              status: "done",
              result: JSON.stringify({ query: `${select} LIMIT 100`, rows: [{ id: 1, name: "alpha" }], count: 1 }),
              durationMs: 3,
            };
            events = [
              { type: "tool_start", id: trace.id, label: trace.name, content: trace.args },
              { type: "tool_result", id: trace.id, label: trace.name, content: trace.result, durationMs: 3 },
              done([
                { ...message("tool", JSON.stringify(trace), "json") },
                message("explanation", "One row."),
              ]),
            ];
            break;
          }
          case "diagram": {
            const diff = {
              changesetId: "cs-thumb",
              connectionId: 1,
              ops: [{ op: "create_table", table: "posts", columns: [{ name: "id", type: "INTEGER", primary: true }] }],
              diagramOps: [
                {
                  op: "add",
                  target: "node",
                  id: "posts",
                  value: { id: "posts", kind: "table", name: "posts", columns: [] },
                },
                {
                  op: "add",
                  target: "edge",
                  id: "fk:posts->users",
                  value: { id: "fk:posts->users", source: "posts", target: "users", sourceColumns: ["user_id"], targetColumns: ["id"] },
                },
              ],
            };
            events = [
              { type: "diagram_diff", id: diff.changesetId, data: diff },
              done([message("diagram_diff", JSON.stringify(diff), "json")]),
            ];
            break;
          }
          default:
            events = [done([message("explanation", `echo: ${body.message}`)])];
        }

        await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: ndjson(events) });
      });

      await clearActiveAiProfile(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
      await sqlEditor.open();
      await sqlEditor.typeAndRun(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO ${table} VALUES (1, 'alpha');`);
      await openAssistant(page);
      const composer = page.getByPlaceholder(/ask anything/i);

      await test.step("Up arrow recalls the last message; Ctrl+Shift+Backspace clears", async () => {
        await send(page, "first question");
        await expect(page.getByText("echo: first question")).toBeVisible({ timeout: 15000 });

        await composer.focus();
        await composer.press("ArrowUp");
        await expect(composer).toHaveValue("first question");

        await composer.press("Control+Shift+Backspace");
        await expect(composer).toHaveValue("");

        // Up arrow only recalls when the composer is empty.
        await composer.fill("typed");
        await composer.press("ArrowUp");
        await expect(composer).toHaveValue("typed");
        await composer.press("Control+Shift+Backspace");
      });

      await test.step("Error block offers Retry and Copy error", async () => {
        await send(page, "boom");
        await expect(page.getByTestId("ai-error-text")).toHaveText("Provider exploded", { timeout: 15000 });
        await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
        await page.getByTestId("ai-error-copy").click();
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("Provider exploded");
      });

      await test.step("Code fences in markdown get language badge and actions", async () => {
        await send(page, "fence");
        await expect(page.getByTestId("ai-code-language").last()).toHaveText("sql", { timeout: 15000 });
        await expect(page.getByTestId("ai-code-open-tab").last()).toBeVisible();
      });

      await test.step("Result table: Copy JSON, Rerun, tool-card link", async () => {
        await send(page, "table");
        await page.getByTestId("ai-tool-group").getByText(/Used 1 tool/).click();
        const card = page.getByTestId("ai-tool-card").last();
        await expect(card).toBeVisible({ timeout: 15000 });
        await card.getByText("execute_sql").click();

        await page.getByTestId("ai-table-copy-json").last().click();
        await expect
          .poll(() => page.evaluate(() => navigator.clipboard.readText()))
          .toContain('"name": "alpha"');

        await page.getByTestId("ai-table-rerun").last().click();
        await expect(page.getByTestId("ai-table-row-count").last()).toContainText("1");

        await expect(card.getByTestId("ai-tool-link")).toBeVisible();
      });

      await test.step("Diagram proposal shows a thumbnail", async () => {
        await send(page, "diagram");
        const thumbnail = page.getByTestId("ai-diagram-thumbnail").last();
        await expect(thumbnail).toBeVisible({ timeout: 15000 });
        await expect(thumbnail).toContainText("posts");
      });

      await test.step("Shortcuts panel documents the new keys", async () => {
        await page.keyboard.press("Alt+/");
        await expect(page.getByText("Clear message input")).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Edit last message/)).toBeVisible();
      });
    });
  });
});
