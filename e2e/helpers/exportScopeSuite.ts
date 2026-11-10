import { expect, test } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  connectionIdByName,
  expectError,
  scopeFor,
  startJob,
  waitForJob,
} from "./backupApi";
import {
  cleanupImportExportSqlite,
  dropTables,
  engineLabel,
  setupImportExport,
} from "./importExport";
import { createTableSql } from "./ddl";
import { withConnectionCleanup } from "./safeCleanup";

async function exportBytes(
  page: import("@playwright/test").Page,
  data: Record<string, unknown>,
): Promise<Buffer> {
  const jobId = await startJob(page, "/api/export", data);
  const job = await waitForJob(page, jobId);
  expect(job.status, job.error).toBe("completed");
  const response = await page.request.get(`/api/jobs/${jobId}/result`);
  expect(response.ok()).toBeTruthy();
  return response.body();
}

export function defineExportScopeTests(engine: DbEngine): void {
  test.describe(`Export scopes ${engineLabel(engine)}`, () => {
    test("tables, schema and database exports with schema dump and zip", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `exp-scope-${suffix}`;
      const parent = `e2e_scope_parent_${suffix}`;
      const child = `e2e_scope_child_${suffix}`;
      const big = `e2e_scope_big_${suffix}`;
      const scope = scopeFor(engine);

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(page, { connectionName }, engine);
        const rows = Array.from({ length: 150 }, (_, i) => `(${i + 1})`).join(
          ", ",
        );
        await pages.sqlEditor.open();
        await pages.sqlEditor.typeAndRun(
          [
            `DROP TABLE IF EXISTS ${child};`,
            `DROP TABLE IF EXISTS ${parent};`,
            `DROP TABLE IF EXISTS ${big};`,
            // Child is created first on purpose: the dump must still order
            // the parent before it. ClickHouse has no foreign keys, so no order is promised there.
            ...(engine === "clickhouse"
              ? [
                  `${createTableSql(engine, parent, ["id Int32", "name String"], "id")};`,
                  `${createTableSql(engine, child, ["id Int32", "parent_id Int32"], "id")};`,
                  `${createTableSql(engine, big, ["id Int32"], "id")};`,
                ]
              : [
                  `CREATE TABLE ${parent} (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);`,
                  `CREATE TABLE ${child} (id INT PRIMARY KEY, parent_id INT NOT NULL, FOREIGN KEY (parent_id) REFERENCES ${parent}(id));`,
                  `CREATE TABLE ${big} (id INT PRIMARY KEY);`,
                ]),
            `INSERT INTO ${parent} (id, name) VALUES (1, 'one'), (2, 'two');`,
            `INSERT INTO ${child} (id, parent_id) VALUES (10, 1), (11, 2);`,
            `INSERT INTO ${big} (id) VALUES ${rows};`,
          ].join("\n"),
        );
        const connectionId = await connectionIdByName(page, connectionName);
        const base = { connectionId, ...scope };

        try {
          await test.step("A single table export is not capped at 100 rows", async () => {
            const body = await exportBytes(page, {
              connectionId,
              table: big,
              query: `SELECT * FROM ${big}`,
              format: "csv",
              ...scope,
            });
            const lines = body.toString("utf8").trim().split(/\r?\n/);
            expect(lines.length).toBe(151);
          });

          await test.step("Tables scope as SQL: schema and data, parent before child", async () => {
            const sql = (
              await exportBytes(page, {
                ...base,
                scope: "tables",
                tables: [child, parent],
                content: "both",
                format: "sql",
              })
            ).toString("utf8");
            const parentAt = sql.search(
              new RegExp(`CREATE TABLE[^;]*${parent}`),
            );
            const childAt = sql.search(new RegExp(`CREATE TABLE[^;]*${child}`));
            expect(parentAt).toBeGreaterThanOrEqual(0);
            expect(childAt).toBeGreaterThanOrEqual(0);
            if (engine !== "clickhouse") expect(childAt).toBeGreaterThan(parentAt);
            expect(sql).toContain("'two'");
          });

          await test.step("Schema-only export has DDL and no rows", async () => {
            const sql = (
              await exportBytes(page, {
                ...base,
                scope: "tables",
                tables: [parent],
                content: "schema",
                format: "sql",
              })
            ).toString("utf8");
            expect(sql).toMatch(new RegExp(`CREATE TABLE[^;]*${parent}`));
            expect(sql).not.toContain("'two'");
          });

          await test.step("Database scope includes every table", async () => {
            const sql = (
              await exportBytes(page, {
                ...base,
                scope: "database",
                content: "both",
                format: "sql",
              })
            ).toString("utf8");
            for (const table of [parent, child, big]) {
              expect(sql).toContain(table);
            }
          });

          await test.step("CSV for several tables is a zip with one file each", async () => {
            const zip = await exportBytes(page, {
              ...base,
              scope: "tables",
              tables: [parent, child],
              format: "csv",
            });
            expect(zip.subarray(0, 2).toString()).toBe("PK");
            const text = zip.toString("latin1");
            expect(text).toContain(`${parent}.csv`);
            expect(text).toContain(`${child}.csv`);
          });

          await test.step("Invalid combinations are rejected", async () => {
            const schemaCsv = await page.request.post("/api/export", {
              data: {
                ...base,
                scope: "tables",
                tables: [parent],
                content: "schema",
                format: "csv",
              },
            });
            await expectError(schemaCsv, 422, "requires the sql format");
            const noTables = await page.request.post("/api/export", {
              data: { ...base, scope: "tables", format: "sql" },
            });
            await expectError(noTables, 422, "tables");
            const queryScopeSchema = await page.request.post("/api/export", {
              data: {
                connectionId,
                table: parent,
                query: `SELECT * FROM ${parent}`,
                content: "schema",
                format: "sql",
              },
            });
            await expectError(queryScopeSchema, 422, "requires a table scope");
          });
        } finally {
          await dropTables(pages.sqlEditor, [child, parent, big]);
          cleanupImportExportSqlite(pages);
        }
      });
    });
  });
}
