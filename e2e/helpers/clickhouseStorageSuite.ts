import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { createHostSqlConnection, expectClientError, HOST_SQL, objectDetail, objectExecute, objectTabs, raw, scalar } from "./hostSql";
import { ObjectFormPage, ObjectTreePage } from "../pages";
import { withConnectionCleanup } from "./safeCleanup";

/** ClickHouse Storage tab: engine, ORDER BY, PARTITION BY, TTL and SETTINGS on create, TTL and SETTINGS on edit. */
export function defineClickhouseStorageTests(): void {
  const ns = HOST_SQL.clickhouse.namespace;
  const node = (t: string): string => `${ns}.${t}`;
  const tableOf = (suffix: string): string => `e2e_st_${suffix}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 60);
  /** The Storage tab is a one-row array form, like the Columns tab. */
  const storage = (next: Record<string, string>, old?: Record<string, string>) => ({
    table_storage: { columns: [{ new: next, ...(old ? { old } : { added: true }) }] },
  });
  const col = (name: string, type: string) => ({ new: { column_name: name, data_type: type }, added: true });

  test.describe("ClickHouse storage options", () => {
    async function withTable(
      page: import("@playwright/test").Page,
      testInfo: import("@playwright/test").TestInfo,
      body: (id: number, table: string, connection: string) => Promise<void>,
    ): Promise<void> {
      const name = `clickhouse-st-${uniqueTestSuffix(testInfo)}`;
      const table = tableOf(uniqueTestSuffix(testInfo));
      await withConnectionCleanup(page, name, async () => {
        const id = await createHostSqlConnection(page, "clickhouse", name);
        try {
          await body(id, table, name);
        } finally {
          await objectExecute(page, id, node(table), "dropTable", {});
        }
      });
    }

    const info = async (page: import("@playwright/test").Page, id: number, table: string, column: string): Promise<string> =>
      String(await scalar(page, id, `SELECT ${column} FROM system.tables WHERE database = '${ns}' AND name = '${table}'`));

    test("the Storage tab is offered on create and edit", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, table) => {
        expect(await objectTabs(page, id, `${ns}.tableContainer`, "createTable")).toContain("table_storage");
        await objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
          general: { new: { relname: table } },
          table_columns: { columns: [col("id", "UInt32")] },
        });
        expect(await objectTabs(page, id, node(table), "editTable")).toContain("table_storage");
      });
    });

    test("create a table from the Storage tab of the Object Form", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, table, connection) => {
        const tree_ = new ObjectTreePage(page);
        const form = new ObjectFormPage(page);
        await tree_.expandPath([connection, ns]);
        await tree_.runTreeAction("Tables", "Create table");
        await form.waitForReady();
        await form.activateWorkspaceTab("Create table");
        await form.waitForReady();

        await form.fillGeneralField("relname", table);
        await form.selectTab("table_columns");
        await form.addRow();
        await form.fillArrayCell(0, "column_name", "id");
        await form.fillArrayCell(0, "data_type", "UInt32");
        await form.toggleArrayCheckbox(0, "primary", true);

        await form.selectTab("table_storage");
        await form.selectArrayCellOption(0, "engine", "ReplacingMergeTree");
        await form.fillArrayCell(0, "settings", "index_granularity = 4096");

        await form.save();
        await form.assertPreviewContains(/ENGINE = ReplacingMergeTree/);
        await form.assertPreviewContains(/SETTINGS index_granularity = 4096/);
        await form.confirmExecute();

        await expect.poll(() => info(page, id, table, "engine")).toBe("ReplacingMergeTree");
        expect(await info(page, id, table, "sorting_key")).toBe("id");
      });
    });

    test("create with engine, ORDER BY, PARTITION BY, TTL and SETTINGS", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, table) => {
        const res = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
          general: { new: { relname: table } },
          table_columns: { columns: [col("id", "UInt32"), col("day", "Date"), col("label", "String")] },
          ...storage({
            engine: "ReplacingMergeTree",
            order_by: "(id, day)",
            partition_by: "toYYYYMM(day)",
            ttl: "day + INTERVAL 90 DAY",
            settings: "index_granularity = 4096",
          }),
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);

        expect(await info(page, id, table, "engine")).toBe("ReplacingMergeTree");
        expect(await info(page, id, table, "sorting_key")).toBe("id, day");
        expect(await info(page, id, table, "partition_key")).toBe("toYYYYMM(day)");
        expect(await info(page, id, table, "engine_full")).toMatch(/TTL day \+ toIntervalDay\(90\)/);
        expect(await info(page, id, table, "engine_full")).toMatch(/index_granularity = 4096/);

        const form = (await objectDetail(page, id, node(table), "editTable", "table_storage")).data[0];
        expect(form.engine).toBe("ReplacingMergeTree");
        expect(form.order_by).toBe("id, day");
        expect(form.partition_by).toBe("toYYYYMM(day)");
        expect(String(form.ttl)).toContain("toIntervalDay(90)");
        expect(String(form.settings)).toContain("index_granularity = 4096");
      });
    });

    test("without Storage values the sorting key still comes from the primary-key columns", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, table) => {
        const res = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
          general: { new: { relname: table } },
          table_columns: { columns: [{ new: { column_name: "a", data_type: "UInt32", primary: true }, added: true }, col("b", "String")] },
          ...storage({ engine: "MergeTree", order_by: "", partition_by: "", ttl: "", settings: "" }),
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(await info(page, id, table, "sorting_key")).toBe("a");
      });
    });

    test("TTL and SETTINGS can be changed and removed; ORDER BY and engine cannot", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, table) => {
        await objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
          general: { new: { relname: table } },
          table_columns: { columns: [col("id", "UInt32"), col("day", "Date")] },
          ...storage({ engine: "MergeTree", order_by: "id", ttl: "day + INTERVAL 30 DAY" }),
        });

        const old = { engine: "MergeTree", order_by: "id", partition_by: "", ttl: "day + toIntervalDay(30)", settings: "" };
        const edit = (next: Record<string, string>) => objectExecute(page, id, node(table), "editTable", storage({ ...old, ...next }, old));

        const preview = await objectExecute(page, id, node(table), "editTable", storage({ ...old, ttl: "day + INTERVAL 60 DAY" }, old), true);
        expect(JSON.stringify(preview.body)).toMatch(/MODIFY TTL/);
        expect(await info(page, id, table, "engine_full")).toMatch(/toIntervalDay\(30\)/);

        const changed = await edit({ ttl: "day + INTERVAL 60 DAY", settings: "ttl_only_drop_parts = 1" });
        expect(changed.status, JSON.stringify(changed.body)).toBe(200);
        const full = await info(page, id, table, "engine_full");
        expect(full).toMatch(/toIntervalDay\(60\)/);
        expect(full).toMatch(/ttl_only_drop_parts = 1/);

        const removed = await objectExecute(
          page,
          id,
          node(table),
          "editTable",
          storage({ ...old, ttl: "", settings: "" }, { ...old, ttl: "day + toIntervalDay(60)", settings: "ttl_only_drop_parts = 1" }),
        );
        expect(removed.status, JSON.stringify(removed.body)).toBe(200);
        expect(await info(page, id, table, "engine_full")).not.toMatch(/TTL/);

        expectClientError(await edit({ order_by: "id, day" }), /cannot be changed/i);
        expectClientError(await edit({ engine: "ReplacingMergeTree" }), /cannot be changed/i);
        expect(await info(page, id, table, "sorting_key")).toBe("id");
      });
    });

    test("invalid storage values are refused", async ({ page }, testInfo) => {
      await withTable(page, testInfo, async (id, table) => {
        const create = (opts: Record<string, string>) =>
          objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
            general: { new: { relname: table } },
            table_columns: { columns: [col("id", "UInt32")] },
            ...storage(opts),
          });

        expectClientError(await create({ engine: "Nope" }), /unsupported engine/i);
        expectClientError(await create({ engine: "MergeTree", order_by: "id; DROP TABLE x" }), /single expression/i);
        expectClientError(await create({ engine: "Memory", order_by: "id" }), /takes no ORDER BY/i);
        expectClientError(await create({ engine: "MergeTree", settings: "index_granularity" }), /SETTINGS must look like/i);
        expect(Number(await scalar(page, id, `SELECT count() FROM system.tables WHERE database = '${ns}' AND name = '${table}'`))).toBe(0);
        await raw(page, id, "SELECT 1");
      });
    });
  });
}
