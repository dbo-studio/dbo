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
import { ConnectionPage, SettingsPage, SqlEditorPage } from "../../pages";

/** Pending new tables, indexes and foreign keys can be edited in the schema diff before they are applied. */
test.describe("AI Agent Workspace changeset editing", () => {
  test("edit a new table's columns, an index and a foreign key", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `ai-cs-edit-${suffix}`;
    const users = `e2e_ed_users_${suffix}`;
    const posts = `e2e_ed_posts_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-cs-edit-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const diffOp = (index: number) =>
          page.getByTestId("ai-diff-op").nth(index);
        const sql = page.getByTestId("ai-sql");

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

        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-empty-quick-setup").click();
        await expect(settingsPage.aiSetupForm()).toBeVisible({
          timeout: 15000,
        });
        await saveAiSetup(page, "sk-e2e-fake-key");
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.getByTestId("ai-expand-to-agent").click();
        await setAiMode(page, "agent");

        llm.script = {
          name: "propose_schema_change",
          args: {
            ops: [
              {
                op: "create_table",
                table: posts,
                columns: [
                  { name: "id", type: "INTEGER", primary: true },
                  { name: "user_id", type: "INTEGER" },
                ],
              },
              { op: "add_index", table: posts, indexColumns: ["user_id"] },
              {
                op: "add_foreign_key",
                table: posts,
                fkColumns: ["user_id"],
                refTable: users,
                refColumns: ["id"],
              },
            ],
          },
        };
        const composer = page.getByTestId("ai-chat-input");
        await composer.fill("add posts");
        await composer.press("Enter");
        await expect(page.getByTestId("ai-changeset-dock")).toContainText(
          "3 changes pending",
          { timeout: 15000 },
        );

        await test.step("A new table's columns can be changed, added and removed", async () => {
          // New tables open the design first; the diff is one tab over.
          await page.getByTestId("ai-changes-tab-diff").click();
          await diffOp(0).getByTestId("ai-diff-edit").click();
          await diffOp(0)
            .getByTestId("ai-diff-edit-type")
            .nth(1)
            .fill("BIGINT");
          await diffOp(0).getByTestId("ai-diff-edit-add-column").click();
          await diffOp(0).getByTestId("ai-diff-edit-name").nth(2).fill("title");
          await diffOp(0).getByTestId("ai-diff-edit-type").nth(2).fill("TEXT");
          await diffOp(0).getByTestId("ai-diff-edit-save").click();

          await expect(diffOp(0)).toContainText("user_id BIGINT");
          await expect(diffOp(0)).toContainText("title TEXT");
        });

        await test.step("An index can be made unique and cover another column", async () => {
          await diffOp(1).getByTestId("ai-diff-edit").click();
          await diffOp(1)
            .getByTestId("ai-diff-edit-index-columns")
            .fill("user_id, title");
          await diffOp(1).getByTestId("ai-diff-edit-unique").check();
          await diffOp(1).getByTestId("ai-diff-edit-save").click();

          await expect(diffOp(1)).toContainText(
            "UNIQUE INDEX (user_id, title)",
          );
        });

        await test.step("A foreign key can get a delete action", async () => {
          await diffOp(2).getByTestId("ai-diff-edit").click();
          await diffOp(2).getByLabel("On delete").click();
          await page.getByRole("option", { name: "CASCADE" }).click();
          await diffOp(2).getByTestId("ai-diff-edit-save").click();

          await expect(diffOp(2)).toContainText("ON DELETE CASCADE");
        });

        await test.step("The SQL shows every edit", async () => {
          await page.getByTestId("ai-changes-tab-sql").click();
          await expect(sql).toContainText("BIGINT");
          await expect(sql).toContainText("title");
          await expect(sql).toContainText("CREATE UNIQUE INDEX");
          await expect(sql).toContainText("ON DELETE CASCADE");
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
