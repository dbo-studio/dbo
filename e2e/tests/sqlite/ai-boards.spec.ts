import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** Boards: pin reports from the chat or by the agent, view them together on the canvas, resize, refresh, unpin. */
test.describe("AI boards", () => {
  test("pin from the chat and by the agent, then work with the board", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-boards-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-boards-${suffix}.db`;
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
        await page.request.post("/api/query/raw", {
          data: { connectionId, query: `INSERT INTO ${sales} VALUES (1,'north',10),(2,'south',20)` },
        });

        await page.reload();
        await settingsPage.openRightSidebar();
        const composer = page.getByTestId("ai-chat-input");

        await test.step("Pin a chart from the chat to a new board", async () => {
          llm.script = {
            name: "show_chart",
            args: { title: "Sales by region", type: "bar", x: "region", y: ["total"], sql: `SELECT region, SUM(amount) AS total FROM ${sales} GROUP BY region` },
          };
          await composer.fill("sales by region");
          await composer.press("Enter");
          await page.getByTestId("ai-report-pin").click();
          await page.getByTestId("ai-pin-new-board").fill("Sales");
          await page.getByTestId("ai-pin-new-board-submit").click();
          await expect(page.getByText("Pinned to Sales")).toBeVisible({ timeout: 15000 });
        });

        await test.step("The agent pins a saved report to the same board by name", async () => {
          const saved = await page.request.post("/api/questions", {
            data: { connectionId, name: "Sales total", sql: `SELECT SUM(amount) AS total FROM ${sales}`, chart: { type: "number", y: ["total"] } },
          });
          const reportId = ((await saved.json()) as { data: { id: number } }).data.id;
          llm.script = { name: "pin_report", args: { reportId, board: "Sales" } };
          await composer.fill("pin the total to Sales");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-tool-step").last()).toHaveText("Pinned to Sales", { timeout: 15000 });
        });

        await test.step("The agent lists the reports and boards that exist", async () => {
          llm.script = { name: "list_reports", args: {} };
          await composer.fill("what reports do I have");
          await composer.press("Enter");
          const step = page.getByTestId("ai-tool-step").last();
          await expect(step).toHaveText("Looked at reports and boards", { timeout: 15000 });
        });

        await test.step("The board shows both reports, resizes, refreshes and unpins", async () => {
          await page.getByTestId("ai-expand-to-agent").click();
          await page.getByTestId("ai-board-item").filter({ hasText: "Sales" }).click();
          const board = page.getByTestId("ai-board");
          await expect(board).toHaveAttribute("data-board", "Sales");
          const cards = board.getByTestId("ai-board-card");
          await expect(cards).toHaveCount(2);
          await expect(cards.first().getByTestId("ai-chart")).toHaveAttribute("data-type", "bar");
          await expect(cards.nth(1).getByTestId("ai-chart")).toContainText("30");

          await expect(cards.first().getByTestId("ai-board-card-resize")).toHaveCount(0);
          await board.getByTestId("dashboard-edit").click();
          await cards.first().getByTestId("ai-board-card-resize").click();
          await expect(cards.first()).toHaveAttribute("data-width", "2");

          await page.request.post("/api/query/raw", { data: { connectionId, query: `INSERT INTO ${sales} VALUES (3,'east',5)` } });
          await board.getByTestId("ai-board-refresh").click();
          await expect(cards.nth(1).getByTestId("ai-chart")).toContainText("35", { timeout: 15000 });

          const [first, second] = await Promise.all([
            cards.first().getAttribute("data-card"),
            cards.nth(1).getAttribute("data-card"),
          ]);
          const from = await cards.nth(1).getByTestId("ai-board-card-drag").boundingBox();
          const to = await cards.first().getByTestId("ai-board-card-drag").boundingBox();
          await page.mouse.move(from!.x + 5, from!.y + 5);
          await page.mouse.down();
          await page.mouse.move(to!.x + 5, to!.y + 5, { steps: 10 });
          await page.mouse.up();
          await expect(cards.first()).toHaveAttribute("data-card", second!);
          await expect(cards.nth(1)).toHaveAttribute("data-card", first!);

          await cards.nth(1).getByTestId("ai-board-card-unpin").click();
          await expect(cards).toHaveCount(1);

          await board.getByTestId("dashboard-add-card").click();
          await page.getByRole("option", { name: first! }).click();
          await expect(cards).toHaveCount(2);

          // The saved order, not only the one on screen.
          const saved = await page.request.get(`/api/dashboards?connectionId=${connectionId}`);
          const salesBoard = (await saved.json()).data.find((item: { name: string }) => item.name === "Sales");
          expect(salesBoard.cards.map((card: { question: { name: string } }) => card.question.name)).toEqual([second, first]);
        });

        await test.step("Deleting the board removes it from the list", async () => {
          const item = page.getByTestId("ai-board-item").filter({ hasText: "Sales" });
          await item.hover();
          await item.getByTestId("ai-board-item-delete").click();
          await expect(page.getByTestId("ai-board-item")).toHaveCount(0);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
