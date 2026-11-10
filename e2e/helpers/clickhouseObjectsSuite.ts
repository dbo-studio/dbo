import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { createHostSqlConnection, expectClientError, HOST_SQL, objectDetail, objectExecute, raw, scalar, treeNodes } from "./hostSql";
import { ObjectTreePage, SqlEditorPage } from "../pages";
import { withConnectionCleanup } from "./safeCleanup";

/** ClickHouse objects beyond tables: materialized views as their own tree container. */
export function defineClickhouseObjectsTests(): void {
  const ns = HOST_SQL.clickhouse.namespace;
  const idOf = (prefix: string, testInfo: TestInfo): string => `${prefix}_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 50);

  test.describe("ClickHouse materialized views", () => {
    async function withSource(page: Page, testInfo: TestInfo, body: (cid: number, source: string, target: string) => Promise<void>): Promise<void> {
      const name = `clickhouse-mv-${uniqueTestSuffix(testInfo)}`;
      await withConnectionCleanup(page, name, async () => {
        const cid = await createHostSqlConnection(page, "clickhouse", name);
        const source = idOf("mvs", testInfo);
        const target = idOf("mvt", testInfo);
        await raw(page, cid, `CREATE TABLE ${ns}.${source} (id UInt32, v Int32) ENGINE = MergeTree ORDER BY id`);
        await raw(page, cid, `CREATE TABLE ${ns}.${target} (id UInt32, total Int64) ENGINE = SummingMergeTree ORDER BY id`);
        try {
          await body(cid, source, target);
        } finally {
          await raw(page, cid, `DROP TABLE IF EXISTS ${ns}.${source}`);
          await raw(page, cid, `DROP TABLE IF EXISTS ${ns}.${target}`);
        }
      });
    }

    const mv = (data: Record<string, string>, old?: Record<string, string>) => ({
      materialized_view: { new: data, ...(old ? { old } : {}) },
    });
    const kinds = async (page: Page, cid: number): Promise<string> =>
      String(await scalar(page, cid, `SELECT engine FROM system.tables WHERE database = '${ns}' AND name = '${currentMv}'`));
    let currentMv = "";

    test("materialized views have their own container, apart from Views", async ({ page }, testInfo) => {
      await withSource(page, testInfo, async (cid, source, target) => {
        const view = idOf("mv", testInfo);
        const plain = idOf("pv", testInfo);
        await raw(page, cid, `CREATE MATERIALIZED VIEW ${ns}.${view} TO ${ns}.${target} AS SELECT id, v AS total FROM ${ns}.${source}`);
        await raw(page, cid, `CREATE VIEW ${ns}.${plain} AS SELECT id FROM ${ns}.${source}`);
        try {
          const children = (await treeNodes(page, cid, ns)).children;
          const container = children.find((c) => c.type === "materializedViewContainer")!;
          expect(container.name).toBe("Materialized views");
          expect(container.contextMenu.map((m) => m.title)).toContain("Create materialized view");

          expect((await treeNodes(page, cid, container.id)).children.map((c) => c.name)).toEqual([view]);
          const views = (await treeNodes(page, cid, children.find((c) => c.type === "viewContainer")!.id)).children.map((c) => c.name);
          expect(views).toContain(plain);
          expect(views).not.toContain(view);

          const node = (await treeNodes(page, cid, container.id)).children[0];
          expect(node.contextMenu.map((m) => m.title)).toEqual(expect.arrayContaining(["Edit materialized view", "Drop materialized view"]));
        } finally {
          await raw(page, cid, `DROP VIEW IF EXISTS ${ns}.${view}`);
          await raw(page, cid, `DROP VIEW IF EXISTS ${ns}.${plain}`);
        }
      });
    });

    test("create with a target table, edit its query and drop it; data flows through", async ({ page }, testInfo) => {
      await withSource(page, testInfo, async (cid, source, target) => {
        const view = idOf("mv", testInfo);
        currentMv = view;
        try {
          const preview = await objectExecute(page, cid, `${ns}.materializedViewContainer`, "createMaterializedView", mv({ name: view, target, query: `SELECT id, v AS total FROM ${ns}.${source}` }), true);
          expect(preview.body.data!.queries![0]).toMatch(/CREATE MATERIALIZED VIEW .* TO .*SELECT id, v AS total/);

          const created = await objectExecute(page, cid, `${ns}.materializedViewContainer`, "createMaterializedView", mv({ name: view, target, query: `SELECT id, v AS total FROM ${ns}.${source}` }));
          expect(created.status, JSON.stringify(created.body)).toBe(200);
          expect(created.body.data!.nodeId).toBe(`${ns}.${view}`);
          expect(await kinds(page, cid)).toBe("MaterializedView");

          await raw(page, cid, `INSERT INTO ${ns}.${source} VALUES (1, 5)`);
          expect(Number(await scalar(page, cid, `SELECT sum(total) FROM ${ns}.${target}`))).toBe(5);

          const form = Object.fromEntries((await objectDetail(page, cid, `${ns}.${view}`, "editMaterializedView", "materialized_view")).general.map((f) => [f.id, f.value]));
          expect(form.name).toBe(view);
          expect(String(form.target)).toContain(target);
          expect(String(form.query)).toContain("v AS total");

          const old = { name: view, target: String(form.target), order_by: "", query: String(form.query) };
          const edited = await objectExecute(page, cid, `${ns}.${view}`, "editMaterializedView", mv({ ...old, query: `SELECT id, v * 2 AS total FROM ${ns}.${source}` }, old));
          expect(edited.status, JSON.stringify(edited.body)).toBe(200);
          await raw(page, cid, `INSERT INTO ${ns}.${source} VALUES (2, 5)`);
          expect(Number(await scalar(page, cid, `SELECT sum(total) FROM ${ns}.${target} WHERE id = 2`))).toBe(10);

          const dropped = await objectExecute(page, cid, `${ns}.${view}`, "dropMaterializedView", {});
          expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
          expect(Number(await scalar(page, cid, `SELECT count() FROM system.tables WHERE database = '${ns}' AND name = '${view}'`))).toBe(0);
          // The target table and its rows survive the view.
          expect(Number(await scalar(page, cid, `SELECT count() FROM ${ns}.${target}`))).toBeGreaterThan(0);
        } finally {
          await raw(page, cid, `DROP VIEW IF EXISTS ${ns}.${view}`);
        }
      });
    });

    test("a view with an inner table is created, but its query cannot be changed in place", async ({ page }, testInfo) => {
      await withSource(page, testInfo, async (cid, source) => {
        const view = idOf("mv", testInfo);
        currentMv = view;
        try {
          const query = `SELECT id, sum(v) AS total FROM ${ns}.${source} GROUP BY id`;
          const created = await objectExecute(page, cid, `${ns}.materializedViewContainer`, "createMaterializedView", mv({ name: view, order_by: "id", query }));
          expect(created.status, JSON.stringify(created.body)).toBe(200);
          expect(String(await scalar(page, cid, `SELECT create_table_query FROM system.tables WHERE database = '${ns}' AND name = '${view}'`))).toMatch(/ORDER BY id/);
          const form = Object.fromEntries((await objectDetail(page, cid, `${ns}.${view}`, "editMaterializedView", "materialized_view")).general.map((f) => [f.id, f.value]));
          expect(form.order_by).toBe("id");
          expect(form.target).toBe("");

          const old = { name: view, target: "", order_by: "id", query };
          expectClientError(await objectExecute(page, cid, `${ns}.${view}`, "editMaterializedView", mv({ ...old, query: `SELECT id, max(v) AS total FROM ${ns}.${source} GROUP BY id` }, old)), /inner table/i);
          expect(await kinds(page, cid)).toBe("MaterializedView");

          const renamed = `${view}_r`.slice(0, 55);
          const rename = await objectExecute(page, cid, `${ns}.${view}`, "editMaterializedView", mv({ ...old, name: renamed }, old));
          expect(rename.status, JSON.stringify(rename.body)).toBe(200);
          expect(Number(await scalar(page, cid, `SELECT count() FROM system.tables WHERE database = '${ns}' AND name = '${renamed}'`))).toBe(1);
          await raw(page, cid, `DROP VIEW IF EXISTS ${ns}.${renamed}`);
        } finally {
          await raw(page, cid, `DROP VIEW IF EXISTS ${ns}.${view}`);
        }
      });
    });

    test("invalid materialized view definitions are refused", async ({ page }, testInfo) => {
      await withSource(page, testInfo, async (cid, source) => {
        const create = (data: Record<string, string>) => objectExecute(page, cid, `${ns}.materializedViewContainer`, "createMaterializedView", mv(data));

        expectClientError(await create({ name: "1bad", query: "SELECT 1" }), /view name/i);
        expectClientError(await create({ name: idOf("mv", testInfo), target: "a b", query: "SELECT 1" }), /target must be/i);
        expectClientError(await create({ name: idOf("mv", testInfo), order_by: "id; DROP TABLE x", query: `SELECT id FROM ${ns}.${source}` }), /single expression/i);
        expectClientError(await create({ name: idOf("mv", testInfo) }), /query/i);
      });
    });
  });

  test.describe("ClickHouse server insights", () => {
    test("the database menu offers system-table views that run in the editor", async ({ page }, testInfo) => {
      const connection = `clickhouse-ins-${uniqueTestSuffix(testInfo)}`;
      await withConnectionCleanup(page, connection, async () => {
        const cid = await createHostSqlConnection(page, "clickhouse", connection);

        const database = (await treeNodes(page, cid, "")).children.find((c) => c.id === ns)!;
        expect(database.contextMenu.map((m) => m.title)).toEqual(expect.arrayContaining(["Running queries", "Table parts", "Merges", "Mutations"]));

        const tree_ = new ObjectTreePage(page);
        const editor = new SqlEditorPage(page);
        await tree_.expandPath([connection]);
        await tree_.runTreeAction(ns, "Table parts");

        await expect(editor.editor).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole("columnheader", { name: /partition/i })).toBeVisible({ timeout: 20000 });
        expect(await editor.getMonacoValue()).toMatch(/system\.parts/);
        expect(Number(await scalar(page, cid, "SELECT count() FROM system.parts WHERE active"))).toBeGreaterThan(0);
      });
    });
  });
}
