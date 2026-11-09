import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { HostSqlEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { startJob, waitForJob } from "./backupApi";
import { createTableSql } from "./ddl";
import { createHostSqlConnection, HOST_SQL, objectDetail, objectExecute, raw, rawError, scalar, treeNodes } from "./hostSql";
import { withConnectionCleanup } from "./safeCleanup";

/**
 * SQL Server / ClickHouse: export, import, schema dump, query errors and Safe Mode through the API.
 * Both run on the generic driver but with their own dialect, so each engine needs its own run.
 */
export function defineHostSqlExtraTests(engine: HostSqlEngine): void {
  const meta = HOST_SQL[engine];
  // SQL Server scopes by schema, ClickHouse by database.
  const scope = engine === "mssql" ? { schema: meta.namespace } : { database: meta.namespace };
  const id = (v: string): string => `e2e_${v.replace(/\W/g, "_")}`;

  test.describe(`${meta.label} export, import and guards`, () => {
    async function withTables(
      page: Page,
      testInfo: TestInfo,
      body: (c: { id: number; t: string; name: string }) => Promise<void>,
    ): Promise<void> {
      const suffix = uniqueTestSuffix(testInfo);
      const name = `${engine}-x-${suffix}`;
      const t = id(`t_${suffix}`).slice(0, 50);
      await withConnectionCleanup(page, name, async () => {
        const cid = await createHostSqlConnection(page, engine, name);
        await raw(page, cid, `DROP TABLE IF EXISTS ${t}`);
        await raw(page, cid, createTableSql(engine, t, ["id INT NOT NULL", "name VARCHAR(50)"], "id"));
        await raw(page, cid, `INSERT INTO ${t} (id, name) VALUES (1, 'one'), (2, 'two'), (3, 'three')`);
        try {
          await body({ id: cid, t, name });
        } finally {
          await raw(page, cid, `DROP TABLE IF EXISTS ${t}`).catch(() => undefined);
        }
      });
    }

    async function exportBytes(page: Page, data: Record<string, unknown>): Promise<Buffer> {
      const jobId = await startJob(page, "/api/export", data);
      const job = await waitForJob(page, jobId);
      expect(job.status, job.error).toBe("completed");
      const res = await page.request.get(`/api/jobs/${jobId}/result`);
      expect(res.ok()).toBeTruthy();
      return res.body();
    }

    test("export a table as CSV, JSON and SQL", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const base = { connectionId: cid, table: t, query: `SELECT * FROM ${t} ORDER BY id`, ...scope };
        const csv = (await exportBytes(page, { ...base, format: "csv" })).toString("utf8").trim().split(/\r?\n/);
        expect(csv).toHaveLength(4);
        expect(csv[0]).toMatch(/id/);
        expect(csv.join("\n")).toContain("three");

        const json = JSON.parse((await exportBytes(page, { ...base, format: "json" })).toString("utf8")) as unknown[];
        expect(json).toHaveLength(3);

        const sql = (await exportBytes(page, { ...base, format: "sql" })).toString("utf8");
        expect(sql).toContain("'two'");
      });
    });

    test("table scope exports the schema DDL and the rows", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const both = (
          await exportBytes(page, { connectionId: cid, ...scope, scope: "tables", tables: [t], content: "both", format: "sql" })
        ).toString("utf8");
        expect(both).toMatch(new RegExp(`CREATE TABLE[^;]*${t}`, "i"));
        expect(both).toContain("'three'");

        const schemaOnly = (
          await exportBytes(page, { connectionId: cid, ...scope, scope: "tables", tables: [t], content: "schema", format: "sql" })
        ).toString("utf8");
        expect(schemaOnly).toMatch(new RegExp(`CREATE TABLE[^;]*${t}`, "i"));
        expect(schemaOnly).not.toContain("'three'");
      });
    });

    test("database scope includes the table", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const sql = (
          await exportBytes(page, { connectionId: cid, ...scope, scope: "database", content: "both", format: "sql" })
        ).toString("utf8");
        expect(sql).toContain(t);
      });
    });

    test("invalid export combinations are rejected", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const post = (data: Record<string, unknown>) => page.request.post("/api/export", { data });
        expect((await post({ connectionId: cid, ...scope, scope: "tables", tables: [t], content: "schema", format: "csv" })).status()).toBe(422);
        expect((await post({ connectionId: cid, ...scope, scope: "tables", format: "sql" })).status()).toBe(422);
        expect((await post({ connectionId: cid, table: t, query: `SELECT * FROM ${t}`, format: "xml" })).status()).toBe(422);
      });
    });

    test("import CSV appends rows and honours the column mapping", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const res = await page.request.post("/api/import", {
          multipart: {
            connectionId: String(cid),
            table: t,
            format: "csv",
            delimiter: ",",
            mapping: JSON.stringify({ num: "id", label: "name" }),
            data: { name: "rows.csv", mimeType: "text/csv", buffer: Buffer.from("num,label\n10,ten\n11,eleven\n") },
          },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const job = await waitForJob(page, ((await res.json()) as { data: { jobId: number } }).data.jobId);
        expect(job.status, job.error).toBe("completed");
        expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM ${t}`))).toBe(5);
        expect(await scalar(page, cid, `SELECT name FROM ${t} WHERE id = 11`)).toBe("eleven");
      });
    });

    test("import JSON appends rows", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const res = await page.request.post("/api/import", {
          multipart: {
            connectionId: String(cid),
            table: t,
            format: "json",
            data: { name: "rows.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify([{ id: 20, name: "twenty" }])) },
          },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const job = await waitForJob(page, ((await res.json()) as { data: { jobId: number } }).data.jobId);
        expect(job.status, job.error).toBe("completed");
        expect(await scalar(page, cid, `SELECT name FROM ${t} WHERE id = 20`)).toBe("twenty");
      });
    });

    test("import into a table that does not exist fails the job and writes nothing", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid }) => {
        const res = await page.request.post("/api/import", {
          multipart: {
            connectionId: String(cid),
            table: "e2e_no_such_table",
            format: "csv",
            data: { name: "r.csv", mimeType: "text/csv", buffer: Buffer.from("id,name\n1,a\n") },
          },
        });
        if (res.ok()) {
          const job = await waitForJob(page, ((await res.json()) as { data: { jobId: number } }).data.jobId);
          expect(job.status).toBe("failed");
        } else {
          expect(res.status()).toBeGreaterThanOrEqual(400);
        }
      });
    });

    test("import preview parses without writing", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const res = await page.request.post("/api/import/preview", {
          multipart: { format: "csv", delimiter: ",", data: { name: "p.csv", mimeType: "text/csv", buffer: Buffer.from("a,b\n1,x\n2,y\n") } },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = ((await res.json()) as { data: { columns: string[]; totalRows: number } }).data;
        expect(body.columns).toEqual(["a", "b"]);
        expect(body.totalRows).toBe(2);
        expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM ${t}`))).toBe(3);
      });
    });

    test("DDL through the editor: add a column, rename the table, drop it", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        if (engine === "mssql") {
          await raw(page, cid, `ALTER TABLE ${t} ADD note VARCHAR(20) NULL`);
          await raw(page, cid, `EXEC sp_rename '${t}', '${t}_r'`);
          expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM ${t}_r`))).toBe(3);
          await raw(page, cid, `EXEC sp_rename '${t}_r', '${t}'`);
        } else {
          await raw(page, cid, `ALTER TABLE ${t} ADD COLUMN note String DEFAULT ''`);
          await raw(page, cid, `RENAME TABLE ${t} TO ${t}_r`);
          expect(Number(await scalar(page, cid, `SELECT count() FROM ${t}_r`))).toBe(3);
          await raw(page, cid, `RENAME TABLE ${t}_r TO ${t}`);
        }
        expect(await rawError(page, cid, `SELECT note FROM ${t}`)).toBeNull();
      });
    });

    test("errors come back as messages: unknown table, unknown column, bad syntax", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        for (const q of ["SELECT * FROM e2e_no_such_table", `SELECT nope FROM ${t}`, "SELEC 1"]) {
          expect(await rawError(page, cid, q), q).toBeTruthy();
        }
      });
    });

    test("unicode, quotes and NULL survive an insert and a read", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        await raw(page, cid, `INSERT INTO ${t} (id, name) VALUES (50, ${engine === "mssql" ? "N" : ""}'日本語 "q" ''s'' 🚀')`);
        expect(await scalar(page, cid, `SELECT name FROM ${t} WHERE id = 50`)).toContain("日本語");
        await raw(page, cid, `INSERT INTO ${t} (id, name) VALUES (51, NULL)`);
        expect(await scalar(page, cid, `SELECT name FROM ${t} WHERE id = 51`)).toBeNull();
      });
    });

    // Object Form foreign keys: SQL Server takes composite keys; ClickHouse has none and must refuse with a reason.
    test("multi-column foreign key: created through the Object Form, read back, enforced", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const node = (n: string): string => `${meta.namespace}.${n}`;
        const parent = `${t}_p`.slice(0, 55);
        const child = `${t}_c`.slice(0, 55);
        const col = (name: string, type: string, extra: Record<string, unknown> = {}) => ({ new: { column_name: name, data_type: type, ...extra }, added: true });
        const create = (table: string, cols: ReturnType<typeof col>[], tabs: Record<string, unknown> = {}) =>
          objectExecute(page, cid, `${meta.namespace}.tableContainer`, "createTable", {
            general: { new: { relname: table } },
            table_columns: { columns: cols },
            ...tabs,
          });
        const fk = {
          table_foreign_keys: {
            columns: [
              { new: { constraint_name: `fk_${child}`.slice(0, 60), ref_columns: ["user_id", "org_id"], target_table: parent, target_columns: ["id", "org_id"] }, added: true },
            ],
          },
        };
        try {
          if (engine === "clickhouse") {
            expect((await create(parent, [col("id", "UInt32", { primary: true }), col("org_id", "UInt32")])).status).toBe(200);
            expect((await create(child, [col("user_id", "UInt32", { primary: true }), col("org_id", "UInt32")], fk)).status).toBeGreaterThanOrEqual(400);
            return;
          }
          expect((await create(parent, [col("id", "int", { primary: true, not_null: true }), col("org_id", "int", { primary: true, not_null: true })])).status).toBe(200);
          const made = await create(child, [col("id", "int", { primary: true, not_null: true }), col("user_id", "int", { not_null: true }), col("org_id", "int", { not_null: true })], fk);
          expect(made.status, JSON.stringify(made.body)).toBe(200);

          const fks = (await objectDetail(page, cid, node(child), "editTable", "table_foreign_keys")).data;
          expect(fks).toEqual([expect.objectContaining({ target_table: parent, ref_columns: ["user_id", "org_id"], target_columns: ["id", "org_id"] })]);

          await raw(page, cid, `INSERT INTO ${parent} (id, org_id) VALUES (1, 7)`);
          expect(await rawError(page, cid, `INSERT INTO ${child} (id, user_id, org_id) VALUES (1, 1, 7)`)).toBeNull();
          // Both columns together must match: (1, 8) exists in neither the pair nor the parent.
          expect(await rawError(page, cid, `INSERT INTO ${child} (id, user_id, org_id) VALUES (2, 1, 8)`)).toMatch(/FOREIGN KEY/i);
        } finally {
          for (const n of [child, parent]) await objectExecute(page, cid, node(n), "dropTable", {});
        }
      });
    });

    // SQL Server and ClickHouse have no native dump tool: DBO's built-in SQL dump is the backup and a
    // statement replay is the restore (service/job/processors/restore_processor.go).
    test("backup writes a built-in SQL dump and restore brings a dropped table back", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid }) => {
        const ns = `e2e_bk_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 40);
        const tbl = `${ns}.items`;
        const scopeOf = engine === "mssql" ? { schema: ns } : { database: ns };
        await raw(page, cid, engine === "mssql" ? `CREATE SCHEMA ${ns}` : `CREATE DATABASE ${ns}`);
        try {
          await raw(page, cid, createTableSql(engine, tbl, ["id INT NOT NULL", "name VARCHAR(50)"], "id"));
          await raw(page, cid, `INSERT INTO ${tbl} (id, name) VALUES (1, 'one'), (2, 'it''s two')`);

          const jobId = await startJob(page, "/api/backups", { connectionId: cid, note: "e2e", ...scopeOf });
          const job = await waitForJob(page, jobId);
          expect(job.status, job.error).toBe("completed");
          const history = (await (await page.request.get(`/api/backups/history?connectionId=${cid}`)).json()) as {
            data: { id: number; jobId: number; method: string; fileName: string; status: string }[];
          };
          const artifact = history.data.find((a) => a.jobId === jobId)!;
          expect(artifact).toMatchObject({ status: "completed", method: "basic" });
          expect(artifact.fileName).toMatch(/\.sql$/);

          const download = await page.request.get(`/api/backups/${artifact.id}/download`);
          expect(download.ok()).toBeTruthy();
          expect((await download.body()).toString("utf8")).toContain("it''s two");

          const restore = (data: Record<string, unknown>) => page.request.post("/api/backups/restore", { data });
          const base = { connectionId: cid, database: ns, artifactId: artifact.id, safetyBackup: false };
          // A new database cannot be created by a restore here, and the typed name must match.
          expect((await restore({ ...base, confirmName: ns, createDatabase: true })).status()).toBe(422);
          expect((await restore({ ...base, confirmName: "nope" })).status()).toBe(400);

          await raw(page, cid, `DROP TABLE ${tbl}`);
          const started = await restore({ ...base, confirmName: ns });
          expect(started.ok(), await started.text()).toBeTruthy();
          const restored = await waitForJob(page, ((await started.json()) as { data: { jobId: number } }).data.jobId);
          expect(restored.status, restored.error).toBe("completed");
          expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM ${tbl}`))).toBe(2);
          expect(await scalar(page, cid, `SELECT name FROM ${tbl} WHERE id = 2`)).toBe("it's two");

          // Replaying onto objects that already exist stops at the first error and says where.
          const again = await restore({ ...base, confirmName: ns });
          const failed = await waitForJob(page, ((await again.json()) as { data: { jobId: number } }).data.jobId);
          expect(failed.status).toBe("failed");
          expect(failed.error).toMatch(/statement \d+ of \d+/);
        } finally {
          await raw(page, cid, `DROP TABLE IF EXISTS ${tbl}`).catch(() => undefined);
          await raw(page, cid, engine === "mssql" ? `DROP SCHEMA IF EXISTS ${ns}` : `DROP DATABASE IF EXISTS ${ns}`).catch(() => undefined);
        }
      });
    });

    test("a restore test (drill) is skipped with a reason, not failed", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t }) => {
        const jobId = await startJob(page, "/api/backups", { connectionId: cid, note: "drill", ...scope });
        expect((await waitForJob(page, jobId)).status).toBe("completed");
        const history = (await (await page.request.get(`/api/backups/history?connectionId=${cid}`)).json()) as { data: { id: number; jobId: number }[] };
        const artifactId = history.data.find((a) => a.jobId === jobId)!.id;
        const drill = await page.request.post(`/api/backups/${artifactId}/drill`, { data: {} });
        expect(drill.ok(), await drill.text()).toBeTruthy();
        const job = await waitForJob(page, ((await drill.json()) as { data: { jobId: number } }).data.jobId);
        expect(job.status, job.error).toBe("completed");
        expect(job.message).toMatch(/skipped/i);
        void t;
      });
    });

    test.describe("tree objects", () => {
      const rootId = (cid: number): string => `${cid}@database`;
      const nsAction = engine === "mssql" ? "createSchema" : "createDatabase";
      const dropAction = engine === "mssql" ? "dropSchema" : "dropDatabase";
      const tab = engine === "mssql" ? "schema" : "database";
      const field = engine === "mssql" ? "nspname" : "datname";
      const createNs = (page: Page, cid: number, name: string, preview = false) =>
        objectExecute(page, cid, rootId(cid), nsAction, { [tab]: { new: { [field]: name } } }, preview);
      const namespaces = async (page: Page, cid: number): Promise<string[]> =>
        (await treeNodes(page, cid, "")).children.map((c) => c.id);
      const unique = (testInfo: TestInfo): string => `e2e_ns_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 40);

      test("create and drop a " + (engine === "mssql" ? "schema" : "database") + " from the tree", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          const ns = unique(testInfo);
          const roots = await treeNodes(page, cid, "");
          expect(roots.contextMenu.map((m) => m.title)).toContain(engine === "mssql" ? "Create schema" : "Create database");

          const preview = await createNs(page, cid, ns, true);
          expect(preview.body.data!.queries![0]).toMatch(new RegExp(`CREATE (SCHEMA|DATABASE) .*${ns}`, "i"));
          expect(await namespaces(page, cid)).not.toContain(ns);

          try {
            const made = await createNs(page, cid, ns);
            expect(made.status, JSON.stringify(made.body)).toBe(200);
            expect(await namespaces(page, cid)).toContain(ns);

            const dropped = await objectExecute(page, cid, ns, dropAction, {});
            expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
            expect(await namespaces(page, cid)).not.toContain(ns);
          } finally {
            await raw(page, cid, engine === "mssql" ? `DROP SCHEMA IF EXISTS ${ns}` : `DROP DATABASE IF EXISTS ${ns}`).catch(() => undefined);
          }
        });
      });

      test("invalid names are refused and nothing is created", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          for (const bad of ["", "1abc", "a b", "x;DROP TABLE t", "a]b", "a`b", "x".repeat(200)]) {
            const res = await createNs(page, cid, bad);
            expect(res.status, JSON.stringify(bad)).toBe(422);
          }
        });
      });

      test("a name that already exists is a clean error", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          const ns = unique(testInfo);
          try {
            expect((await createNs(page, cid, ns)).status).toBe(200);
            expect((await createNs(page, cid, ns)).status).toBeGreaterThanOrEqual(400);
          } finally {
            await raw(page, cid, engine === "mssql" ? `DROP SCHEMA IF EXISTS ${ns}` : `DROP DATABASE IF EXISTS ${ns}`).catch(() => undefined);
          }
        });
      });

      test("the built-in namespaces cannot be dropped", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          for (const protectedName of engine === "mssql" ? ["dbo"] : ["default", "system"]) {
            const res = await objectExecute(page, cid, protectedName, dropAction, {});
            expect(res.status, protectedName).toBe(422);
          }
        });
      });

      test("a schema that still holds objects is not dropped (no cascade)", async ({ page }, testInfo) => {
        test.skip(engine !== "mssql", "ClickHouse drops a database with its tables by design; the tree asks for confirmation");
        await withTables(page, testInfo, async ({ id: cid }) => {
          const ns = unique(testInfo);
          await createNs(page, cid, ns);
          try {
            await raw(page, cid, createTableSql(engine, `${ns}.t`, ["id INT NOT NULL"], "id"));
            expect((await objectExecute(page, cid, ns, dropAction, {})).status).toBeGreaterThanOrEqual(400);
            expect(await namespaces(page, cid)).toContain(ns);
          } finally {
            await raw(page, cid, `DROP TABLE IF EXISTS ${ns}.t`).catch(() => undefined);
            await raw(page, cid, `DROP SCHEMA IF EXISTS ${ns}`).catch(() => undefined);
          }
        });
      });

      if (engine === "clickhouse") {
        test("there are no routine containers (ClickHouse has no stored procedures)", async ({ page }, testInfo) => {
          await withTables(page, testInfo, async ({ id: cid }) => {
            const ids = (await treeNodes(page, cid, meta.namespace)).children.map((c) => c.id);
            expect(ids).toEqual([`${meta.namespace}.tableContainer`, `${meta.namespace}.viewContainer`]);
          });
        });
        return;
      }

      const routineNode = (n: string): string => `${meta.namespace}.${n}`;
      const routine = (page: Page, cid: number, procedure: boolean, name: string, body: string, edit = false) =>
        objectExecute(page, cid, edit ? routineNode(name) : routineNode(procedure ? "procedureContainer" : "functionContainer"), `${edit ? "edit" : "create"}${procedure ? "Procedure" : "Function"}`, {
          [procedure ? "procedure" : "function"]: { new: { name, body }, ...(edit ? { old: { name } } : {}) },
        });
      const listed = async (page: Page, cid: number, container: string): Promise<string[]> =>
        (await treeNodes(page, cid, routineNode(container))).children.map((c) => c.name);

      test("the schema offers Procedures and Functions containers", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          const ids = (await treeNodes(page, cid, meta.namespace)).children.map((c) => c.id);
          expect(ids).toEqual(expect.arrayContaining([routineNode("procedureContainer"), routineNode("functionContainer")]));
        });
      });

      test("procedure: create, list, run, edit, drop", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          const name = `e2e_proc_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 50);
          const create = (n: number) => `CREATE PROCEDURE ${meta.namespace}.${name} AS BEGIN SELECT ${n} AS answer END`;
          try {
            const made = await routine(page, cid, true, name, create(1));
            expect(made.status, JSON.stringify(made.body)).toBe(200);
            expect(await listed(page, cid, "procedureContainer")).toContain(name);
            expect(Number(await scalar(page, cid, `EXEC ${meta.namespace}.${name}`))).toBe(1);

            const form = await objectDetail(page, cid, routineNode(name), "editProcedure", "procedure");
            expect(JSON.stringify(form)).toContain("SELECT 1 AS answer");

            // Edit stores the new body without dropping the procedure first.
            const edited = await routine(page, cid, true, name, create(2), true);
            expect(edited.status, JSON.stringify(edited.body)).toBe(200);
            expect(Number(await scalar(page, cid, `EXEC ${meta.namespace}.${name}`))).toBe(2);

            const dropped = await objectExecute(page, cid, routineNode(name), "dropProcedure", {});
            expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
            expect(await listed(page, cid, "procedureContainer")).not.toContain(name);
          } finally {
            await raw(page, cid, `DROP PROCEDURE IF EXISTS ${meta.namespace}.${name}`).catch(() => undefined);
          }
        });
      });

      test("function: create, list, call, drop", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid }) => {
          const name = `e2e_fn_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 50);
          try {
            const made = await routine(page, cid, false, name, `CREATE FUNCTION ${meta.namespace}.${name}(@a INT) RETURNS INT AS BEGIN RETURN @a * 2 END`);
            expect(made.status, JSON.stringify(made.body)).toBe(200);
            expect(await listed(page, cid, "functionContainer")).toContain(name);
            expect(Number(await scalar(page, cid, `SELECT ${meta.namespace}.${name}(21)`))).toBe(42);
            expect((await objectExecute(page, cid, routineNode(name), "dropFunction", {})).status).toBe(200);
            expect(await listed(page, cid, "functionContainer")).not.toContain(name);
          } finally {
            await raw(page, cid, `DROP FUNCTION IF EXISTS ${meta.namespace}.${name}`).catch(() => undefined);
          }
        });
      });

      test("the form only accepts one CREATE PROCEDURE or CREATE FUNCTION statement", async ({ page }, testInfo) => {
        await withTables(page, testInfo, async ({ id: cid, t }) => {
          const name = `e2e_bad_${uniqueTestSuffix(testInfo)}`.replace(/\W/g, "_").slice(0, 50);
          const bad = [
            `DROP TABLE ${t}`,
            `SELECT 1`,
            `CREATE TABLE ${t}_x (id INT)`,
            `CREATE PROCEDURE ${meta.namespace}.${name} AS SELECT 1\nGO\nDROP TABLE ${t}`,
          ];
          for (const body of bad) {
            const res = await routine(page, cid, true, name, body);
            expect(res.status, body).toBe(422);
          }
          // A function body cannot be submitted as a procedure.
          expect((await routine(page, cid, true, name, `CREATE FUNCTION ${meta.namespace}.${name}() RETURNS INT AS BEGIN RETURN 1 END`)).status).toBe(422);
          expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM ${t}`))).toBe(3);
          expect(await listed(page, cid, "procedureContainer")).not.toContain(name);
        });
      });
    });

    test("a prod connection refuses writes until unlocked; reads keep working", async ({ page }, testInfo) => {
      await withTables(page, testInfo, async ({ id: cid, t, name }) => {
        const patch = await page.request.patch(`/api/connections/${cid}`, { data: { env: "prod" } });
        expect(patch.ok(), await patch.text()).toBeTruthy();

        const write = () => page.request.post("/api/query/raw", { data: { connectionId: cid, query: `DELETE FROM ${t} WHERE id = 1` } });
        const locked = await write();
        expect(locked.status()).toBe(403);
        expect((await locked.json()).message).toBe("safe_mode_prod_locked");
        expect(Number(await scalar(page, cid, `SELECT COUNT(*) FROM ${t}`))).toBe(3);

        const bad = await page.request.post(`/api/connections/${cid}/safe-mode/unlock`, { data: { confirmName: "nope" } });
        expect(bad.ok()).toBeFalsy();
        const ok = await page.request.post(`/api/connections/${cid}/safe-mode/unlock`, { data: { confirmName: name } });
        expect(ok.ok(), await ok.text()).toBeTruthy();
        expect((await write()).ok()).toBeTruthy();
        await page.request.patch(`/api/connections/${cid}`, { data: { env: "dev" } });
      });
    });
  });
}
