import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { createHostSqlConnection, expectClientError, HOST_SQL, objectDetail, objectExecute, raw, rawError, scalar, treeNodes } from "./hostSql";
import { ObjectFormPage, ObjectTreePage } from "../pages";
import { withConnectionCleanup } from "./safeCleanup";

/** SQL Server objects beyond tables: sequences, safe trigger edits and the schema node returned after create. */
export function defineMssqlObjectsTests(): void {
  const ns = HOST_SQL.mssql.namespace;
  const idOf = (prefix: string, testInfo: TestInfo): string => `${prefix}_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 50);

  test.describe("SQL Server objects", () => {
    async function withConnection(page: Page, testInfo: TestInfo, body: (id: number) => Promise<void>): Promise<void> {
      const name = `mssql-obj-${uniqueTestSuffix(testInfo)}`;
      await withConnectionCleanup(page, name, async () => body(await createHostSqlConnection(page, "mssql", name)));
    }

    test.describe("sequences", () => {
      test("the tree lists a Sequences container with create, edit and drop actions", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (cid) => {
          const seq = idOf("sq", testInfo);
          await raw(page, cid, `CREATE SEQUENCE ${ns}.${seq} START WITH 5`);
          try {
            const containers = (await treeNodes(page, cid, ns)).children;
            const container = containers.find((c) => c.type === "sequenceContainer")!;
            expect(container.name).toBe("Sequences");
            expect(container.contextMenu.map((m) => m.title)).toContain("Create sequence");

            const items = (await treeNodes(page, cid, container.id)).children;
            const item = items.find((c) => c.name === seq)!;
            expect(item.contextMenu.map((m) => m.title)).toEqual(expect.arrayContaining(["Edit sequence", "Drop sequence"]));
          } finally {
            await raw(page, cid, `DROP SEQUENCE IF EXISTS ${ns}.${seq}`);
          }
        });
      });

      test("create, edit, rename and drop a sequence", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (cid) => {
          const seq = idOf("sq", testInfo);
          const renamed = `${seq}_r`.slice(0, 60);
          const info = async (name: string, col: string): Promise<string> =>
            String(await scalar(page, cid, `SELECT CAST(${col} AS NVARCHAR(40)) FROM sys.sequences WHERE schema_id = SCHEMA_ID('${ns}') AND name = '${name}'`));

          try {
            const preview = await objectExecute(page, cid, `${ns}.sequenceContainer`, "createSequence", { sequence: { new: { name: seq, start_value: "10", increment_by: "5" } } }, true);
            expect(preview.body.data!.queries![0]).toMatch(/CREATE SEQUENCE .*START WITH 10 INCREMENT BY 5/);
            expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM sys.sequences WHERE name = '${seq}'`))).toBe(0);

            const created = await objectExecute(page, cid, `${ns}.sequenceContainer`, "createSequence", {
              sequence: { new: { name: seq, start_value: "10", increment_by: "5", max_value: "1000", cycle: true } },
            });
            expect(created.status, JSON.stringify(created.body)).toBe(200);
            expect(created.body.data!.nodeId).toBe(`${ns}.${seq}`);
            expect(await info(seq, "increment")).toBe("5");
            expect(await info(seq, "maximum_value")).toBe("1000");
            expect(await scalar(page, cid, `SELECT NEXT VALUE FOR ${ns}.${seq}`)).toBe(10);

            const form = Object.fromEntries((await objectDetail(page, cid, `${ns}.${seq}`, "editSequence", "sequence")).general.map((f) => [f.id, f.value]));
            expect(form).toMatchObject({ name: seq, increment_by: "5", max_value: "1000", cycle: true });

            const old = { name: seq, start_value: "10", increment_by: "5", min_value: String(form.min_value), max_value: "1000", cycle: true };
            const edited = await objectExecute(page, cid, `${ns}.${seq}`, "editSequence", {
              sequence: { old, new: { ...old, name: renamed, increment_by: "2", cycle: false } },
            });
            expect(edited.status, JSON.stringify(edited.body)).toBe(200);
            expect(await info(renamed, "increment")).toBe("2");
            expect(await info(renamed, "is_cycling")).toBe("0");
            expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM sys.sequences WHERE name = '${seq}'`))).toBe(0);

            const dropped = await objectExecute(page, cid, `${ns}.${renamed}`, "dropSequence", {});
            expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
            expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM sys.sequences WHERE name = '${renamed}'`))).toBe(0);
          } finally {
            await raw(page, cid, `DROP SEQUENCE IF EXISTS ${ns}.${seq}`);
            await raw(page, cid, `DROP SEQUENCE IF EXISTS ${ns}.${renamed}`);
          }
        });
      });

      test("create a sequence through the Object Form", async ({ page }, testInfo) => {
        const connection = `mssql-obj-ui-${uniqueTestSuffix(testInfo)}`;
        const seq = idOf("sq", testInfo);
        await withConnectionCleanup(page, connection, async () => {
          const cid = await createHostSqlConnection(page, "mssql", connection);
          const tree_ = new ObjectTreePage(page);
          const form = new ObjectFormPage(page);
          try {
            await tree_.expandPath([connection, ns]);
            await tree_.runTreeAction("Sequences", "Create sequence");
            await form.waitForReady();
            await form.activateWorkspaceTab("Create sequence");
            await form.waitForReady();

            await form.fillGeneralField("name", seq);
            await form.fillGeneralField("start_value", "100");
            await form.fillGeneralField("increment_by", "10");

            await form.save();
            await form.assertPreviewContains(/CREATE SEQUENCE/);
            await form.assertPreviewContains(/START WITH 100 INCREMENT BY 10/);
            await form.confirmExecute();

            await expect.poll(async () => Number(await scalar(page, cid, `SELECT COUNT(*) FROM sys.sequences WHERE name = '${seq}'`))).toBe(1);
          } finally {
            await raw(page, cid, `DROP SEQUENCE IF EXISTS ${ns}.${seq}`);
          }
        });
      });

      test("invalid sequence definitions are refused", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (cid) => {
          const create = (data: Record<string, unknown>) =>
            objectExecute(page, cid, `${ns}.sequenceContainer`, "createSequence", { sequence: { new: data } });

          expectClientError(await create({ name: "1bad" }), /sequence name/i);
          expectClientError(await create({ name: idOf("sq", testInfo), start_value: "abc" }), /whole number/i);
          expectClientError(await create({ name: idOf("sq", testInfo), increment_by: "0" }), /cannot be 0/i);
          expectClientError(await create({ name: "x; DROP TABLE y" }), /sequence name/i);
        });
      });
    });

    test.describe("triggers", () => {
      const edit = (page: Page, cid: number, table: string, tabs: Record<string, unknown>) =>
        objectExecute(page, cid, `${ns}.${table}`, "editTable", tabs);
      const body = (table: string, n: number): string => `UPDATE ${table} SET b = ${n} WHERE id IN (SELECT id FROM inserted)`;

      test("a failed trigger edit keeps the old trigger; GO lines are refused", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (cid) => {
          const t = idOf("tg", testInfo);
          const tr = `tr_${t}`.slice(0, 60);
          await raw(page, cid, `CREATE TABLE ${ns}.${t} (id INT NOT NULL PRIMARY KEY, a INT, b INT)`);
          try {
            const trigger = (data: Record<string, string>) => ({ name: tr, timing: "AFTER", event: "INSERT", ...data });
            const added = await edit(page, cid, t, { table_triggers: { columns: [{ new: trigger({ body: body(t, 1) }), added: true }] } });
            expect(added.status, JSON.stringify(added.body)).toBe(200);

            const changed = await edit(page, cid, t, { table_triggers: { columns: [{ old: trigger({ body: body(t, 1) }), new: trigger({ body: body(t, 2) }) }] } });
            expect(changed.status, JSON.stringify(changed.body)).toBe(200);
            const previewRes = await objectExecute(
              page,
              cid,
              `${ns}.${t}`,
              "editTable",
              { table_triggers: { columns: [{ old: trigger({ body: body(t, 2) }), new: trigger({ body: body(t, 3) }) }] } },
              true,
            );
            const sql = (previewRes.body.data?.queries ?? []).join("\n");
            expect(sql).toMatch(/CREATE OR ALTER TRIGGER/);
            expect(sql).not.toMatch(/DROP TRIGGER/);

            // A body that does not compile must leave the working trigger in place.
            const broken = await edit(page, cid, t, {
              table_triggers: { columns: [{ old: trigger({ body: body(t, 2) }), new: trigger({ body: "THIS IS NOT T-SQL" }) }] },
            });
            expect(broken.status).toBeGreaterThanOrEqual(400);
            expect(await rawError(page, cid, `INSERT INTO ${ns}.${t} (id, a) VALUES (1, 1)`)).toBeNull();
            expect(Number(await scalar(page, cid, `SELECT b FROM ${ns}.${t} WHERE id = 1`))).toBe(2);

            const batch = await edit(page, cid, t, {
              table_triggers: { columns: [{ old: trigger({ body: body(t, 2) }), new: trigger({ body: `${body(t, 9)}\nGO\nSELECT 1` }) }] },
            });
            expectClientError(batch, /GO lines/i);
          } finally {
            await raw(page, cid, `DROP TABLE IF EXISTS ${ns}.${t}`);
          }
        });
      });
    });

    test("creating a schema returns its node so the tree can open it", async ({ page }, testInfo) => {
      await withConnection(page, testInfo, async (cid) => {
        const schema = idOf("sc", testInfo);
        const res = await objectExecute(page, cid, `${cid}@database`, "createSchema", { schema: { new: { nspname: schema } } });
        try {
          expect(res.status, JSON.stringify(res.body)).toBe(200);
          expect(res.body.data!.nodeId).toBe(schema);
        } finally {
          await raw(page, cid, `DROP SCHEMA IF EXISTS ${schema}`);
        }
      });
    });
  });
}
