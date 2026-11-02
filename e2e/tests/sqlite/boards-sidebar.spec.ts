import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { BoardsPage, ConnectionPage, ObjectTreePage } from "../../pages";

/** Boards sidebar view: dashboards and reports of the connection, create, open, rename, duplicate and delete. */
test.describe("Boards in the sidebar", () => {
  test("create, rename, duplicate and delete a dashboard", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `dash-tree-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-dash-tree-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);
        const boards = new BoardsPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await tree.waitForTreeLoad();

        const createdName = `Revenue ${suffix}`;
        const renamedName = `Revenue Q1 ${suffix}`;

        await test.step("New dashboard from the Boards view opens a tab", async () => {
          await boards.newDashboard();
          await page.getByTestId("dashboard-name-input").fill(createdName);
          await page.getByTestId("dashboard-name-submit").click();
          await expect(page.getByTestId("dashboard-tab")).toBeVisible();
          await expect(page.getByTestId("ai-board")).toHaveAttribute(
            "data-board",
            createdName,
          );
        });

        await test.step("It is listed in the Boards view and survives a reload", async () => {
          await page.reload();
          await tree.waitForTreeLoad();
          await boards.open();
          await expect(boards.item(createdName)).toBeVisible();
        });

        await test.step("Rename updates the list and the open tab", async () => {
          await boards.runAction(createdName, "Rename");
          await page.getByTestId("dashboard-name-input").fill(renamedName);
          await page.getByTestId("dashboard-name-submit").click();
          await expect(boards.item(renamedName)).toBeVisible();
          await expect(boards.item(createdName)).toHaveCount(0);
        });

        await test.step("Duplicate adds a copy", async () => {
          await boards.runAction(renamedName, "Duplicate");
          await expect(boards.item(`${renamedName} (copy)`)).toBeVisible();
        });

        await test.step("Delete asks first, then removes the dashboard", async () => {
          await boards.runAction(`${renamedName} (copy)`, "Delete");
          await boards.confirmDelete();
          await expect(boards.item(`${renamedName} (copy)`)).toHaveCount(
            0,
          );
          await expect(boards.item(renamedName)).toBeVisible();
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });

  test("create, edit, save and delete a question", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `question-tree-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-question-tree-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);
        const boards = new BoardsPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await tree.waitForTreeLoad();

        const name = `Signups ${suffix}`;

        await test.step("New report from the Boards view opens its editor", async () => {
          await boards.newReport();
          await expect(page.getByTestId("question-tab")).toBeVisible();
          await expect(page.getByTestId("ai-report-editor")).toBeVisible();
        });

        await test.step("Rename, change the chart and save", async () => {
          await page.getByTestId("ai-report-title").fill(name);
          await page.getByTestId("ai-report-type-number").click();
          await page.getByTestId("ai-report-run").click();
          await page.getByTestId("ai-report-save-canvas").click();
          await boards.open();
          await expect(boards.item(name)).toBeVisible();
        });

        await test.step("Saved changes survive a reload", async () => {
          await page.reload();
          await tree.waitForTreeLoad();
          await boards.openItem(name);
          await expect(page.getByTestId("ai-report-title")).toHaveValue(name);
          await expect(page.getByTestId("ai-report-type-number")).toHaveAttribute(
            "aria-pressed",
            "true",
          );
        });

        await test.step("Delete asks first, then removes it and its tab", async () => {
          await boards.runAction(name, "Delete");
          await boards.confirmDelete();
          await expect(boards.item(name)).toHaveCount(0);
          await expect(page.getByTestId("question-tab")).toHaveCount(0);
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });

  test("{{filters}} in report SQL: the editor and the board fill them", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `filters-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-filters-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);
        const boards = new BoardsPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await tree.waitForTreeLoad();

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const create = async (name: string, sql: string, params: Record<string, string> = {}): Promise<number> =>
          (
            await (
              await page.request.post("/api/questions", {
                data: { connectionId, name, sql, chart: { type: "table", y: [] }, params },
              })
            ).json()
          ).data.id;
        const sales = `sales_${suffix}`;
        await page.request.post("/api/query/raw", {
          data: { connectionId, query: `CREATE TABLE ${sales} (region TEXT, amount REAL)` },
        });
        await page.request.post("/api/query/raw", {
          data: { connectionId, query: `INSERT INTO ${sales} VALUES ('east',10),('west',20),('east',500)` },
        });
        const echo = await create(`Echo ${suffix}`, "SELECT {{label}} AS label, {{n:number}} AS v");
        const double = await create(`Double ${suffix}`, "SELECT {{ n }} * 2 AS doubled");
        const counted = await create(
          `Count ${suffix}`,
          `SELECT COUNT(*) AS rows_in FROM ${sales} WHERE {{region:field=${sales}.region}} AND amount BETWEEN {{amount:range}}`,
          { amount: "0..100" },
        );
        const boardName = `Filtered ${suffix}`;
        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: boardName } })).json()
        ).data.id;
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: echo } });
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: double } });
        await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: counted } });

        await page.reload();
        await tree.waitForTreeLoad();

        await test.step("One board filter feeds every card with that name", async () => {
          await boards.openItem(boardName);
          const cards = page.getByTestId("ai-board-card");
          await expect(cards).toHaveCount(3);
          await expect(cards.first().getByTestId("ai-board-card-needs-filter")).toContainText("label, n");
          // The saved range default runs it at once; the empty field filter matches every region.
          await expect(cards.nth(2).getByTestId("ai-chart")).toContainText("2");

          await page.getByTestId("param-n").fill("21");
          await page.getByTestId("param-label").fill("it's");
          await page.getByTestId("param-label").press("Enter");
          await expect(cards.first().getByTestId("ai-chart")).toContainText("it's");
          await expect(cards.nth(1).getByTestId("ai-chart")).toContainText("42");
        });

        await test.step("A field filter offers the column's values; a range takes both ends", async () => {
          const cards = page.getByTestId("ai-board-card");
          await page.getByTestId("param-region").click();
          await expect(page.getByRole("option", { name: "west" })).toBeVisible();
          await page.getByRole("option", { name: "east" }).click();
          await expect(cards.nth(2).getByTestId("ai-chart")).toContainText("1");

          await page.getByTestId("param-amount-high").fill("1000");
          await page.getByTestId("param-amount-high").press("Enter");
          await expect(cards.nth(2).getByTestId("ai-chart")).toContainText("2");
        });

        await test.step("The editor asks for the filters of the SQL it runs", async () => {
          await boards.openItem(`Double ${suffix}`);
          await expect(page.getByTestId("question-tab")).toBeVisible();
          await page.getByTestId("param-n").fill("5");
          await page.getByTestId("ai-report-run").click();
          await expect(page.getByTestId("question-tab").getByTestId("ai-chart")).toContainText("10");
        });

        await test.step("Saving keeps the filter values as the report's defaults", async () => {
          await page.getByTestId("ai-report-save-canvas").click();
          await expect
            .poll(async () => {
              const list = (await (await page.request.get(`/api/questions?connectionId=${connectionId}`)).json()) as {
                data: Array<{ id: number; params: Record<string, string> }>;
              };
              return list.data.find((item) => item.id === double)?.params;
            })
            .toEqual({ n: "5" });
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });

  test("export a card as CSV and PNG, the board as JSON, and import it back", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `board-files-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-board-files-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        const tree = new ObjectTreePage(page);
        const boards = new BoardsPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
        );
        await tree.waitForTreeLoad();

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const reportName = `Totals ${suffix}`;
        const question = (
          await (
            await page.request.post("/api/questions", {
              data: { connectionId, name: reportName, sql: "SELECT 'a,b' AS label, 7 AS v", chart: { type: "table", y: [] } },
            })
          ).json()
        ).data.id;
        const boardName = `Files ${suffix}`;
        const board = (
          await (await page.request.post("/api/dashboards", { data: { connectionId, name: boardName } })).json()
        ).data.id;
        const pinned = (
          await (await page.request.post(`/api/dashboards/${board}/cards`, { data: { questionId: question } })).json()
        ).data.cards[0].id;
        await page.request.patch(`/api/dashboards/${board}/cards/${pinned}`, { data: { width: 2 } });

        await page.reload();
        await tree.waitForTreeLoad();
        await boards.openItem(boardName);
        const card = page.getByTestId("ai-board-card");
        await expect(card.getByTestId("ai-board-card-updated")).toBeVisible();

        await test.step("A card downloads as CSV and PNG", async () => {
          const csv = page.waitForEvent("download");
          await card.getByTestId("ai-board-card-csv").click();
          const csvFile = await csv;
          expect(csvFile.suggestedFilename()).toBe(`${reportName}.csv`);
          expect(readFileSync(await csvFile.path(), "utf8")).toBe('label,v\n"a,b",7');

          const png = page.waitForEvent("download");
          await card.getByTestId("ai-board-card-png").click();
          expect((await png).suggestedFilename()).toBe(`${reportName}.png`);
        });

        await test.step("The auto-refresh choice is kept per board", async () => {
          await page.getByTestId("dashboard-auto-refresh").click();
          await page.getByRole("option", { name: "Every 5 min" }).click();
          await page.reload();
          await tree.waitForTreeLoad();
          await boards.openItem(boardName);
          await expect(page.getByTestId("dashboard-auto-refresh")).toContainText("Every 5 min");
        });

        const exported = await test.step("The board exports as JSON", async () => {
          const download = page.waitForEvent("download");
          await page.getByTestId("dashboard-export").click();
          const file = await download;
          expect(file.suggestedFilename()).toBe(`${boardName}.dashboard.json`);
          const text = readFileSync(await file.path(), "utf8");
          expect(JSON.parse(text)).toMatchObject({
            version: 1,
            name: boardName,
            cards: [{ width: 2, question: { name: reportName, sql: "SELECT 'a,b' AS label, 7 AS v" } }],
          });
          return text;
        });

        await test.step("Importing the file recreates the board and its report", async () => {
          await page.request.delete(`/api/dashboards/${board}`);
          await page.request.delete(`/api/questions/${question}`);
          const chooser = page.waitForEvent("filechooser");
          await boards.importDashboard();
          await (await chooser).setFiles({ name: "board.json", mimeType: "application/json", buffer: Buffer.from(exported) });
          await expect(page.getByTestId("ai-board")).toHaveAttribute("data-board", boardName);
          await expect(card).toHaveAttribute("data-width", "2");
          await expect(card.getByTestId("ai-chart")).toContainText("a,b");
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
    }
  });
});
