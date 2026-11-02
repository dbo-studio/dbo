import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/** The chart kit's second tier, drawn from real rows: combo, scatter, funnel, gauge, heatmap, pivot and trend. */
test.describe("Chart types", () => {
  test("each type draws its data on a shared board", async ({ page, browser }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `charts-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-charts-${suffix}.db`;
    const sales = `sales_${suffix}`;
    ensureSqliteDbFile(dbPath);
    const baseURL = testInfo.project.use.baseURL as string;

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const raw = (query: string) => page.request.post("/api/query/raw", { data: { connectionId, query, backgroundAfterSeconds: 0 } });
        await raw(`CREATE TABLE ${sales} (region TEXT, month TEXT, amount INTEGER, cost INTEGER, qty INTEGER)`);
        await raw(
          `INSERT INTO ${sales} VALUES ('east','2026-01',100,60,3),('east','2026-02',150,70,5),('west','2026-01',80,50,2),('west','2026-02',120,90,4),('north','2026-01',60,40,1),('north','2026-02',200,80,9)`,
        );

        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: `Charts ${suffix}` } })).json()
        ).data.id;
        const add = async (name: string, sql: string, chart: object): Promise<void> => {
          const made = await page.request.post("/api/questions", { data: { connectionId, name, sql, chart } });
          expect(made.status(), name).toBe(200);
          const id = ((await made.json()) as { data: { id: number } }).data.id;
          await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: id } });
        };

        await add("Combo", `SELECT month, SUM(amount) AS amount, SUM(cost) AS cost FROM ${sales} GROUP BY month ORDER BY month`, { type: "combo", x: "month", y: ["amount", "cost"] });
        await add("Scatter", `SELECT amount, cost, qty FROM ${sales}`, { type: "scatter", x: "amount", y: ["cost"], size: "qty" });
        await add("Funnel", `SELECT 'visits' AS stage, 1000 AS n UNION ALL SELECT 'signups', 300 UNION ALL SELECT 'paid', 90`, { type: "funnel", x: "stage", y: ["n"] });
        await add("Gauge", `SELECT 72 AS done`, { type: "gauge", y: ["done"], goal: 120 });
        await add("Heatmap", `SELECT region, month, amount FROM ${sales}`, { type: "heatmap", x: "region", group: "month", y: ["amount"] });
        await add("Pivot", `SELECT region, month, amount FROM ${sales}`, { type: "pivot", x: "region", group: "month", y: ["amount"] });
        await add("Trend", `SELECT month, SUM(amount) AS revenue FROM ${sales} GROUP BY month ORDER BY month`, { type: "trend", x: "month", y: ["revenue"] });

        const token = (
          (await (await page.request.post(`/api/dashboards/${board}/shares`, { data: {} })).json()) as { data: { token: string } }
        ).data.token;
        const visitor = await browser.newContext({ baseURL });
        const shared = await visitor.newPage();
        await shared.goto(`/share/${token}`);
        await expect(shared.getByTestId("shared-card")).toHaveCount(7);
        const card = (name: string) => shared.getByTestId("shared-card").filter({ hasText: name });

        await test.step("Combo: bars and a line on one axis", async () => {
          const chart = card("Combo").getByTestId("ai-chart");
          await expect(chart).toHaveAttribute("data-type", "combo");
          await expect(chart.locator(".recharts-bar-rectangle").first()).toBeVisible();
          await expect(chart.locator(".recharts-line-curve")).toHaveCount(1);
        });

        await test.step("Scatter: one dot per row", async () => {
          const chart = card("Scatter").getByTestId("ai-chart");
          await expect(chart).toHaveAttribute("data-type", "scatter");
          await expect(chart.locator(".recharts-scatter-symbol")).toHaveCount(6);
        });

        await test.step("Funnel: a stage per row", async () => {
          const chart = card("Funnel").getByTestId("ai-chart");
          await expect(chart).toHaveAttribute("data-type", "funnel");
          await expect(chart.locator(".recharts-funnel-trapezoid")).toHaveCount(3);
        });

        await test.step("Gauge: value against its goal", async () => {
          await expect(card("Gauge").getByTestId("gauge-value")).toContainText("72 / 120");
        });

        await test.step("Heatmap: a cell per region and month", async () => {
          const chart = card("Heatmap").getByTestId("ai-chart");
          await expect(chart).toHaveAttribute("data-type", "heatmap");
          await expect(chart.getByTestId("heatmap-cell")).toHaveCount(6);
          await expect(chart.getByTestId("heatmap-cell").first()).toHaveAttribute("title", /east \/ 2026-01: 100/);
        });

        await test.step("Pivot: months become columns", async () => {
          const chart = card("Pivot").getByTestId("ai-chart");
          await expect(chart).toHaveAttribute("data-type", "pivot");
          await expect(chart).toContainText("2026-01");
          await expect(chart).toContainText("2026-02");
          await expect(chart).toContainText("200");
        });

        await test.step("Trend: the latest value and its change from the one before", async () => {
          const chart = card("Trend").getByTestId("ai-chart");
          // 240 in January, 470 in February.
          await expect(chart.getByTestId("trend-value")).toHaveText("470");
          await expect(chart.getByTestId("trend-change")).toContainText("95.8%");
          await expect(chart.getByTestId("trend-change")).toHaveAttribute("data-direction", "up");
        });

        await visitor.close();
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
