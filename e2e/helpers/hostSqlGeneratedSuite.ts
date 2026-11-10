import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { HostSqlEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { ObjectFormPage, ObjectTreePage } from "../pages";
import { createHostSqlConnection, expectClientError, HOST_SQL, objectDetail, objectExecute, raw, rawError, run, scalar } from "./hostSql";
import { withConnectionCleanup } from "./safeCleanup";

/**
 * SQL Server computed and ClickHouse MATERIALIZED columns in the Object Form: the "Is generated" checkbox turns the
 * Default field into the expression the server computes the column from.
 */
export function defineHostSqlGeneratedColumnTests(engine: HostSqlEngine): void {
  const meta = HOST_SQL[engine];
  const ns = meta.namespace;
  const intType = engine === "mssql" ? "int" : "Int32";
  const tableOf = (testInfo: TestInfo): string => `e2e_gc_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 50);
  const col = (name: string, extra: Record<string, unknown> = {}) => ({ column_name: name, data_type: intType, ...extra });
  const id = (t: string): string => `${ns}.${t}`;

  test.describe(`${meta.label} generated columns in the Object Form`, () => {
    async function withTable(page: Page, testInfo: TestInfo, body: (cid: number, t: string, connection: string) => Promise<void>): Promise<void> {
      const connection = `${engine}-gc-${uniqueTestSuffix(testInfo)}`;
      const t = tableOf(testInfo);
      await withConnectionCleanup(page, connection, async () => {
        const cid = await createHostSqlConnection(page, engine, connection);
        try {
          await body(cid, t, connection);
        } finally {
          await objectExecute(page, cid, id(t), "dropTable", {});
        }
      });
    }

    const create = (page: Page, cid: number, t: string, cols: Record<string, unknown>[]) =>
      objectExecute(page, cid, `${ns}.tableContainer`, "createTable", {
        general: { new: { relname: t } },
        table_columns: { columns: cols.map((c) => ({ new: c, added: true })) },
      });

    test("create a table with a generated column; the server computes it and the grid keeps it read-only", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (cid, t) => {
        const preview = await objectExecute(
          page,
          cid,
          `${ns}.tableContainer`,
          "createTable",
          { general: { new: { relname: t } }, table_columns: { columns: [{ new: col("amount", { primary: true }), added: true }, { new: col("doubled", { is_generated: true, column_default: "amount * 2" }), added: true }] } },
          true,
        );
        expect((preview.body.data?.queries ?? []).join("\n")).toMatch(engine === "mssql" ? /\[doubled\] AS \(amount \* 2\)/ : /`doubled` Int32 MATERIALIZED amount \* 2/);

        const res = await create(page, cid, t, [col("amount", { primary: true, not_null: true }), col("doubled", { is_generated: true, column_default: "amount * 2" })]);
        expect(res.status, JSON.stringify(res.body)).toBe(200);

        await raw(page, cid, `INSERT INTO ${ns}.${t} (amount) VALUES (21)`);
        expect(Number(await scalar(page, cid, `SELECT doubled FROM ${ns}.${t}`))).toBe(42);

        const rows = (await objectDetail(page, cid, id(t), "editTable", "table_columns")).data;
        const doubled = rows.find((r) => r.column_name === "doubled")!;
        expect(doubled.is_generated).toBe(true);
        expect(String(doubled.column_default).replace(/[()\[\]`\s]/g, "")).toBe("amount*2");
        expect(rows.find((r) => r.column_name === "amount")!.is_generated).toBe(false);

        const grid = (await run(page, cid, id(t), { limit: 1 })).data.columns;
        expect(grid.find((c) => c.name === "doubled")!.editable).toBe(false);
        expect(grid.find((c) => c.name === "amount")!.editable).toBe(true);
        expect(await rawError(page, cid, `INSERT INTO ${ns}.${t} (amount, doubled) VALUES (1, 99)`)).toBeTruthy();
      });
    });

    test("a generated column needs an expression, and only one expression", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (cid, t) => {
        expectClientError(await create(page, cid, t, [col("a"), col("g", { is_generated: true })]), /needs an expression/i);
        expectClientError(await create(page, cid, t, [col("a"), col("g", { is_generated: true, column_default: "a; DROP TABLE x" })]), /single expression/i);
        expect(Number(await scalar(page, cid, engine === "mssql" ? `SELECT COUNT(*) FROM sys.tables WHERE name = '${t}'` : `SELECT count() FROM system.tables WHERE database = '${ns}' AND name = '${t}'`))).toBe(0);
      });
    });

    test("edit: add a generated column and change its expression", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (cid, t) => {
        await create(page, cid, t, [col("amount", { primary: true, not_null: true })]);
        await raw(page, cid, `INSERT INTO ${ns}.${t} (amount) VALUES (10)`);

        const added = await objectExecute(page, cid, id(t), "editTable", {
          table_columns: { columns: [{ new: col("calc", { is_generated: true, column_default: "amount + 1" }), added: true }] },
        });
        expect(added.status, JSON.stringify(added.body)).toBe(200);
        expect(Number(await scalar(page, cid, `SELECT calc FROM ${ns}.${t}`))).toBe(11);

        const old = col("calc", { is_generated: true, column_default: "amount + 1" });
        const changed = await objectExecute(page, cid, id(t), "editTable", {
          table_columns: { columns: [{ old, new: { ...old, column_default: "amount * 3" } }] },
        });
        expect(changed.status, JSON.stringify(changed.body)).toBe(200);
        expect(Number(await scalar(page, cid, `SELECT calc FROM ${ns}.${t}`))).toBe(30);
      });
    });

    if (engine === "mssql") {
      test("a plain column cannot become computed, or back", async ({ page }, testInfo) => {
        await withTable(page, testInfo, async (cid, t) => {
          await create(page, cid, t, [col("amount", { primary: true, not_null: true }), col("plain")]);
          const old = col("plain");
          expectClientError(
            await objectExecute(page, cid, id(t), "editTable", { table_columns: { columns: [{ old, new: { ...old, is_generated: true, column_default: "amount" } }] } }),
            /computed column/i,
          );
        });
      });
    }

    test("add a generated column through the Object Form", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (cid, t, connection) => {
        await create(page, cid, t, [col("amount", { primary: true, not_null: true })]);
        const tree = new ObjectTreePage(page);
        const form = new ObjectFormPage(page);

        await tree.expandPath([connection, ns]);
        await tree.refreshExpandNode("Tables");
        await tree.expectNodeVisible(t);
        await tree.runTreeAction(t, "Edit table");
        await form.waitForReady();
        await form.ensureWorkspaceTab(t, "Edit table");
        await form.waitForReady();
        await form.selectTab("table_columns");

        const row = await form.addArrayRow("column_name");
        await form.fillArrayCell(row, "column_name", "doubled");
        if (engine === "mssql") await form.selectArrayCellOption(row, "data_type", "int");
        else await form.fillArrayCell(row, "data_type", "Int32");
        await form.toggleArrayCheckbox(row, "is_generated", true);
        await form.fillArrayCell(row, "column_default", "amount * 2");
        await form.save();
        await form.assertPreviewContains(engine === "mssql" ? /ADD \[doubled\] AS \(amount \* 2\)/ : /ADD COLUMN `doubled` Int32 MATERIALIZED amount \* 2/);
        await form.confirmExecute();

        await raw(page, cid, `INSERT INTO ${ns}.${t} (amount) VALUES (4)`);
        await expect.poll(async () => Number(await scalar(page, cid, `SELECT doubled FROM ${ns}.${t}`))).toBe(8);
      });
    });
  });
}
