import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Charts saved as reports: from the chat card or by the agent, listed in the workstation, re-run with fresh data. */
test.describe("AI saved reports", () => {
  test("save from chat and by the agent, reopen with fresh data, delete", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-reports-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-reports-${suffix}.db`;
    const sales = `sales_${suffix}`;
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
        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table: sales, columns: [{ name: "id", type: "INTEGER", primary: true }, { name: "region", type: "TEXT" }, { name: "amount", type: "REAL" }] },
          ]),
        );
        const raw = (query: string) => page.request.post("/api/query/raw", { data: { connectionId, query } });
        await raw(`INSERT INTO ${sales} VALUES (1,'north',10),(2,'south',20)`);
        const chartSql = `SELECT region, SUM(amount) AS total FROM ${sales} GROUP BY region ORDER BY region`;

        await page.reload();
        await settingsPage.openRightSidebar();
        const composer = page.getByTestId("ai-chat-input");

        await test.step("A chart card is saved as a report", async () => {
          llm.script = { name: "show_chart", args: { title: "Sales by region", type: "bar", x: "region", y: ["total"], sql: chartSql } };
          await composer.fill("sales by region");
          await composer.press("Enter");
          await page.getByTestId("ai-report-save").click();
          await expect(page.getByTestId("ai-report-save")).toHaveText("Report saved");
        });

        await test.step("The agent saves a report by tool call", async () => {
          llm.script = { name: "save_report", args: { title: "Sales total", type: "number", y: ["total"], sql: `SELECT SUM(amount) AS total FROM ${sales}` } };
          await composer.fill("save the total as a report");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-tool-step").last()).toHaveText("Saved report Sales total", { timeout: 15000 });
        });

        await test.step("The agent cannot save a write as a report", async () => {
          llm.script = { name: "save_report", args: { title: "Bad", type: "table", sql: `DELETE FROM ${sales}` } };
          await composer.fill("save a delete");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-tool-card").last()).toHaveAttribute("data-status", "error", { timeout: 15000 });
        });

        await test.step("Reports are listed in the workstation and reopen with fresh data after a reload", async () => {
          await raw(`INSERT INTO ${sales} VALUES (3,'east',5)`);
          await page.reload();
          await settingsPage.openRightSidebar();
          await page.getByTestId("ai-expand-to-agent").click();
          const list = page.getByTestId("ai-saved-reports");
          await expect(list.getByTestId("ai-saved-report")).toHaveCount(2);
          await list.getByTestId("ai-saved-report").filter({ hasText: "Sales by region" }).click();
          const editor = page.getByTestId("ai-report-editor");
          await expect(editor.getByTestId("ai-report-title")).toHaveValue("Sales by region");
          await expect(editor.locator(".recharts-bar-rectangle")).toHaveCount(3, { timeout: 15000 });
        });

        await test.step("Renaming in the editor saves; delete removes it", async () => {
          const editor = page.getByTestId("ai-report-editor");
          await editor.getByTestId("ai-report-title").fill("Regional sales");
          await editor.getByTestId("ai-report-save-canvas").click();
          const list = page.getByTestId("ai-saved-reports");
          await expect(list).toContainText("Regional sales");
          const item = list.getByTestId("ai-saved-report").filter({ hasText: "Sales total" });
          await item.hover();
          await item.getByTestId("ai-saved-report-delete").click();
          await expect(list.getByTestId("ai-saved-report")).toHaveCount(1);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
