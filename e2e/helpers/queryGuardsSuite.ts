import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { apiRoute, pendingResponse } from "./network";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

type RawQueryPayload = {
  data: {
    data: unknown[];
    paginated?: boolean;
    limit?: number;
  };
};

function labelOf(engine: DbEngine): string {
  if (engine === "postgresql") return "PostgreSQL";
  if (engine === "mysql") return "MySQL";
  return "SQLite";
}

async function selectEditorContext(
  sqlEditor: SqlEditorPage,
  engine: DbEngine,
): Promise<void> {
  if (engine === "postgresql") {
    await sqlEditor.selectContext("default", "public");
  } else if (engine === "mysql") {
    await sqlEditor.selectContext("default");
  }
}

function longRunningSql(engine: DbEngine): string {
  if (engine === "postgresql") return "SELECT pg_sleep(30)";
  if (engine === "mysql") return "SELECT SLEEP(30)";
  // SQLite has no sleep — large recursive CTE is interruptible.
  return `
WITH RECURSIVE r(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM r WHERE i < 50000000
)
SELECT COUNT(*) FROM r
  `.trim();
}

function seriesSelectSql(count: number, limitClause = ""): string {
  return `
WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < ${count}
)
SELECT n FROM seq ORDER BY 1${limitClause ? ` ${limitClause}` : ""}
  `.trim();
}

/**
 * Same query-guard depth for every shipped engine.
 */
export function defineQueryGuardsTests(engine: DbEngine): void {
  const label = labelOf(engine);
  const testPrefix = `qg-${engine === "postgresql" ? "pg" : engine}`;

  test.describe(`Query Guards ${label}`, () => {
    test("Cancel long-running query from editor Stop", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-cancel-${suffix}`;
      const sqlitePath =
        engine === "sqlite"
          ? `/tmp/dbo-e2e-qg-cancel-${suffix}.db`
          : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Setup connection and open editor", async () => {
            await connectionPage.setupConnection(config);
            await connectionPage.expectConnectionActive(connectionName);
            await sqlEditor.open();
            await selectEditorContext(sqlEditor, engine);
          });

          await test.step("Start long query and stop it", async () => {
            await sqlEditor.typeQuery(longRunningSql(engine));
            await sqlEditor.clickRun();
            await sqlEditor.stopQuery();
            await sqlEditor.expectQueryCancelled();
            await expect(sqlEditor.runQueryButton).toBeVisible({
              timeout: 10000,
            });
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    test("Raw SELECT pagination and user LIMIT preserved", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-page-${suffix}`;
      const sqlitePath =
        engine === "sqlite" ? `/tmp/dbo-e2e-qg-page-${suffix}.db` : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Setup connection and open editor", async () => {
            await connectionPage.setupConnection(config);
            await connectionPage.expectConnectionActive(connectionName);
            await sqlEditor.open();
            await selectEditorContext(sqlEditor, engine);
          });

          await test.step("SELECT without LIMIT is capped and paginated", async () => {
            const responsePromise = pendingResponse(page, apiRoute.queryRaw);
            await sqlEditor.typeQuery(seriesSelectSql(500));
            await sqlEditor.clickRun();
            const response = await responsePromise;
            const body = (await response.json()) as RawQueryPayload;

            expect(body.data.data.length).toBe(100);
            expect(body.data.paginated).toBe(true);
            expect(body.data.limit).toBe(100);

            await dataGrid.waitForData("1");
            await sqlEditor.expectPaginationVisible();
          });

          await test.step("User LIMIT is not overridden", async () => {
            const responsePromise = pendingResponse(page, apiRoute.queryRaw);
            await sqlEditor.typeQuery(seriesSelectSql(500, "LIMIT 5"));
            await sqlEditor.clickRun();
            const response = await responsePromise;
            const body = (await response.json()) as RawQueryPayload;

            expect(body.data.data.length).toBe(5);
            expect(body.data.paginated).toBe(false);

            await dataGrid.waitForData("1");
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });
  });
}
