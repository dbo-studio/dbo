import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { ConnectionPage } from "../pages";
import { raw, rawError, scalar } from "./hostSql";
import { withConnectionCleanup } from "./safeCleanup";

type Engine = "mysql" | "mssql" | "clickhouse";

/**
 * The object form has no generated-column field on these engines (only PostgreSQL and SQLite do), so the
 * contract is checked where it lives: a generated column made in the editor is listed, computed by the
 * server, and refuses writes with a message instead of crashing the app.
 */
const DDL: Record<Engine, (t: string) => string> = {
  mysql: (t) => `CREATE TABLE ${t} (id INT PRIMARY KEY, amount INT NOT NULL, doubled INT GENERATED ALWAYS AS (amount * 2) STORED)`,
  mssql: (t) => `CREATE TABLE ${t} (id INT PRIMARY KEY, amount INT NOT NULL, doubled AS (amount * 2) PERSISTED)`,
  clickhouse: (t) =>
    `CREATE TABLE ${t} (id UInt32, amount Int32, doubled Int32 MATERIALIZED amount * 2) ENGINE = MergeTree ORDER BY id`,
};

export function defineGeneratedColumnApiTests(engine: Engine): void {
  test.describe(`Generated column ${engine} (API)`, () => {
    async function withTable(
      page: import("@playwright/test").Page,
      testInfo: import("@playwright/test").TestInfo,
      body: (id: number, t: string) => Promise<void>,
    ): Promise<void> {
      const suffix = uniqueTestSuffix(testInfo);
      const name = `gen-${engine}-${suffix}`;
      const t = `e2e_gen_${suffix}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 50);
      await withConnectionCleanup(page, name, async () => {
        const cp = new ConnectionPage(page);
        await cp.goto();
        await cp.waitForReady();
        await cp.createConnection(getDbConfig(engine, name));
        const list = (await (await page.request.get("/api/connections")).json()) as { data: { id: number; name: string }[] };
        const id = list.data.find((c) => c.name === name)!.id;
        await raw(page, id, `DROP TABLE IF EXISTS ${t}`);
        const ddl = await rawError(page, id, DDL[engine](t));
        expect(ddl, `create ${t}`).toBeNull();
        try {
          await body(id, t);
        } finally {
          await raw(page, id, `DROP TABLE IF EXISTS ${t}`).catch(() => undefined);
        }
      });
    }

    test("the server computes the value on insert", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, t) => {
        await raw(page, id, `INSERT INTO ${t} (id, amount) VALUES (1, 21)`);
        expect(Number(await scalar(page, id, `SELECT doubled FROM ${t} WHERE id = 1`))).toBe(42);
      });
    });

    test("a write to the generated column is refused with a message and changes nothing", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, t) => {
        await raw(page, id, `INSERT INTO ${t} (id, amount) VALUES (1, 5)`);
        expect(await rawError(page, id, `INSERT INTO ${t} (id, amount, doubled) VALUES (2, 5, 99)`)).toBeTruthy();
        if (engine !== "clickhouse") {
          expect(await rawError(page, id, `UPDATE ${t} SET doubled = 99 WHERE id = 1`)).toBeTruthy();
        }
        expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${t}`))).toBe(1);
        expect(Number(await scalar(page, id, `SELECT doubled FROM ${t} WHERE id = 1`))).toBe(10);
      });
    });

    test("SELECT * includes the generated column", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, t) => {
        await raw(page, id, `INSERT INTO ${t} (id, amount) VALUES (1, 3)`);
        const rows = await raw(page, id, `SELECT * FROM ${t}`);
        const names = rows.columns.map((c) => c.name);
        // ClickHouse leaves MATERIALIZED columns out of SELECT *.
        expect(names).toEqual(expect.arrayContaining(engine === "clickhouse" ? ["id", "amount"] : ["id", "amount", "doubled"]));
      });
    });

    if (engine !== "clickhouse") {
      test("updating the source column recomputes the generated one", async ({ page }, testInfo) => {
        await withTable(page, testInfo, async (id, t) => {
          await raw(page, id, `INSERT INTO ${t} (id, amount) VALUES (1, 4)`);
          await raw(page, id, `UPDATE ${t} SET amount = 10 WHERE id = 1`);
          expect(Number(await scalar(page, id, `SELECT doubled FROM ${t} WHERE id = 1`))).toBe(20);
        });
      });
    }
  });
}
