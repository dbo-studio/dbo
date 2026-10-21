import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, saveAiSetup } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** "Create a blog database" in the workspace: reviewed as a diff and a diagram, then applied in one go. */
test.describe("AI Agent Workspace create database (postgres)", () => {
  test("a new database with tables is reviewed, drawn and applied", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-create-db-${suffix}`;
    const blog = `e2e_blog_${suffix}`.toLowerCase();

    const llm = new FakeLlm();
    const llmUrl = await llm.start();
    let connectionId = 0;

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("postgresql", connectionName),
        );
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        connectionId = connections.data.find(
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

        try {
          llm.script = {
            name: "propose_schema_change",
            args: {
              ops: [
                { op: "create_database", name: blog },
                {
                  op: "create_table",
                  table: "users",
                  columns: [
                    { name: "id", type: "INTEGER", primary: true },
                    { name: "email", type: "TEXT" },
                  ],
                },
                {
                  op: "create_table",
                  table: "posts",
                  columns: [
                    { name: "id", type: "INTEGER", primary: true },
                    { name: "user_id", type: "INTEGER" },
                  ],
                },
                {
                  op: "add_foreign_key",
                  table: "posts",
                  fkColumns: ["user_id"],
                  refTable: "users",
                  refColumns: ["id"],
                },
              ],
            },
          };
          const composer = page.getByTestId("ai-chat-input");
          await composer.fill("create a blog database");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-changeset-dock")).toContainText(
            "4 changes pending",
            { timeout: 15000 },
          );

          await test.step("The diff shows the database and its tables", async () => {
            await expect(
              page
                .getByTestId("ai-diff-table")
                .filter({ hasText: `DATABASE ${blog}` }),
            ).toBeVisible();
            await expect(
              page
                .getByTestId("ai-diff-table")
                .filter({ hasText: "email TEXT" }),
            ).toBeVisible();
          });

          await test.step("The diagram draws the new tables and their key", async () => {
            await page.getByTestId("ai-changes-tab-diagram").click();
            const nodes = page.getByTestId("ai-mini-diagram-node");
            await expect(nodes).toHaveCount(2);
            await expect(nodes.first()).toHaveAttribute("data-status", "added");
          });

          await test.step("Apply all creates the database with its tables", async () => {
            await page.getByTestId("ai-dock-apply-all").click();
            const preview = page.getByTestId("ai-dock-preview-modal");
            await expect(preview).toContainText(`CREATE DATABASE ${blog}`);
            await page.getByTestId("ai-dock-execute").click();
            await expect(page.getByTestId("ai-changeset-dock")).toHaveCount(0, {
              timeout: 20000,
            });

            const response = await page.request.post("/api/query/raw", {
              data: {
                connectionId,
                query: `SELECT datname FROM pg_database WHERE datname = '${blog}'`,
              },
            });
            expect(
              ((await response.json()) as { data: { data: unknown[] } }).data
                .data,
            ).toHaveLength(1);
          });
        } finally {
          // The connection is deleted when this callback ends, so the database goes first.
          await page.request.post("/api/query/raw", {
            data: {
              connectionId,
              query: `DROP DATABASE IF EXISTS "${blog}" WITH (FORCE)`,
            },
          });
        }
      });
    } finally {
      await llm.stop();
    }
  });
});
