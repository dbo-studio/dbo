import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  const connection = body.data.find((item) => item.name === name);
  expect(connection, `connection ${name} exists`).toBeDefined();
  return connection?.id as number;
}

async function tableCount(page: Page, connectionId: number, table: string): Promise<unknown> {
  const response = await page.request.post("/api/query/raw", {
    data: { connectionId, query: `SELECT COUNT(*)::int AS v FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}'` },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { data: Array<Record<string, unknown>> } };
  return body.data.data[0]?.v;
}

test.describe("Schema change apply is atomic", () => {
  test("a failing step rolls back the steps that already ran (postgres)", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `schema-atomic-${suffix}`;
    const existing = `e2e_atomic_existing_${suffix}`;
    const fresh = `e2e_atomic_fresh_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("postgresql", connectionName));
      const connectionId = await connectionIdByName(page, connectionName);

      const created = await page.request.post("/api/query/raw", {
        data: { connectionId, query: `CREATE TABLE ${existing} (id INTEGER PRIMARY KEY)` },
      });
      expect(created.status()).toBe(200);

      const column = [{ name: "id", type: "INTEGER", primary: true }];
      // The first create is valid; the second collides with an existing table.
      const failing = [
        { op: "create_table", table: fresh, columns: column },
        { op: "create_table", table: existing, columns: column },
      ];

      await test.step("Failing changeset is refused and leaves nothing behind", async () => {
        const response = await page.request.post("/api/schema/changes/apply", { data: { connectionId, database: "default", schema: "public", ops: failing } });
        expect(response.status()).toBe(500);
        expect(await tableCount(page, connectionId, fresh)).toBe(0);
        expect(await tableCount(page, connectionId, existing)).toBe(1);
      });

      await test.step("A valid changeset still applies", async () => {
        const response = await page.request.post("/api/schema/changes/apply", {
          data: { connectionId, database: "default", schema: "public", ops: [failing[0]] },
        });
        expect(response.status()).toBe(200);
        expect(await tableCount(page, connectionId, fresh)).toBe(1);
      });
    });
  });
});
