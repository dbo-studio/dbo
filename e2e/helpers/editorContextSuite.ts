import { expect, test } from "@playwright/test";
import type { HostSqlEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { ConnectionPage, SqlEditorPage } from "../pages";
import { autocomplete, createHostSqlConnection, HOST_SQL, raw, scalar } from "./hostSql";
import { withConnectionCleanup } from "./safeCleanup";

/**
 * SQL Server / ClickHouse editor context: SQL Server has a schema picker, ClickHouse a database picker.
 * The backend lists the namespaces, scopes completion to the chosen one and, for ClickHouse, runs the query there.
 */
export function defineEditorContextTests(engine: HostSqlEngine): void {
  const meta = HOST_SQL[engine];
  const isSchema = engine === "mssql";
  const scopeOf = (ns: string): { schema?: string; database?: string } => (isSchema ? { schema: ns } : { database: ns });
  const id = (v: string): string => `e2e_${v.replace(/\W/g, "_")}`.slice(0, 40);

  test.describe(`${meta.label} editor context`, () => {
    test("autocomplete lists namespaces and scopes tables to the chosen one", async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const name = `${engine}-ctx-${suffix}`;
      const ns = id(`ns_${suffix}`);
      const table = id(`t_${suffix}`);

      await withConnectionCleanup(page, name, async () => {
        const cid = await createHostSqlConnection(page, engine, name);
        await raw(page, cid, isSchema ? `CREATE SCHEMA ${ns}` : `CREATE DATABASE ${ns}`);
        try {
          const create = isSchema
            ? `CREATE TABLE ${ns}.${table} (id INT NOT NULL, label NVARCHAR(20))`
            : `CREATE TABLE ${ns}.${table} (id Int32, label String) ENGINE = MergeTree ORDER BY id`;
          await raw(page, cid, create);

          const scoped = await autocomplete(page, cid, scopeOf(ns));
          expect(scoped.tables).toContain(table);
          expect(scoped.columns[table]).toEqual(expect.arrayContaining(["id", "label"]));

          const all = await autocomplete(page, cid, scopeOf(meta.namespace));
          expect(all.tables).not.toContain(table);

          const listed = isSchema ? all.schemas : all.databases;
          expect(listed).toEqual(expect.arrayContaining([meta.namespace, ns]));
          expect(isSchema ? all.databases : all.schemas).toEqual([]);
        } finally {
          await raw(page, cid, isSchema ? `DROP TABLE IF EXISTS ${ns}.${table}` : `DROP DATABASE IF EXISTS ${ns}`).catch(() => undefined);
          if (isSchema) await raw(page, cid, `DROP SCHEMA IF EXISTS ${ns}`).catch(() => undefined);
        }
      });
    });

    if (!isSchema) {
      test("a query runs in the chosen database", async ({ page }, testInfo) => {
        const suffix = uniqueTestSuffix(testInfo);
        const name = `${engine}-use-${suffix}`;
        const db = id(`db_${suffix}`);

        await withConnectionCleanup(page, name, async () => {
          const cid = await createHostSqlConnection(page, engine, name);
          await raw(page, cid, `CREATE DATABASE ${db}`);
          try {
            await raw(page, cid, `CREATE TABLE ${db}.pick (v Int32) ENGINE = MergeTree ORDER BY v`);
            await raw(page, cid, `INSERT INTO ${db}.pick VALUES (7)`);
            // An unqualified name only resolves when the session was switched to the database.
            expect(Number(await raw(page, cid, "SELECT v FROM pick", { database: db }).then((r) => r.data[0].v))).toBe(7);
            expect(String(await scalar(page, cid, "SELECT currentDatabase()"))).toBe(meta.namespace);
          } finally {
            await raw(page, cid, `DROP DATABASE IF EXISTS ${db}`).catch(() => undefined);
          }
        });
      });
    }

    test("the editor shows the matching picker and selects the default namespace", async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const name = `${engine}-pick-${suffix}`;

      await withConnectionCleanup(page, name, async () => {
        await createHostSqlConnection(page, engine, name);
        const editor = new SqlEditorPage(page);
        await new ConnectionPage(page).waitForReady();
        await editor.open();
        await editor.expectContextVisibility({ database: !isSchema, schema: isSchema });
        await editor.expectSelectedContext(isSchema ? undefined : meta.namespace, isSchema ? meta.namespace : undefined);
      });
    });
  });
}
