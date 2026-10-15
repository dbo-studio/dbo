import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import {
  ConnectionPage,
  DiagramPage,
  ObjectTreePage,
  SettingsPage,
  SqlEditorPage,
} from "../../pages";

/**
 * Agent Mode UI against a mocked NDJSON stream (no real LLM): tool cards,
 * confirm-before-write card, and the diagram_diff → preview → apply path,
 * which runs real DDL on SQLite through /api/schema/changes/apply.
 */

type Event = Record<string, unknown>;

const ndjson = (events: Event[]): string =>
  events.map((event) => JSON.stringify(event)).join("\n") + "\n";

const traceMessage = (type: string, payload: unknown) => ({
  role: "assistant",
  type,
  language: "json",
  content: JSON.stringify(payload),
  createdAt: new Date().toISOString(),
});

function agentTurn(connectionId: number, usersTable: string, postsTable: string): Event[] {
  const describe = {
    id: "call_describe",
    name: "describe_table",
    args: JSON.stringify({ table: usersTable }),
    status: "done",
    result: `CREATE TABLE ${usersTable} (id INTEGER PRIMARY KEY, email TEXT)`,
    durationMs: 4,
  };
  const ops = [
    {
      op: "create_table",
      table: postsTable,
      columns: [
        { name: "id", type: "INTEGER", primary: true },
        { name: "user_id", type: "INTEGER", notNull: true },
        { name: "title", type: "TEXT" },
      ],
    },
    {
      op: "add_foreign_key",
      table: postsTable,
      fkColumns: ["user_id"],
      refTable: usersTable,
      refColumns: ["id"],
    },
  ];
  const diff = {
    changesetId: "cs-e2e",
    connectionId,
    ops,
    diagramOps: [
      {
        op: "add",
        target: "node",
        id: postsTable,
        value: {
          id: postsTable,
          kind: "table",
          name: postsTable,
          columns: [
            { name: "id", dataType: "INTEGER", isPrimaryKey: true, isForeignKey: false },
            { name: "user_id", dataType: "INTEGER", isPrimaryKey: false, isForeignKey: true },
            { name: "title", dataType: "TEXT", isPrimaryKey: false, isForeignKey: false },
          ],
        },
      },
      {
        op: "add",
        target: "edge",
        id: `fk:${postsTable}->${usersTable}`,
        value: {
          id: `fk:${postsTable}->${usersTable}`,
          source: postsTable,
          target: usersTable,
          sourceColumns: ["user_id"],
          targetColumns: ["id"],
        },
      },
    ],
  };
  const permission = {
    requestId: "perm-e2e",
    connectionId,
    sql: `UPDATE ${usersTable} SET email = 'x' WHERE id = 1`,
    class: "write_dml",
  };

  return [
    { type: "status", label: "Thinking..." },
    { type: "tool_start", id: describe.id, label: describe.name, content: describe.args },
    { type: "tool_result", id: describe.id, label: describe.name, content: describe.result, durationMs: 4 },
    { type: "diagram_diff", id: diff.changesetId, data: diff },
    { type: "permission_request", id: permission.requestId, data: permission },
    { type: "block_start", blockType: "explanation" },
    { type: "content_delta", content: "Proposed a posts table for your review." },
    { type: "block_end" },
    {
      type: "done",
      chatId: 0,
      title: "agent e2e",
      messages: [
        traceMessage("tool", describe),
        traceMessage("diagram_diff", diff),
        traceMessage("permission", permission),
        {
          role: "assistant",
          type: "explanation",
          language: "text",
          content: "Proposed a posts table for your review.",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  ];
}

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

test.describe("AI Agent Mode", () => {
  test("tool cards, write confirm card, and diagram changeset apply", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-agent-${suffix}`;
    const usersTable = `e2e_agent_users_${suffix}`;
    const postsTable = `e2e_agent_posts_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-agent-${suffix}.db`;

    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const tree = new ObjectTreePage(page);
      const diagram = new DiagramPage(page);

      const sentModes: string[] = [];
      const rawQueries: string[] = [];

      page.on("request", (request) => {
        if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/api/query/raw")) {
          rawQueries.push(String((request.postDataJSON() as { query?: string })?.query ?? ""));
        }
      });

      await page.route("**/api/ai/chat/stream", async (route) => {
        const body = route.request().postDataJSON() as { connectionId: number; mode?: string };
        sentModes.push(body.mode ?? "");
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: ndjson(agentTurn(body.connectionId, usersTable, postsTable)),
        });
      });

      try {
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Create SQLite connection and seed users", async () => {
          await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
          await sqlEditor.open();
          await sqlEditor.typeAndRun(`CREATE TABLE ${usersTable} (id INTEGER PRIMARY KEY, email TEXT);`);
        });

        await test.step("Switch to Agent mode and send", async () => {
          await openAssistant(page);
          await page.getByTestId("ai-mode-agent").click();
          await expect(page.getByTestId("ai-mode-agent")).toHaveAttribute("aria-pressed", "true");

          const composer = page.getByPlaceholder(/ask anything/i);
          await composer.fill("design a posts table");
          await composer.press("Enter");

          await expect(page.getByText("Proposed a posts table for your review.")).toBeVisible({
            timeout: 15000,
          });
          expect(sentModes).toEqual(["agent"]);
        });

        await test.step("Tool call renders as an expandable card", async () => {
          const group = page.getByTestId("ai-tool-group");
          await expect(group).toContainText(/Used 1 tool/);
          await group.getByText(/Used 1 tool/).click();
          const card = page.getByTestId("ai-tool-card");
          await expect(card).toHaveAttribute("data-tool", "describe_table");
          await expect(card).toHaveAttribute("data-status", "done");
        });

        await test.step("Rejecting the write request never runs it", async () => {
          const permission = page.getByTestId("ai-permission-card");
          await expect(permission).toContainText(`UPDATE ${usersTable}`);
          await permission.getByTestId("ai-permission-reject").click();
          await expect(permission).toHaveAttribute("data-decision", "rejected");
          expect(rawQueries.filter((query) => query.includes("UPDATE"))).toHaveLength(0);
        });

        await test.step("Proposal shows as pending on the diagram", async () => {
          const card = page.getByTestId("ai-diagram-diff-card");
          await expect(card).toHaveAttribute("data-decision", "pending");
          await card.getByTestId("ai-diagram-open").click();
          await diagram.expectTableVisible(postsTable);
          await expect(diagram.getNode(postsTable)).toHaveAttribute("data-status", "added");
          await expect(page.getByTestId("diagram-changeset-panel")).toBeVisible();
        });

        await test.step("Accept → SQL preview → apply creates the table", async () => {
          await page.getByTestId("diagram-changeset-accept").click();
          const preview = page.getByTestId("diagram-changeset-preview-modal");
          await expect(preview).toContainText(`CREATE TABLE "${postsTable}"`);

          const applied = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname.endsWith("/api/schema/changes/apply") && response.status() === 200,
          );
          await page.getByTestId("diagram-changeset-execute").click();
          await applied;

          await expect(page.getByTestId("diagram-changeset-panel")).toHaveCount(0);
          await expect(diagram.getNode(postsTable)).toHaveAttribute("data-status", "unchanged", {
            timeout: 15000,
          });
          await expect(page.getByTestId("ai-diagram-diff-card")).toHaveAttribute("data-decision", "applied");

          await tree.expandPath([connectionName]);
          await tree.refreshExpandNode("Tables");
          await expect(tree.getTreeNode(postsTable)).toBeVisible({ timeout: 15000 });
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });

  test("chat UX: grid handoff, regenerate, rename, Esc stop, Ctrl+L", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-ux-${suffix}`;
    const table = `e2e_ux_items_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-ux-${suffix}.db`;
    const select = `SELECT id, name FROM ${table}`;

    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      let streamCalls = 0;

      await page.route("**/api/ai/chat/stream", async (route) => {
        streamCalls += 1;
        const body = route.request().postDataJSON() as { message: string };
        if (body.message === "hang") {
          await new Promise(() => {
            /* hang until the client aborts */
          });
          return;
        }
        const trace = {
          id: `call_sql_${streamCalls}`,
          name: "execute_sql",
          args: JSON.stringify({ sql: select }),
          status: "done",
          result: JSON.stringify({ query: `${select} LIMIT 100`, rows: [{ id: 1, name: "alpha" }], count: 1 }),
          durationMs: 3,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: ndjson([
            { type: "tool_start", id: trace.id, label: trace.name, content: trace.args },
            { type: "tool_result", id: trace.id, label: trace.name, content: trace.result, durationMs: 3 },
            {
              type: "done",
              chatId: 0,
              title: "ux",
              messages: [
                traceMessage("tool", trace),
                {
                  role: "assistant",
                  type: "explanation",
                  language: "text",
                  content: `Answer ${streamCalls}`,
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          ]),
        });
      });

      try {
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await sqlEditor.open();
        await sqlEditor.typeAndRun(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO ${table} VALUES (1, 'alpha');`);
        await openAssistant(page);

        const composer = page.getByTestId("ai-chat-input");

        await test.step("Tool result table opens in the Data Grid", async () => {
          await composer.fill("list items");
          await composer.press("Enter");
          await expect(page.getByText("Answer 1")).toBeVisible({ timeout: 15000 });
          await page.getByTestId("ai-tool-group").getByText(/Used 1 tool/).click();
          await page.getByTestId("ai-tool-card").getByText("execute_sql").click();
          await expect(page.getByTestId("ai-table-row-count")).toHaveText("1 rows");

          const raw = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname.endsWith("/api/query/raw") &&
              (response.request().postDataJSON() as { query: string }).query === select,
          );
          await page.getByTestId("ai-table-open-grid").click();
          expect((await raw).status()).toBe(200);
        });

        await test.step("Regenerate re-runs the last prompt", async () => {
          await page.getByTestId("ai-regenerate").click();
          await expect(page.getByText("Answer 2")).toBeVisible({ timeout: 15000 });
        });

        await test.step("Rename chat inline", async () => {
          await page.getByTestId("ai-chat-item").first().getByText(/.+/).dblclick();
          const input = page.getByTestId("ai-chat-rename-input");
          await input.fill("Renamed chat");
          const patched = page.waitForResponse(
            (response) => response.request().method() === "PATCH" && /\/api\/ai\/chats\/\d+$/.test(new URL(response.url()).pathname),
          );
          await input.press("Enter");
          expect((await patched).status()).toBe(200);
          await expect(page.getByTestId("ai-chat-item").first()).toContainText("Renamed chat");
        });

        await test.step("Esc stops a streaming turn", async () => {
          await composer.fill("hang");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible({ timeout: 15000 });
          await composer.press("Escape");
          await expect(page.getByTestId("ai-chat-cancel")).toHaveCount(0, { timeout: 10000 });
        });

        await test.step("Ctrl/Cmd+L focuses the composer", async () => {
          await sqlEditor.focus();
          await page.keyboard.press("ControlOrMeta+l");
          await expect(composer).toBeFocused();
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});
