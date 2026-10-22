import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import { applyChangeset, proposeChangeset } from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../../pages";

/** The agent answers a numbers question with a chart: a card in the chat, editable on the canvas's Report tab. */
test.describe("AI report charts", () => {
  test("show_chart draws a chart, opens on the canvas, and refuses writes", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-report-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-report-${suffix}.db`;
    const orders = `orders_${suffix}`;
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
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [
            {
              op: "create_table",
              table: orders,
              columns: [
                { name: "id", type: "INTEGER", primary: true },
                { name: "month", type: "TEXT" },
                { name: "total", type: "REAL" },
              ],
            },
          ]),
        );
        await page.request.post("/api/query/raw", {
          data: {
            connectionId,
            query: `INSERT INTO ${orders} VALUES (1,'2026-01',10),(2,'2026-01',5),(3,'2026-02',20),(4,'2026-03',7)`,
          },
        });
        await page.reload();
        await settingsPage.openRightSidebar();
        const composer = page.getByTestId("ai-chat-input");

        await test.step("A numbers question gets a chart card in the chat", async () => {
          llm.script = {
            name: "show_chart",
            args: {
              title: "Revenue by month",
              type: "line",
              x: "month",
              y: ["revenue"],
              sql: `SELECT month, SUM(total) AS revenue FROM ${orders} GROUP BY month ORDER BY month`,
            },
          };
          await composer.fill("revenue by month");
          await composer.press("Enter");
          const card = page.getByTestId("ai-report-card");
          await expect(card).toContainText("Revenue by month", {
            timeout: 15000,
          });
          await expect(card.getByTestId("ai-chart")).toHaveAttribute(
            "data-type",
            "line",
          );
          await expect(page.getByTestId("ai-tool-step").last()).toHaveText(
            "Drew Revenue by month",
          );
        });

        await test.step("Open in canvas shows it on the Report tab, where type and SQL can change", async () => {
          await page.getByTestId("ai-report-open").click();
          const canvas = page.getByTestId("ai-changeset-surface");
          await expect(canvas).toHaveAttribute("data-tab", "report", {
            timeout: 15000,
          });
          const editor = page.getByTestId("ai-report-editor");
          await expect(editor.getByTestId("ai-chart")).toHaveAttribute(
            "data-type",
            "line",
          );

          await editor.getByTestId("ai-report-type-bar").click();
          await expect(editor.getByTestId("ai-chart")).toHaveAttribute(
            "data-type",
            "bar",
          );
          await expect(editor.locator(".recharts-bar-rectangle")).toHaveCount(
            3,
          );

          // The SQL box is the app's Monaco SQL editor; set its text through Monaco, as the SQL editor page does.
          await expect(
            editor.getByTestId("ai-report-sql").locator(".monaco-editor"),
          ).toBeVisible();
          await page.evaluate((sql) => {
            type Editor = {
              setValue: (value: string) => void;
              getContainerDomNode: () => HTMLElement;
            };
            const monaco = (
              window as unknown as {
                monaco: { editor: { getEditors: () => Editor[] } };
              }
            ).monaco;
            monaco.editor
              .getEditors()
              .find((item) =>
                item
                  .getContainerDomNode()
                  .closest("[data-testid=ai-report-sql]"),
              )
              ?.setValue(sql);
          }, `SELECT month, SUM(total) AS revenue FROM ${orders} WHERE month <> '2026-03' GROUP BY month ORDER BY month`);
          await editor.getByTestId("ai-report-run").click();
          await expect(editor.locator(".recharts-bar-rectangle")).toHaveCount(
            2,
            { timeout: 15000 },
          );
          await page.getByTestId("ai-workspace-back").click();
        });

        await test.step("A chart with a write statement is refused and changes nothing", async () => {
          llm.script = {
            name: "show_chart",
            args: { title: "Oops", sql: `DELETE FROM ${orders}` },
          };
          await composer.fill("delete everything as a chart");
          await composer.press("Enter");
          await expect(page.getByTestId("ai-tool-card").last()).toHaveAttribute(
            "data-status",
            "error",
            { timeout: 15000 },
          );
          const count = await page.request.post("/api/query/raw", {
            data: {
              connectionId,
              query: `SELECT COUNT(*) AS n FROM ${orders}`,
            },
          });
          expect(
            ((await count.json()) as { data: { data: Array<{ n: number }> } })
              .data.data[0].n,
          ).toBe(4);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
