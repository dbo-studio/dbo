import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { setupPostgresConnection } from "../../helpers/objectFormPostgresLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { apiUrl, headers, j } from "../../helpers/nosql";
import { ConnectionPage, DataBrowserPage } from "../../pages";

test("PostgreSQL Server opens from the connection menu and shows engine metadata", async ({ page }, testInfo) => {
  const name = `pg-server-${uniqueTestSuffix(testInfo)}`;
  await withConnectionCleanup(page, name, async () => {
    const connection = new ConnectionPage(page);

    await test.step("Connect and open Server from the connection menu", async () => {
      await setupPostgresConnection(page, name);
      await connection.openSwitcher();
      await connection.getConnectionItem(name).click({ button: "right" });
      await page.getByRole("menuitem", { name: "Server", exact: true }).click();
    });

    await test.step("Read the PostgreSQL version and database catalog in the grid", async () => {
      const tool = page.getByTestId("server-tool");
      await expect(tool.getByRole("row").filter({ hasText: "Version" })).toContainText(/\d+\.\d+/);
      await tool.getByTestId("server-tabs-databases").click();
      await expect(tool.getByRole("row").filter({ has: page.getByText("postgres", { exact: true }) })).toBeVisible();
    });
  });
});

test("PostgreSQL cancels the selected query after confirmation", async ({ page }, testInfo) => {
  const suffix = uniqueTestSuffix(testInfo);
  const name = `pg-cancel-${suffix}`;
  const marker = `dbo_cancel_${suffix.replace(/[^a-z0-9_]/gi, "_")}`;

  await withConnectionCleanup(page, name, async () => {
    await setupPostgresConnection(page, name);
    const connection = new ConnectionPage(page);
    await connection.openSwitcher();
    await connection.getConnectionItem(name).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Server", exact: true }).click();
    await page.getByTestId("server-tabs-operations").click();

    const connections = (await j(await page.request.get(`${apiUrl()}/connections`, { headers }))) as { name: string; id: number }[];
    const found = connections.find((connection) => connection.name === name);
    expect(found).toBeDefined();
    const connectionId = found!.id;
    const query = page.request.post(`${apiUrl()}/query/raw`, {
      headers,
      data: { connectionId, query: `SELECT pg_sleep(12) /* ${marker} */`, backgroundAfterSeconds: 0 }
    });

    try {
      const row = page.getByTestId("server-tool").getByRole("row").filter({ hasText: marker });
      await test.step("Open the activity action for the running query", async () => {
        await row.getByRole("button", { name: "More actions" }).click();
        await page.getByRole("menuitem", { name: "Cancel query" }).click();
      });

      await test.step("Confirm cancellation and see the action disappear", async () => {
        await page.getByRole("button", { name: "Cancel query", exact: true }).click();
        await expect(row.getByRole("button", { name: "More actions" })).toHaveCount(0);
        expect(JSON.stringify(await (await query).json())).toMatch(/cancel/i);
      });
    } finally {
      await query.catch(() => undefined);
    }
  });
});

test("Explain shows the PostgreSQL plan for the open table", async ({ page }, testInfo) => {
  const suffix = uniqueTestSuffix(testInfo);
  const name = `pg-plan-${suffix}`;
  const table = `dbo_plan_${suffix.replace(/[^a-z0-9_]/gi, "_")}`;

  await withConnectionCleanup(page, name, async () => {
    await setupPostgresConnection(page, name);
    const connections = (await j(await page.request.get(`${apiUrl()}/connections`, { headers }))) as { name: string; id: number }[];
    const connectionId = connections.find((connection) => connection.name === name)!.id;
    const execute = (query: string) => page.request.post(`${apiUrl()}/query/raw`, {
      headers, data: { connectionId, database: "default", query, backgroundAfterSeconds: 0 }
    });

    try {
      await test.step("Open a disposable table in the data browser", async () => {
        expect((await execute(`CREATE TABLE public."${table}" (id integer)`)).ok()).toBe(true);
        await new DataBrowserPage(page).openTableFromTree([name, "default", "public"], table);
      });

      await test.step("Explain the current query and read its plan", async () => {
        await page.getByRole("button", { name: "Explain", exact: true }).click();
        await expect(page.getByTestId("sql-explain")).toContainText(`Scan on ${table}`);
      });
    } finally {
      await execute(`DROP TABLE IF EXISTS public."${table}"`);
    }
  });
});
