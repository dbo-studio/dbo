import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { apiRoute, pendingResponse } from "../helpers/network";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

type RawQueryPayload = {
  data: {
    data: unknown[];
    paginated?: boolean;
    limit?: number;
  };
};

/**
 * Query Guards — cancel in-flight query + SELECT-only raw pagination.
 */
test.describe("Query Guards", () => {
  test("Cancel long-running query from editor Stop", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);

    const connectionName = `qg-cancel-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and open editor", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionHeading(connectionName),
        ).toBeVisible();
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
      });

      await test.step("Start long query and stop it", async () => {
        await sqlEditor.typeQuery("SELECT pg_sleep(30)");
        await sqlEditor.clickRun();
        await sqlEditor.stopQuery();
        await sqlEditor.expectQueryCancelled();
        await expect(sqlEditor.runQueryButton).toBeVisible({ timeout: 10000 });
      });
    });
  });

  test("Raw SELECT pagination and user LIMIT preserved", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const connectionName = `qg-page-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and open editor", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionHeading(connectionName),
        ).toBeVisible();
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
      });

      await test.step("SELECT without LIMIT is capped and paginated", async () => {
        const responsePromise = pendingResponse(page, apiRoute.queryRaw);
        await sqlEditor.typeQuery(
          "SELECT generate_series(1, 500) AS n ORDER BY 1",
        );
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
        await sqlEditor.typeQuery(
          "SELECT generate_series(1, 500) AS n ORDER BY 1 LIMIT 5",
        );
        await sqlEditor.clickRun();
        const response = await responsePromise;
        const body = (await response.json()) as RawQueryPayload;

        expect(body.data.data.length).toBe(5);
        expect(body.data.paginated).toBe(false);

        await dataGrid.waitForData("1");
      });
    });
  });
});
