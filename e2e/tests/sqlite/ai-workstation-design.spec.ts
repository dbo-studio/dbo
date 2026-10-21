import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, setAiMode } from "../../helpers/aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Building a schema grows the design canvas live, one proposal at a time, like database.build. */
test.describe("AI workstation live design", () => {
  test("tables appear on the canvas during the turn and apply in one go", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-design-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-design-${suffix}.db`;
    const authors = `authors_${suffix}`;
    const posts = `posts_${suffix}`;
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
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        await page.reload();
        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-expand-to-agent").click();
        await setAiMode(page, "agent");

        const workspace = page.getByTestId("ai-agent-workspace");
        const canvas = page.getByTestId("ai-changeset-surface");
        const diagram = page.getByTestId("ai-mini-diagram");
        const nodes = diagram.getByTestId("ai-mini-diagram-node");

        llm.queue = [
          {
            name: "propose_schema_change",
            args: { ops: [{ op: "create_table", table: authors, columns: [{ name: "id", type: "INTEGER", primary: true }, { name: "name", type: "TEXT" }] }] },
          },
          {
            name: "propose_schema_change",
            delayMs: 2500,
            args: {
              ops: [
                { op: "create_table", table: posts, columns: [{ name: "id", type: "INTEGER", primary: true }, { name: "author_id", type: "INTEGER" }] },
                { op: "add_foreign_key", table: posts, fkColumns: ["author_id"], refTable: authors, refColumns: ["id"] },
              ],
            },
          },
        ];

        const composer = workspace.getByTestId("ai-chat-input");
        await composer.fill("design a blog");
        await composer.press("Enter");

        await test.step("The first table shows on the design while the agent is still working", async () => {
          await expect(canvas).toHaveAttribute("data-tab", "diagram", { timeout: 15000 });
          await expect(nodes).toHaveCount(1);
          await expect(nodes.first()).toHaveAttribute("data-table", authors);
          await expect(nodes.first()).toHaveAttribute("data-status", "added");
          await expect(page.getByTestId("ai-chat-cancel")).toBeVisible();
        });

        await test.step("The second table joins without moving the first", async () => {
          const before = await nodes.first().getAttribute("transform");
          await expect(nodes).toHaveCount(2, { timeout: 15000 });
          expect(await diagram.locator(`[data-table="${authors}"]`).getAttribute("transform")).toBe(before);
        });

        await test.step("Clicking a table adds it to the chat context", async () => {
          await diagram.locator(`[data-table="${posts}"]`).click();
          await expect(
            workspace.getByTestId("ai-context-chip").filter({ hasText: posts }),
          ).toBeVisible();
        });

        await test.step("Applying turns the design from new to existing", async () => {
          await page.getByTestId("ai-dock-apply-all").click();
          await page.getByTestId("ai-dock-execute").click();
          await expect(page.getByTestId("ai-changeset-dock")).toHaveCount(0, { timeout: 15000 });
          await expect(nodes.filter({ has: page.locator('[data-status="added"]') })).toHaveCount(0);
          await expect(diagram.locator('[data-status="added"]')).toHaveCount(0, { timeout: 15000 });
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
