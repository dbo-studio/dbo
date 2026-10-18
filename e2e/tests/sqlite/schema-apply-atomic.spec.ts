import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import {
  applyChangeset,
  changesetStatuses,
  proposeChangeset,
  reviewChangeset,
  undoSql,
} from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { ensureSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/**
 * A persisted agent changeset applies from its stored ops: all-or-nothing on
 * SQLite, rejected ops are skipped, and nothing runs before the user applies.
 */

async function connectionIdByName(page: Page, name: string): Promise<number> {
  const response = await page.request.get("/api/connections");
  const body = (await response.json()) as { data: Array<{ id: number; name: string }> };
  const connection = body.data.find((item) => item.name === name);
  expect(connection, `connection ${name} exists`).toBeDefined();
  return connection?.id as number;
}

async function rawRows(page: Page, connectionId: number, query: string): Promise<Array<Record<string, unknown>>> {
  const response = await page.request.post("/api/query/raw", { data: { connectionId, query } });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: { data: Array<Record<string, unknown>> } }).data.data;
}

async function tableCount(page: Page, connectionId: number, table: string): Promise<unknown> {
  const rows = await rawRows(page, connectionId, `SELECT COUNT(*) AS v FROM sqlite_master WHERE name = '${table}'`);
  return rows[0]?.v;
}

test.describe("Persisted changeset apply", () => {
  test("applies stored ops atomically and skips rejected ones (sqlite)", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `schema-atomic-${suffix}`;
    const existing = `e2e_atomic_existing_${suffix}`;
    const fresh = `e2e_atomic_fresh_${suffix}`;
    const skipped = `e2e_atomic_skipped_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-atomic-${suffix}.db`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));
        await pointProviderAtFakeLlm(page, llmUrl);
        const connectionId = await connectionIdByName(page, connectionName);

        await rawRows(page, connectionId, `CREATE TABLE ${existing} (id INTEGER PRIMARY KEY)`);

        const column = [{ name: "id", type: "INTEGER", primary: true }];
        let undone: string[] = [];

        await test.step("Proposing runs no DDL and starts every op as pending", async () => {
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table: fresh, columns: column },
          ]);
          expect(await tableCount(page, connectionId, fresh)).toBe(0);
          expect(await changesetStatuses(page, proposal)).toEqual(["pending"]);
        });

        await test.step("A failing step rolls back the steps that already ran", async () => {
          // The first create is valid; the second collides with an existing table.
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table: fresh, columns: column },
            { op: "create_table", table: existing, columns: column },
          ]);
          const response = await applyChangeset(page, proposal);
          expect(response.status()).toBe(500);
          expect(await tableCount(page, connectionId, fresh)).toBe(0);
          expect(await tableCount(page, connectionId, existing)).toBe(1);
          expect(await changesetStatuses(page, proposal)).toEqual(["pending", "pending"]);
        });

        await test.step("Rejected ops are skipped and applied ops cannot be reviewed again", async () => {
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_table", table: fresh, columns: column },
            { op: "create_table", table: skipped, columns: column },
          ]);
          expect((await reviewChangeset(page, proposal, "rejected", 1)).status()).toBe(200);
          expect((await applyChangeset(page, proposal)).status()).toBe(200);
          expect(await tableCount(page, connectionId, fresh)).toBe(1);
          expect(await tableCount(page, connectionId, skipped)).toBe(0);
          expect(await changesetStatuses(page, proposal)).toEqual(["applied", "rejected"]);
          // Only what was applied can be taken back.
          expect(await undoSql(page, proposal)).toEqual([`DROP TABLE "${fresh}"`]);

          expect((await reviewChangeset(page, proposal, "rejected", 0)).status()).toBe(409);
          expect((await applyChangeset(page, proposal)).status()).toBe(400);
        });

        await test.step("Alter, index, add and drop ops on one table share a single recreate", async () => {
          await rawRows(page, connectionId, `ALTER TABLE ${fresh} ADD COLUMN email TEXT`);
          await rawRows(page, connectionId, `ALTER TABLE ${fresh} ADD COLUMN legacy TEXT`);

          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "alter_column", table: fresh, column: { name: "email", type: "VARCHAR(120)" } },
            { op: "add_index", table: fresh, indexColumns: ["email"], unique: true },
            { op: "drop_column", table: fresh, columnName: "legacy" },
            { op: "add_column", table: fresh, column: { name: "phone", type: "TEXT" } },
          ]);
          expect((await applyChangeset(page, proposal)).status()).toBe(200);

          const columns = await rawRows(page, connectionId, `SELECT name, type FROM pragma_table_info('${fresh}') ORDER BY cid`);
          expect(columns.map(({ name, type }) => ({ name, type }))).toEqual([
            { name: "id", type: "INTEGER" },
            { name: "email", type: "VARCHAR(120)" },
            { name: "phone", type: "TEXT" },
          ]);
          const indexes = await rawRows(page, connectionId, `SELECT name FROM pragma_index_list('${fresh}')`);
          expect(indexes.map(({ name }) => name)).toEqual([`idx_${fresh}_email`]);

          // Adds can be taken back; the altered and dropped columns cannot.
          undone = await undoSql(page, proposal);
          expect(undone).toEqual([
            `ALTER TABLE "${fresh}" DROP COLUMN "phone"`,
            `DROP INDEX "idx_${fresh}_email"`,
          ]);
        });

        await test.step("Running the undo SQL takes the added column and index back", async () => {
          for (const statement of undone) {
            await rawRows(page, connectionId, statement);
          }
          const columns = await rawRows(page, connectionId, `SELECT name FROM pragma_table_info('${fresh}') ORDER BY cid`);
          expect(columns.map(({ name }) => name)).toEqual(["id", "email"]);
        });
      });
    } finally {
      await llm.stop();
    }
  });
});
