import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/**
 * Agent Workspace changeset review: the agent proposes schema changes, the
 * user reviews them per op as a schema diff and as SQL, and nothing runs until
 * Apply all. Real backend and agent loop against a fake model.
 */

async function columnNames(
  page: Page,
  connectionId: number,
  table: string,
): Promise<unknown[]> {
  const response = await page.request.post("/api/query/raw", {
    data: {
      connectionId,
      query: `SELECT name FROM pragma_table_info('${table}') ORDER BY cid`,
    },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data: { data: Array<{ name: string }> };
  };
  return body.data.data.map((row) => row.name);
}

test.describe("AI Agent Workspace changeset", () => {
  test("review per op, preview SQL, apply only what was accepted", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-changeset-${suffix}`;
    const users = `e2e_cs_users_${suffix}`;
    const posts = `e2e_cs_posts_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-changeset-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const dock = page.getByTestId("ai-changeset-dock");
        const surface = page.getByTestId("ai-changeset-surface");
        const table = (name: string) =>
          page.locator(`[data-testid="ai-diff-table"][data-table="${name}"]`);

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await sqlEditor.open();
        await sqlEditor.typeAndRun(
          `CREATE TABLE ${users} (id INTEGER PRIMARY KEY, email TEXT);`,
        );
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await page.getByTestId("ai-mode-agent").click();

        llm.script = {
          name: "propose_schema_change",
          args: {
            ops: [
              {
                op: "create_table",
                table: posts,
                columns: [{ name: "id", type: "INTEGER", primary: true }],
              },
              {
                op: "add_column",
                table: users,
                column: { name: "phone", type: "TEXT" },
              },
            ],
          },
        };

        await test.step("A proposal shows in the dock and as a schema diff, and runs nothing", async () => {
          const composer = page.getByTestId("ai-chat-input");
          await composer.fill("add phone and a posts table");
          await composer.press("Enter");

          await expect(dock).toContainText("2 pending change(s)", {
            timeout: 15000,
          });
          await expect(surface).toBeVisible();
          await expect(page.getByTestId("ai-diff-table")).toHaveCount(2);
          await expect(table(users)).toContainText("phone TEXT");
          expect(await columnNames(page, connectionId, posts)).toEqual([]);
          expect(await columnNames(page, connectionId, users)).toEqual([
            "id",
            "email",
          ]);
        });

        await test.step("Alt+Shift+G toggles the changes surface", async () => {
          await page.keyboard.press("Alt+Shift+G");
          await expect(surface).toHaveCount(0);
          await page.keyboard.press("Alt+Shift+G");
          await expect(surface).toBeVisible();
        });

        await test.step("The SQL tab shows what would run", async () => {
          await page.getByTestId("ai-changes-tab-sql").click();
          const sql = page.getByTestId("ai-sql-preview");
          await expect(sql).toContainText(`CREATE TABLE "${posts}"`);
          await expect(page.getByTestId("ai-sql-copy")).toBeEnabled();
          await expect(page.getByTestId("ai-sql-open-query")).toBeEnabled();
          await page.getByTestId("ai-changes-tab-diff").click();
        });

        await test.step("A pending column can be edited in place", async () => {
          const op = table(users).getByTestId("ai-diff-op");
          await op.getByTestId("ai-diff-accept").click();
          await expect(op).toHaveAttribute("data-status", "accepted");

          await op.getByTestId("ai-diff-edit").click();
          await op.getByTestId("ai-diff-edit-type").fill("VARCHAR(20)");
          await op.getByTestId("ai-diff-edit-save").click();

          await expect(op).toContainText("phone VARCHAR(20)");
          // An edited op needs a fresh review.
          await expect(op).toHaveAttribute("data-status", "pending");
          await page.getByTestId("ai-changes-tab-sql").click();
          await expect(page.getByTestId("ai-sql-preview")).toContainText(
            "VARCHAR(20)",
          );
          await page.getByTestId("ai-changes-tab-diff").click();
        });

        await test.step("A rejected op is skipped and leaves the dock count", async () => {
          await table(users).getByTestId("ai-diff-reject").click();
          await expect(table(users).getByTestId("ai-diff-op")).toHaveAttribute(
            "data-status",
            "rejected",
          );
          await expect(dock).toContainText("1 pending change(s)");
        });

        await test.step("Apply all previews the SQL, applies it and clears the dock", async () => {
          await page.getByTestId("ai-dock-apply-all").click();
          const preview = page.getByTestId("ai-dock-preview-modal");
          await expect(preview).toContainText(`CREATE TABLE "${posts}"`);
          await expect(preview).not.toContainText("phone");
          await page.getByTestId("ai-dock-execute").click();

          await expect(dock).toHaveCount(0, { timeout: 15000 });
          await expect(surface).toHaveCount(0);
          expect(await columnNames(page, connectionId, posts)).toEqual(["id"]);
          expect(await columnNames(page, connectionId, users)).toEqual([
            "id",
            "email",
          ]);
        });

        await test.step("The agent sees how each op was reviewed on its next turn", async () => {
          llm.script = null;
          const composer = page.getByTestId("ai-chat-input");
          await composer.fill("what happened to my changes?");
          await composer.press("Enter");
          await expect(
            page.getByTestId("ai-message").filter({ hasText: "ok" }).last(),
          ).toBeVisible({ timeout: 15000 });

          const prompt = llm.systemPrompts.at(-1) ?? "";
          expect(prompt).toContain(`create_table ${posts} (applied)`);
          expect(prompt).toContain(`add_column ${users}.phone (rejected)`);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
