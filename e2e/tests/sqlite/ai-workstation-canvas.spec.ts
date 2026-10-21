import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile, setAiMode } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The workstation canvas follows the agent (Data, Changes, SQL), goes full screen with a floating prompt, and the conversation width is a setting. */
test.describe("AI workstation canvas", () => {
  test("follows the agent's work and goes full screen", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-canvas-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-canvas-${suffix}.db`;
    const table = `canvas_${suffix}`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);
        const canvas = page.getByTestId("ai-changeset-surface");

        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table, columns: [{ name: "id", type: "INTEGER", primary: true }, { name: "label", type: "TEXT" }] },
          ]),
        );
        await page.request.post("/api/query/raw", {
          data: { connectionId, query: `INSERT INTO ${table} VALUES (1, 'first'), (2, 'second')` },
        });

        // The app read the providers before the fake one was set up.
        await page.reload();
        await settingsPage.openRightSidebar();
        await page.getByTestId("ai-expand-to-agent").click();
        const composer = page.getByTestId("ai-agent-workspace").getByTestId("ai-chat-input");

        await test.step("A query result opens the Data tab with its rows", async () => {
          llm.script = { name: "execute_sql", args: { sql: `SELECT id, label FROM ${table} ORDER BY id` } };
          await composer.fill("show the rows");
          await composer.press("Enter");
          await expect(canvas).toHaveAttribute("data-tab", "data", { timeout: 15000 });
          await expect(canvas.getByRole("cell", { name: "second" })).toBeVisible();
          await page.getByTestId("ai-changes-tab-sql").click();
          await expect(canvas.getByTestId("ai-canvas-statements")).toContainText(`FROM ${table}`);
        });

        await test.step("A proposal switches the canvas to the changes", async () => {
          await setAiMode(page, "agent");
          llm.script = {
            name: "propose_schema_change",
            args: { ops: [{ op: "add_column", table, column: { name: "note", type: "TEXT" } }] },
          };
          await composer.fill("add a note column");
          await composer.press("Enter");
          await expect(canvas).toHaveAttribute("data-tab", "diff", { timeout: 15000 });
        });

        await test.step("Full screen hides the conversation behind a floating prompt; Esc returns", async () => {
          await page.getByTestId("ai-canvas-fullscreen").click();
          await expect(page.getByTestId("ai-floating-prompt")).toBeVisible();
          await expect(page.getByTestId("ai-floating-prompt").getByTestId("ai-chat-input")).toBeVisible();
          await expect(page.getByTestId("ai-message")).toHaveCount(0);
          await page.keyboard.press("Escape");
          await expect(page.getByTestId("ai-floating-prompt")).toHaveCount(0);
          await expect(page.getByTestId("ai-message").first()).toBeVisible();
          await expect(page.getByTestId("ai-agent-workspace")).toBeVisible();
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
