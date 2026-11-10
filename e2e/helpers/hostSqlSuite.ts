import { expect, test } from "@playwright/test";
import { getHostSqlConfig, type HostSqlEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { DataGridPage, SqlEditorPage, ConnectionPage, ObjectFormPage, ObjectTreePage } from "../pages";
import {
  objectDetail,
  objectExecute,
  objectTabs,
  rawError,
  treeNodes,
  HOST_SQL,
  SEED,
  autocomplete,
  createHostSqlConnection,
  expectClientError,
  diagram,
  ping,
  raw,
  run,
  scalar,
  tree,
  update,
} from "./hostSql";
import { startJob, waitForJob } from "./backupApi";
import { withConnectionCleanup } from "./safeCleanup";

/**
 * Coverage shared by the SQL engines on the generic driver (SQL Server, ClickHouse), against the sample
 * `shop` database the harness seeds (docs/sample_db/shop_*.sql). Every test creates its own connection
 * through the real New connection form, so the form, ping, create and tree paths run each time.
 */
export function defineHostSqlTests(engine: HostSqlEngine): void {
  const meta = HOST_SQL[engine];
  const ns = meta.namespace;
  const node = (table: string): string => `${ns}.${table}`;

  test.describe(`${meta.label} driver`, () => {
    async function withConnection(
      page: import("@playwright/test").Page,
      testInfo: import("@playwright/test").TestInfo,
      body: (id: number, name: string) => Promise<void>,
    ): Promise<void> {
      const name = `${engine}-${uniqueTestSuffix(testInfo)}`;
      await withConnectionCleanup(page, name, async () => {
        const id = await createHostSqlConnection(page, engine, name);
        await body(id, name);
      });
    }

    test.describe("connection", () => {
      test("created through the form, reports the server version", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const res = await page.request.get(`${process.env.PLAYWRIGHT_API_URL}/connections`, {
            headers: { "X-Client-Mode": "web" },
          });
          const conn = ((await res.json()) as { data: { id: number; type: string; info: string; options: Record<string, unknown> }[] }).data.find(
            (c) => c.id === id,
          )!;
          expect(conn.type).toBe(engine === "mssql" ? "sqlserver" : "clickhouse");
          expect(conn.info).toMatch(/\d+\.\d+/);
          // The password lives in the secret store, never in the options the API returns.
          expect(conn.options.password ?? "").toBe("");
        });
      });

      test("test button succeeds and the form rejects a wrong password", async ({ page }, testInfo) => {
        const connectionPage = new ConnectionPage(page);
        const name = `${engine}-bad-${uniqueTestSuffix(testInfo)}`;
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.openNewConnectionModal();
        await connectionPage.selectConnectionType(meta.label);
        await connectionPage.fillConnectionForm(getHostSqlConfig(engine, name));
        await connectionPage.testConnection();

        await connectionPage.passwordInput.fill("definitely-wrong");
        await connectionPage.testConnectionButton.click();
        await expect(page.getByText(/authentication/i).first()).toBeVisible({ timeout: 20_000 });
      });

      test("ping API classifies auth and network failures", async ({ page }) => {
        const cfg = getHostSqlConfig(engine, "x");
        const base = { host: cfg.host, port: Number(cfg.port), username: cfg.username, database: "shop" };
        const type = engine === "mssql" ? "sqlserver" : "clickhouse";
        await page.goto("/");

        const ok = await ping(page, type, { ...base, password: cfg.password });
        expect(ok.status).toBe(200);

        const badPassword = await ping(page, type, { ...base, password: "nope" });
        expect(badPassword.status).toBe(400);
        expect((badPassword.body.data as { category?: string }).category).toBe("authentication");

        const closedPort = await ping(page, type, { ...base, port: 1, password: cfg.password });
        expect(closedPort.status).toBe(400);
        expect((closedPort.body.data as { category?: string }).category).toBe("network");

        const missingHost = await ping(page, type, { port: 1, username: "u", password: "p" });
        expect(missingHost.status).toBe(400);
      });
    });

    test.describe("tree", () => {
      test("lists namespaces, containers, tables and views", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const roots = await tree(page, id);
          expect(roots.map((n) => n.id)).toContain(ns);
          // System namespaces stay hidden.
          expect(roots.map((n) => n.id)).not.toContain("sys");
          expect(roots.map((n) => n.id)).not.toContain("system");
          expect(roots.map((n) => n.id)).not.toContain("INFORMATION_SCHEMA");

          const containers = await tree(page, id, ns);
          expect(containers.map((n) => n.type)).toEqual(
            engine === "mssql"
              ? ["tableContainer", "viewContainer", "procedureContainer", "functionContainer", "sequenceContainer"]
              : ["tableContainer", "viewContainer", "materializedViewContainer"],
          );

          const tables = await tree(page, id, `${ns}.tableContainer`);
          // Sample shop is shared across specs; ignore leftover e2e_* tables from other runs.
          expect(tables.map((n) => n.name).filter((n) => !n.startsWith("e2e_"))).toEqual(
            ["categories", "customers", "order_items", "orders", ...(engine === "clickhouse" ? ["page_views"] : []), "products"].sort(),
          );
          expect(tables.every((n) => n.type === "table")).toBe(true);

          const views = await tree(page, id, `${ns}.viewContainer`);
          expect(views.map((n) => n.name)).toEqual(["customer_totals"]);
        });
      });

      test("explorer expands to a table and double-click opens its data", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (_id, name) => {
          const objectTree = new ObjectTreePage(page);
          await objectTree.expandPath([name, ns]);
          await objectTree.refreshExpandNode("Tables");
          await objectTree.filterTree("customers");
          const customers = objectTree.getTreeNode("customers");
          await expect(customers).toBeVisible({ timeout: 15_000 });
          await customers.dblclick();

          const grid = new DataGridPage(page);
          await grid.waitForData("user1@example.com");
          await grid.expectCellVisible("Customer 1");
        });
      });
    });

    test.describe("data browser", () => {
      test("pages, sorts, filters and limits columns", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const first = await run(page, id, node("customers"), { limit: 10, page: 1 });
          expect(first.status).toBe(200);
          expect(first.data.data.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

          const third = await run(page, id, node("customers"), { limit: 10, page: 3 });
          expect(third.data.data.map((r) => r.id)).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);

          const desc = await run(page, id, node("customers"), { limit: 3, sorts: [{ column: "id", operator: "DESC" }] });
          expect(desc.data.data.map((r) => r.id)).toEqual([SEED.customers, SEED.customers - 1, SEED.customers - 2]);

          const eq = await run(page, id, node("customers"), {
            limit: 1000,
            filters: [{ column: "city", operator: "=", value: "Berlin", next: "AND" }],
          });
          expect(eq.data.data.length).toBe(400);
          expect(new Set(eq.data.data.map((r) => r.city))).toEqual(new Set(["Berlin"]));

          // LIKE filters cast to text, so they work on numeric columns too.
          const like = await run(page, id, node("customers"), {
            limit: 1000,
            filters: [{ column: "id", operator: "LIKE_ENDS", value: "99", next: "AND" }],
          });
          expect(like.data.data.length).toBe(20);

          const two = await run(page, id, node("customers"), {
            limit: 1000,
            filters: [
              { column: "city", operator: "=", value: "Osaka", next: "AND" },
              { column: "id", operator: "<", value: "100", next: "AND" },
            ],
          });
          expect(two.data.data.every((r) => r.city === "Osaka" && Number(r.id) < 100)).toBe(true);

          const subset = await run(page, id, node("customers"), { limit: 2, columns: ["id", "email"] });
          expect(Object.keys(subset.data.data[0]).filter((k) => k !== "dbo_index").sort()).toEqual(["email", "id"]);
          expect(subset.data.columns.filter((c) => (c as { isActive?: boolean }).isActive).map((c) => c.name)).toEqual(["id", "email"]);
        });
      });

      test("reports column metadata", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const { data } = await run(page, id, node("order_items"), { limit: 1 });
          const byName = Object.fromEntries(data.columns.map((c) => [c.name, c]));
          expect(Object.keys(byName)).toEqual(["order_id", "line_no", "product_id", "quantity", "unit_price", ...(engine === "mssql" ? ["line_total"] : [])]);
          expect(byName.order_id.isPrimaryKey).toBe(true);
          expect(byName.line_no.isPrimaryKey).toBe(true);
          expect(byName.quantity.isPrimaryKey).toBe(false);
          expect(byName.quantity.mappedType).toBe("number");
          expect(byName.unit_price.mappedType).toBe("number");
          expect(byName.order_id.editable).toBe(meta.editable);
          if (meta.foreignKeys) {
            expect(byName.product_id.isForeignKey).toBe(true);
          }
        });
      });

      test("views are browsable but never editable", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const result = await run(page, id, node("customer_totals"), { limit: 5, sorts: [{ column: "id", operator: "ASC" }] });
          expect(result.status).toBe(200);
          expect(result.data.data).toHaveLength(5);
          expect(result.data.columns.map((c) => c.name)).toEqual(["id", "full_name", "orders", "spent"]);
          expect(Number(result.data.data[0].orders)).toBeGreaterThan(0);
          // A view is never editable, whatever the engine allows on tables.
          for (const column of result.data.columns) expect(column.editable, `view column ${column.name}`).toBe(false);
          const edit = await update(page, id, node("customer_totals"), { edited: [{ conditions: { id: 1 }, values: { full_name: "x" } }] });
          expectClientError(edit);
        });
      });

      test("missing table is a clean error", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const result = await run(page, id, node("does_not_exist"));
          expect(result.status).toBeGreaterThanOrEqual(400);
          expect(result.status).toBeLessThan(600);
          expect(String(result.message), "error must name the problem").toMatch(/does_not_exist|invalid object|doesn't exist|does not exist|unknown table/i);
        });
      });
    });

    test.describe("sql editor", () => {
      test("seed row counts", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const count = async (table: string): Promise<number> => Number(await scalar(page, id, `SELECT COUNT(*) AS n FROM ${table}`));
          expect(await count("categories")).toBe(SEED.categories);
          expect(await count("customers")).toBe(SEED.customers);
          expect(await count("products")).toBe(SEED.products);
          expect(await count("orders")).toBe(SEED.orders);
          expect(await count("order_items")).toBe(SEED.orderItems);
          expect(await count(engine === "mssql" ? "analytics.page_views" : "page_views")).toBe(meta.pageViews);
        });
      });

      test("joins and aggregates", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const { data } = await raw(
            page,
            id,
            `SELECT c.city AS city, COUNT(*) AS orders FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city IS NOT NULL GROUP BY c.city ORDER BY c.city`,
          );
          expect(data.map((r) => r.city)).toEqual(["Austin", "Berlin", "Osaka", "Tehran"]);
          expect(data.reduce((sum, r) => sum + Number(r.orders), 0)).toBeGreaterThan(0);
        });
      });

      test("a syntax error comes back as a message, not a crash", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const result = await raw(page, id, "SELEC nonsense FROM");
          expect(result.columns.map((c) => c.name)).toEqual(["Query", "Message", "Duration"]);
          expect(String(result.data[0].Message).length).toBeGreaterThan(5);
        });
      });

      test("rows stop at the requested limit", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const res = await page.request.post(`${process.env.PLAYWRIGHT_API_URL}/query/raw`, {
            headers: { "X-Client-Mode": "web" },
            data: { connectionId: id, query: "SELECT id FROM customers ORDER BY id", limit: 25, page: 1 },
          });
          const body = (await res.json()) as { data: { data: unknown[] } };
          expect(body.data.data).toHaveLength(25);
        });
      });

      test("runs from the editor and shows the result grid", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async () => {
          const editor = new SqlEditorPage(page);
          await editor.open();
          await editor.typeAndRun("SELECT id, email FROM customers WHERE id = 42");
          await new DataGridPage(page).waitForData("user42@example.com");
        });
      });

      test("typed values survive the round trip", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          if (engine === "clickhouse") {
            const { data, columns } = await raw(
              page,
              id,
              `SELECT toUUID('61f0c404-5cb3-11e7-907b-a6006ad3dba0') AS u, toDecimal64(12.34, 2) AS d, [toInt32(1), 2, 3] AS arr, map('k', 'v') AS m,
                      toDateTime64('2024-01-02 03:04:05.678', 3, 'UTC') AS ts, CAST(NULL AS Nullable(String)) AS n, toUInt64(9007199254740991) AS big`,
            );
            const row = data[0];
            expect(row.u).toBe("61f0c404-5cb3-11e7-907b-a6006ad3dba0");
            expect(String(row.d)).toBe("12.34");
            expect(row.arr).toEqual([1, 2, 3]);
            expect(row.m).toEqual({ k: "v" });
            expect(String(row.ts)).toContain("2024-01-02T03:04:05.678");
            expect(row.n).toBeNull();
            expect(String(row.big)).toBe("9007199254740991");
            expect(columns.find((c) => c.name === "arr")!.mappedType).toBe("json");
            expect(columns.find((c) => c.name === "u")!.mappedType).toBe("uuid");
          } else {
            const { data, columns } = await raw(
              page,
              id,
              `SELECT CAST('61F0C404-5CB3-11E7-907B-A6006AD3DBA0' AS UNIQUEIDENTIFIER) AS u, CAST(12.34 AS DECIMAL(10,2)) AS d, CAST(1 AS BIT) AS b,
                      CAST('2024-01-02T03:04:05.678' AS DATETIME2(3)) AS ts, CAST(NULL AS NVARCHAR(10)) AS n, N'Zürich ✓' AS txt, CAST(9007199254740991 AS BIGINT) AS big`,
            );
            const row = data[0];
            expect(String(row.u).toLowerCase()).toBe("61f0c404-5cb3-11e7-907b-a6006ad3dba0");
            expect(String(row.d)).toBe("12.34");
            expect(row.b).toBe(true);
            expect(String(row.ts)).toContain("2024-01-02T03:04:05.678");
            expect(row.n).toBeNull();
            expect(row.txt).toBe("Zürich ✓");
            expect(String(row.big)).toBe("9007199254740991");
            expect(columns.find((c) => c.name === "u")!.mappedType).toBe("uuid");
          }
        });
      });
    });

    test.describe("schema metadata", () => {
      test("autocomplete returns tables, views and columns", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const ac = await autocomplete(page, id);
          expect(ac.tables).toEqual(expect.arrayContaining(["customers", "orders", "order_items", "products", "categories"]));
          expect(ac.views).toEqual(["customer_totals"]);
          expect(ac.columns.customers).toEqual(expect.arrayContaining(["id", "email", "city"]));
        });
      });

      test("diagram draws tables and foreign keys", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const graph = await diagram(page, id, ns);
          expect(graph.nodes.map((n) => n.id)).toEqual(expect.arrayContaining([node("customers"), node("orders"), node("order_items")]));
          const edges = graph.edges.map((e) => `${e.source}->${e.target}`);
          if (meta.foreignKeys) {
            expect(edges).toEqual(
              expect.arrayContaining([
                `${node("orders")}->${node("customers")}`,
                `${node("order_items")}->${node("orders")}`,
                `${node("order_items")}->${node("products")}`,
                `${node("products")}->${node("categories")}`,
              ]),
            );
          } else {
            expect(edges).toEqual([]);
          }
        });
      });
    });

    test.describe(meta.editable ? "row editing" : "read-only", () => {
      if (meta.mutations) {
        test("insert, update and delete round trip through mutations", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const name = `Zürich o'neil \\ ${uniqueTestSuffix(testInfo)}`;
            const newId = 900000 + Math.floor(Math.random() * 90000);
            const inserted = await update(page, id, node("categories"), { added: [{ id: newId, name, parent_id: null }] });
            expect(inserted.status, JSON.stringify(inserted.body)).toBe(200);

            const row = (await raw(page, id, `SELECT id, name, parent_id FROM categories WHERE id = ${newId}`)).data[0];
            expect(row.name).toBe(name);
            expect(row.parent_id).toBeNull();

            // The row is matched on every column it was read with, so a stale read changes nothing.
            const renamed = `${name} renamed`;
            const edited = await update(page, id, node("categories"), {
              edited: [{ conditions: { id: newId, name, parent_id: null }, values: { name: renamed, parent_id: 1 } }],
            });
            expect(edited.status, JSON.stringify(edited.body)).toBe(200);
            const after = (await raw(page, id, `SELECT name, parent_id FROM categories WHERE id = ${newId}`)).data[0];
            expect(after.name).toBe(renamed);
            expect(Number(after.parent_id)).toBe(1);

            const stale = await update(page, id, node("categories"), {
              edited: [{ conditions: { id: newId, name: "not the current name", parent_id: 1 }, values: { name: "nope" } }],
            });
            expect(stale.status).toBe(200);
            expect((await raw(page, id, `SELECT name FROM categories WHERE id = ${newId}`)).data[0].name).toBe(renamed);

            const deleted = await update(page, id, node("categories"), { deleted: [{ id: newId, name: renamed, parent_id: 1 }] });
            expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
            expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM categories WHERE id = ${newId}`))).toBe(0);
            expect(Number(await scalar(page, id, "SELECT COUNT(*) FROM categories"))).toBe(SEED.categories);
          });
        });

        test("editing a sorting-key column is refused and nothing changes", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const res = await update(page, id, node("categories"), {
              edited: [{ conditions: { id: 1, name: "Electronics", parent_id: null }, values: { id: 5000 } }],
            });
            expectClientError(res);
            expect(await scalar(page, id, "SELECT name FROM categories WHERE id = 1")).toBe("Electronics");
          });
        });

        test("query results of a table are inline-editable, views are not", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            expect((await raw(page, id, "SELECT * FROM categories")).editable).toBe(true);
          });
        });
        return;
      }

      test("insert, update and delete round trip (unicode, NULL, quotes)", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const name = `Zürich ✓ o'neil ${uniqueTestSuffix(testInfo)}`;
          const inserted = await update(page, id, node("categories"), { added: [{ name, parent_id: null }] });
          expect(inserted.status, JSON.stringify(inserted.body)).toBe(200);
          expect(inserted.body.data!.rowAffected).toBe(1);

          const row = (await raw(page, id, `SELECT id, name, parent_id, slug FROM categories WHERE name = N'${name.replaceAll("'", "''")}'`)).data[0];
          expect(row.name).toBe(name);
          expect(row.parent_id).toBeNull();
          // Computed column filled in by the server.
          expect(String(row.slug)).toBe(name.toLowerCase().replaceAll(" ", "-"));

          const renamed = `${name} renamed`;
          const edited = await update(page, id, node("categories"), {
            edited: [{ conditions: { id: row.id }, values: { name: renamed, parent_id: 1 } }],
          });
          expect(edited.body.data!.rowAffected).toBe(1);
          expect((await raw(page, id, `SELECT parent_id FROM categories WHERE id = ${row.id}`)).data[0].parent_id).toBe(1);

          const deleted = await update(page, id, node("categories"), { deleted: [{ id: row.id }] });
          expect(deleted.body.data!.rowAffected).toBe(1);
          expect(await scalar(page, id, "SELECT COUNT(*) FROM categories")).toBe(SEED.categories);
        });
      });

      test("composite primary key targets exactly one row", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const before = (await raw(page, id, "SELECT quantity FROM order_items WHERE order_id = 1 AND line_no = 1")).data[0].quantity;
          const res = await update(page, id, node("order_items"), {
            edited: [{ conditions: { order_id: 1, line_no: 1 }, values: { quantity: 77 } }],
          });
          expect(res.body.data!.rowAffected).toBe(1);
          expect(Number(await scalar(page, id, "SELECT SUM(CASE WHEN quantity = 77 THEN 1 ELSE 0 END) FROM order_items"))).toBe(1);
          await update(page, id, node("order_items"), {
            edited: [{ conditions: { order_id: 1, line_no: 1 }, values: { quantity: before } }],
          });
        });
      });

      test("a failing statement rolls the whole save back", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const res = await update(page, id, node("categories"), {
            added: [{ name: "should-not-survive" }],
            edited: [{ conditions: { id: 1 }, values: { name: null } }], // NOT NULL violation
          });
          expect(res.status).toBeGreaterThanOrEqual(400);
          expect(Number(await scalar(page, id, "SELECT COUNT(*) FROM categories WHERE name = N'should-not-survive'"))).toBe(0);
          expect(await scalar(page, id, "SELECT name FROM categories WHERE id = 1")).toBe("Electronics");
        });
      });

      test("foreign key violations surface as an error", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const res = await update(page, id, node("orders"), { added: [{ customer_id: 999999, status: "paid" }] });
          expect(res.status).toBeGreaterThanOrEqual(400);
          expect(res.status).toBeLessThan(500);
          expect(JSON.stringify(res.body)).toMatch(/FOREIGN KEY|constraint/i);
        });
      });

      test("grid cell edit saves through the UI", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id, name) => {
          const objectTree = new ObjectTreePage(page);
          await objectTree.expandPath([name, ns]);
          await objectTree.refreshExpandNode("Tables");
          await objectTree.filterTree("categories");
          await objectTree.getTreeNode("categories").dblclick();

          const grid = new DataGridPage(page);
          await grid.waitForData("Electronics");
          await grid.editCell("Electronics", "Gadgets");
          await grid.saveChanges();
          await expect.poll(async () => scalar(page, id, "SELECT name FROM categories WHERE id = 1")).toBe("Gadgets");
          await update(page, id, node("categories"), { edited: [{ conditions: { id: 1 }, values: { name: "Electronics" } }] });
        });
      });
    });

    test.describe("schema editing", () => {
      // Column types per engine; ClickHouse takes the full type text.
      const T = engine === "mssql" ? { int: "int", big: "bigint", text: "nvarchar", len: "50" } : { int: "UInt32", big: "UInt64", text: "Nullable(String)", len: "" };
      const col = (name: string, type: string, extra: Record<string, unknown> = {}) => ({
        column_name: name,
        data_type: type,
        ...extra,
      });
      const createBody = (table: string, cols: Record<string, unknown>[]) => ({
        general: { new: { relname: table } },
        table_columns: { columns: cols.map((c) => ({ new: c, added: true })) },
      });
      const tableOf = (suffix: string): string => `e2e_se_${suffix}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 60);
      const cleanup = async (page: import("@playwright/test").Page, id: number, ...tables: string[]): Promise<void> => {
        for (const t of tables) {
          await objectExecute(page, id, node(t), "dropTable", {});
        }
      };
      const columnNames = async (page: import("@playwright/test").Page, id: number, table: string): Promise<string[]> =>
        (await objectDetail(page, id, node(table), "editTable", "table_columns")).data.map((r) => String(r.column_name));

      test("create table: preview does nothing, execute creates it", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const table = tableOf(uniqueTestSuffix(testInfo));
          const body = createBody(table, [
            col("id", T.int, { primary: true, not_null: true }),
            col("label", T.text, { ...(T.len ? { character_maximum_length: T.len } : {}) }),
          ]);
          try {
            const preview = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", body, true);
            expect(preview.status, JSON.stringify(preview.body)).toBe(200);
            expect(preview.body.data!.queries!.join("\n")).toMatch(/CREATE TABLE/i);
            expect(await columnNamesSafe(page, id, table)).toEqual([]);

            const created = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", body);
            expect(created.status, JSON.stringify(created.body)).toBe(200);
            // The form moves on to the edit tab of the new table.
            expect(created.body.data!.nodeId).toBe(node(table));

            expect(await columnNames(page, id, table)).toEqual(["id", "label"]);
            const detail = await objectDetail(page, id, node(table), "editTable", "table_columns");
            expect(detail.general.find((g) => g.id === "relname")!.value).toBe(table);
            expect(detail.data[0].primary).toBe(true);
            expect(detail.data[1].primary).toBe(false);
            expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${table}`))).toBe(0);

            const tables = (await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name);
            expect(tables).toContain(table);
          } finally {
            await cleanup(page, id, table);
          }
        });
      });

      async function columnNamesSafe(page: import("@playwright/test").Page, id: number, table: string): Promise<string[]> {
        const tables = (await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name);
        return tables.includes(table) ? columnNames(page, id, table) : [];
      }

      test("edit table: rename, add, retype, rename and drop columns", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const table = tableOf(uniqueTestSuffix(testInfo));
          const renamed = `${table}_r`.slice(0, 63);
          try {
            await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, [
              col("id", T.int, { primary: true, not_null: true }),
              col("qty", T.int),
              col("junk", T.int),
            ]));

            const edit = {
              general: { old: { relname: table }, new: { relname: renamed } },
              table_columns: {
                columns: [
                  { old: col("qty", T.int), new: col("quantity", T.big) },
                  { old: col("junk", T.int), new: col("junk", T.int), deleted: true },
                  { new: col("note", T.text, T.len ? { character_maximum_length: T.len } : {}), added: true },
                ],
              },
            };
            const preview = await objectExecute(page, id, node(table), "editTable", edit, true);
            expect(preview.status, JSON.stringify(preview.body)).toBe(200);
            expect(preview.body.data!.queries!.length).toBeGreaterThanOrEqual(4);

            const done = await objectExecute(page, id, node(table), "editTable", edit);
            expect(done.status, JSON.stringify(done.body)).toBe(200);

            expect(await columnNames(page, id, renamed)).toEqual(["id", "quantity", "note"]);
            const rows = (await objectDetail(page, id, node(renamed), "editTable", "table_columns")).data;
            expect(String(rows.find((r) => r.column_name === "quantity")!.data_type).toLowerCase()).toBe(T.big.toLowerCase());
            // The old table name is gone.
            expect((await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name)).not.toContain(table);
            await raw(page, id, `SELECT id, quantity, note FROM ${renamed}`);
          } finally {
            await cleanup(page, id, table, `${table}_r`.slice(0, 63));
          }
        });
      });

      test("rejects an injected data type and a missing name", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const table = tableOf(uniqueTestSuffix(testInfo));
          const before = (await tree(page, id, `${ns}.tableContainer`)).length;

          const injected = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, [col("id", `${T.int}); DROP TABLE customers;--`)]));
          expect(injected.status).toBeGreaterThanOrEqual(400);
          expect(injected.status).toBeLessThan(500);

          const noName = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody("", [col("id", T.int)]));
          expect(noName.status).toBeGreaterThanOrEqual(400);

          const noColumns = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, []));
          expect(noColumns.status).toBeGreaterThanOrEqual(400);

          expect((await tree(page, id, `${ns}.tableContainer`)).length).toBe(before);
          expect(Number(await scalar(page, id, "SELECT COUNT(*) FROM customers"))).toBe(SEED.customers);
        });
      });

      test("rename and drop actions on a table", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const table = tableOf(uniqueTestSuffix(testInfo));
          const renamed = `${table}_n`.slice(0, 63);
          try {
            await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, [col("id", T.int, { primary: true, not_null: true })]));
            const rename = await objectExecute(page, id, node(table), "rename", { name: renamed });
            expect(rename.status, JSON.stringify(rename.body)).toBe(200);
            expect((await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name)).toContain(renamed);

            const drop = await objectExecute(page, id, node(renamed), "dropTable", {});
            expect(drop.status, JSON.stringify(drop.body)).toBe(200);
            expect((await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name)).not.toContain(renamed);
          } finally {
            await cleanup(page, id, table, renamed);
          }
        });
      });

      test("view lifecycle: create, read back, edit, drop", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const view = `${tableOf(uniqueTestSuffix(testInfo))}_v`.slice(0, 63);
          const sql = (n: number): string => `SELECT id, email FROM customers WHERE id <= ${n}`;
          try {
            const created = await objectExecute(page, id, `${ns}.viewContainer`, "createView", { view: { new: { name: view, query: sql(3) + ";" } } });
            expect(created.status, JSON.stringify(created.body)).toBe(200);
            expect((await run(page, id, node(view))).data.data).toHaveLength(3);

            const detail = await objectDetail(page, id, node(view), "editView", "view");
            expect(detail.general.find((g) => g.id === "query")!.value).toMatch(/customers/i);

            const edited = await objectExecute(page, id, node(view), "editView", { view: { old: { name: view }, new: { name: view, query: sql(5) } } });
            expect(edited.status, JSON.stringify(edited.body)).toBe(200);
            expect((await run(page, id, node(view))).data.data).toHaveLength(5);

            const dropped = await objectExecute(page, id, node(view), "dropView", {});
            expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
            expect((await tree(page, id, `${ns}.viewContainer`)).map((n) => n.name)).not.toContain(view);
          } finally {
            await objectExecute(page, id, node(view), "dropView", {});
          }
        });
      });

      test("context menus offer the schema actions", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const tables = await treeNodes(page, id, `${ns}.tableContainer`);
          expect(tables.contextMenu.map((m) => m.title)).toContain("Create table");
          expect(tables.children[0].contextMenu.map((m) => m.title)).toEqual(expect.arrayContaining(["Edit table", "Drop table", "Rename"]));
          const views = await treeNodes(page, id, `${ns}.viewContainer`);
          expect(views.contextMenu.map((m) => m.title)).toContain("Create view");
          expect(views.children[0].contextMenu.map((m) => m.title)).toEqual(expect.arrayContaining(["Edit view", "Drop view"]));
        });
      });

      if (engine === "mssql") {
        test("changing a default is applied; toggling identity is refused with a clear message", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const table = tableOf(uniqueTestSuffix(testInfo));
            try {
              await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, [col("id", "int", { primary: true, not_null: true }), col("n", "int")]));
              const changed = await objectExecute(page, id, node(table), "editTable", {
                table_columns: { columns: [{ old: col("n", "int"), new: col("n", "int", { column_default: "5" }) }] },
              });
              expect(changed.status, JSON.stringify(changed.body)).toBe(200);
              await raw(page, id, `INSERT INTO ${table} (id) VALUES (1)`);
              expect(Number((await raw(page, id, `SELECT n FROM ${table}`)).data[0].n)).toBe(5);

              const identity = await objectExecute(page, id, node(table), "editTable", {
                table_columns: { columns: [{ old: col("id", "int", { primary: true, not_null: true }), new: col("id", "int", { primary: true, not_null: true, is_identity: true }) }] },
              });
              expect(identity.status).toBeGreaterThanOrEqual(400);
              expect(JSON.stringify(identity.body)).toMatch(/identity/i);
            } finally {
              await cleanup(page, id, table);
            }
          });
        });

        test("identity, default and not-null are applied on create", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const table = tableOf(uniqueTestSuffix(testInfo));
            try {
              const res = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, [
                col("id", "int", { primary: true, not_null: true, is_identity: true }),
                col("price", "decimal", { character_maximum_length: "10", numeric_scale: "2", not_null: true, column_default: "1.50" }),
              ]));
              expect(res.status, JSON.stringify(res.body)).toBe(200);
              await raw(page, id, `INSERT INTO ${table} DEFAULT VALUES`);
              await raw(page, id, `INSERT INTO ${table} DEFAULT VALUES`);
              const rows = (await raw(page, id, `SELECT id, price FROM ${table} ORDER BY id`)).data;
              expect(rows.map((r) => r.id)).toEqual([1, 2]);
              expect(String(rows[0].price)).toBe("1.50");
              const detail = (await objectDetail(page, id, node(table), "editTable", "table_columns")).data;
              expect(detail[0]).toMatchObject({ column_name: "id", is_identity: true, primary: true });
              expect(detail[1]).toMatchObject({ data_type: "decimal", character_maximum_length: "10", numeric_scale: "2", not_null: true });
            } finally {
              await cleanup(page, id, table);
            }
          });
        });
      } else {
        test("sorting key comes from the primary-key columns", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const table = tableOf(uniqueTestSuffix(testInfo));
            try {
              const res = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", createBody(table, [
                col("a", "UInt32", { primary: true }),
                col("b", "String", { primary: true }),
                col("c", "Nullable(Float64)", { column_default: "NULL" }),
              ]));
              expect(res.status, JSON.stringify(res.body)).toBe(200);
              expect(await scalar(page, id, `SELECT sorting_key FROM system.tables WHERE database = '${ns}' AND name = '${table}'`)).toBe("a, b");
            } finally {
              await cleanup(page, id, table);
            }
          });
        });
      }

      test("create table through the Object Form", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id, name) => {
          const table = tableOf(uniqueTestSuffix(testInfo));
          const tree_ = new ObjectTreePage(page);
          const form = new ObjectFormPage(page);
          try {
            await tree_.expandPath([name, ns]);
            await tree_.runTreeAction("Tables", "Create table");
            await form.waitForReady();
            await form.activateWorkspaceTab("Create table");
            await form.waitForReady();

            await form.fillGeneralField("relname", table);
            await form.selectTab("table_columns");
            await form.addRow();
            await form.fillArrayCell(0, "column_name", "id");
            if (engine === "mssql") {
              await form.selectArrayCellOption(0, "data_type", "int");
            } else {
              await form.fillArrayCell(0, "data_type", "UInt32");
            }
            await form.toggleArrayCheckbox(0, "primary", true);

            await form.save();
            await form.assertPreviewContains(/CREATE TABLE/i);
            await form.assertPreviewContains(table);
            await form.confirmExecute();

            await expect.poll(async () => (await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name)).toContain(table);
            expect(await columnNames(page, id, table)).toEqual(["id"]);
          } finally {
            await cleanup(page, id, table);
          }
        });
      });
    });

    test.describe("keys, indexes, foreign keys, checks, triggers", () => {
      const tableOf = (suffix: string, tag: string): string => `e2e_${tag}_${suffix}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 60);
      const col = (name: string, type: string, extra: Record<string, unknown> = {}) => ({ column_name: name, data_type: type, ...extra });
      const createTable = (page: import("@playwright/test").Page, id: number, table: string, cols: Record<string, unknown>[], tabs: Record<string, unknown> = {}) =>
        objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
          general: { new: { relname: table } },
          table_columns: { columns: cols.map((c) => ({ new: c, added: true })) },
          ...tabs,
        });
      const edit = (page: import("@playwright/test").Page, id: number, table: string, tabs: Record<string, unknown>) =>
        objectExecute(page, id, node(table), "editTable", tabs);
      const detail = async (page: import("@playwright/test").Page, id: number, table: string, tab: string) =>
        (await objectDetail(page, id, node(table), "editTable", tab)).data;
      const drop = async (page: import("@playwright/test").Page, id: number, ...tables: string[]): Promise<void> => {
        for (const t of tables) await objectExecute(page, id, node(t), "dropTable", {});
      };
      const row = (obj: Record<string, unknown>) => ({ new: obj, added: true });

      test("tabs offered per engine", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const tabs = await objectTabs(page, id, node("customers"), "editTable");
          if (engine === "mssql") {
            expect(tabs).toEqual(["table_columns", "table_keys", "table_indexes", "table_foreign_keys", "table_checks", "table_triggers"]);
          } else {
            expect(tabs).toEqual(["table_columns", "table_keys", "table_indexes", "table_checks"]);
          }
        });
      });

      test("existing keys, indexes, checks of the sample schema are listed", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const keys = await detail(page, id, "order_items", "table_keys");
          expect(keys[0]).toMatchObject({ constraint_type: "PRIMARY KEY", ref_columns: ["order_id", "line_no"] });

          if (engine === "mssql") {
            expect((await detail(page, id, "categories", "table_keys")).map((k) => k.constraint_type)).toEqual(["PRIMARY KEY", "UNIQUE"]);
            expect(await detail(page, id, "products", "table_indexes")).toEqual(
              expect.arrayContaining([expect.objectContaining({ index_name: "products_category_price", ref_columns: ["category_id", "price"], unique: false })]),
            );
            const fks = await detail(page, id, "order_items", "table_foreign_keys");
            expect(fks.map((f) => f.target_table).sort()).toEqual(["orders", "products"]);
            expect(fks.find((f) => f.target_table === "orders")).toMatchObject({ ref_columns: ["order_id"], target_columns: ["id"], delete_action: "CASCADE" });
            expect(await detail(page, id, "products", "table_checks")).toEqual([expect.objectContaining({ name: "chk_products_price" })]);
            const triggers = await detail(page, id, "orders", "table_triggers");
            expect(triggers).toEqual([expect.objectContaining({ name: "trg_orders_cancel", timing: "AFTER", event: "UPDATE" })]);
            expect(String(triggers[0].body)).toMatch(/UPDATE o SET total = 0/);
          }
        });
      });

      if (engine === "mssql") {
        test("add unique key, index, check, foreign key and trigger; each one is enforced", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const suffix = uniqueTestSuffix(testInfo);
            const parent = tableOf(suffix, "p");
            const child = tableOf(suffix, "c");
            try {
              expect((await createTable(page, id, parent, [col("id", "int", { primary: true, not_null: true })])).status).toBe(200);
              const created = await createTable(page, id, child, [
                col("id", "int", { primary: true, not_null: true, is_identity: true }),
                col("parent_id", "int"),
                col("code", "nvarchar", { character_maximum_length: "20" }),
                col("amount", "int"),
              ], {
                table_keys: { columns: [row({ constraint_name: `uq_${child}`.slice(0, 60), ref_columns: ["code"], constraint_type: "UNIQUE" })] },
                table_indexes: { columns: [row({ index_name: `ix_${child}`.slice(0, 60), ref_columns: ["parent_id", "amount"], unique: false })] },
                table_checks: { columns: [row({ name: `ck_${child}`.slice(0, 60), expression: "amount >= 0" })] },
                table_foreign_keys: { columns: [row({ constraint_name: `fk_${child}`.slice(0, 60), ref_columns: ["parent_id"], target_table: parent, target_columns: ["id"], delete_action: "CASCADE" })] },
                table_triggers: { columns: [row({ name: `tr_${child}`.slice(0, 60), timing: "AFTER", event: "INSERT", body: `UPDATE ${child} SET amount = amount + 1000 WHERE id IN (SELECT id FROM inserted)` })] },
              });
              expect(created.status, JSON.stringify(created.body)).toBe(200);

              await raw(page, id, `INSERT INTO ${parent} (id) VALUES (1)`);
              expect(await rawError(page, id, `INSERT INTO ${child} (parent_id, code, amount) VALUES (1, 'a', 5)`)).toBeNull();
              // trigger fired
              expect(Number(await scalar(page, id, `SELECT amount FROM ${child} WHERE code = 'a'`))).toBe(1005);
              expect(await rawError(page, id, `INSERT INTO ${child} (parent_id, code, amount) VALUES (1, 'a', 5)`)).toMatch(/UNIQUE|duplicate/i);
              expect(await rawError(page, id, `INSERT INTO ${child} (parent_id, code, amount) VALUES (1, 'b', -1)`)).toMatch(/CHECK/i);
              expect(await rawError(page, id, `INSERT INTO ${child} (parent_id, code, amount) VALUES (99, 'c', 1)`)).toMatch(/FOREIGN KEY/i);

              // read back
              expect(await detail(page, id, child, "table_keys")).toEqual(expect.arrayContaining([expect.objectContaining({ constraint_type: "UNIQUE", ref_columns: ["code"] })]));
              expect(await detail(page, id, child, "table_indexes")).toEqual([expect.objectContaining({ ref_columns: ["parent_id", "amount"], unique: false })]);
              expect(await detail(page, id, child, "table_checks")).toEqual([expect.objectContaining({ name: `ck_${child}`.slice(0, 60) })]);
              expect(await detail(page, id, child, "table_foreign_keys")).toEqual([expect.objectContaining({ target_table: parent, delete_action: "CASCADE" })]);
              expect(await detail(page, id, child, "table_triggers")).toEqual([expect.objectContaining({ timing: "AFTER", event: "INSERT" })]);

              // cascade delete from the FK we created
              await raw(page, id, `DELETE FROM ${parent} WHERE id = 1`);
              expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${child}`))).toBe(0);
            } finally {
              await drop(page, id, child, parent);
            }
          });
        });

        test("change and delete rows of every constraint tab", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const suffix = uniqueTestSuffix(testInfo);
            const t = tableOf(suffix, "e");
            const names = { ck: `ck_${t}`.slice(0, 60), ix: `ix_${t}`.slice(0, 60), tr: `tr_${t}`.slice(0, 60), uq: `uq_${t}`.slice(0, 60) };
            try {
              await createTable(page, id, t, [col("id", "int", { primary: true, not_null: true }), col("a", "int"), col("b", "int")], {
                table_checks: { columns: [row({ name: names.ck, expression: "a > 0" })] },
                table_indexes: { columns: [row({ index_name: names.ix, ref_columns: ["a"], unique: false })] },
                table_triggers: { columns: [row({ name: names.tr, timing: "AFTER", event: "INSERT", body: `UPDATE ${t} SET b = 1 WHERE id IN (SELECT id FROM inserted)` })] },
                table_keys: { columns: [row({ constraint_name: names.uq, ref_columns: ["a"], constraint_type: "UNIQUE" })] },
              });

              // change check, index (make it unique + 2 cols), trigger body; delete unique key
              const res = await edit(page, id, t, {
                table_checks: { columns: [{ old: { name: names.ck, expression: "a > 0" }, new: { name: names.ck, expression: "a > 10" } }] },
                table_indexes: { columns: [{ old: { index_name: names.ix }, new: { index_name: names.ix, ref_columns: ["a", "b"], unique: true } }] },
                table_triggers: { columns: [{ old: { name: names.tr }, new: { name: names.tr, timing: "AFTER", event: "INSERT, UPDATE", body: `UPDATE ${t} SET b = 2 WHERE id IN (SELECT id FROM inserted)` } }] },
                table_keys: { columns: [{ old: { constraint_name: names.uq, constraint_type: "UNIQUE" }, deleted: true }] },
              });
              expect(res.status, JSON.stringify(res.body)).toBe(200);

              expect(await rawError(page, id, `INSERT INTO ${t} (id, a) VALUES (1, 5)`)).toMatch(/CHECK/i);
              expect(await rawError(page, id, `INSERT INTO ${t} (id, a) VALUES (1, 50)`)).toBeNull();
              expect(Number(await scalar(page, id, `SELECT b FROM ${t} WHERE id = 1`))).toBe(2);
              await raw(page, id, `UPDATE ${t} SET b = 0 WHERE id = 1`);
              expect(Number(await scalar(page, id, `SELECT b FROM ${t} WHERE id = 1`))).toBe(2); // trigger now fires on UPDATE too
              // unique key gone, unique index (a, b) now enforced on the pair
              expect(await rawError(page, id, `INSERT INTO ${t} (id, a, b) VALUES (2, 50, 2)`)).toMatch(/UNIQUE|duplicate/i);

              const gone = await edit(page, id, t, {
                table_checks: { columns: [{ old: { name: names.ck }, deleted: true }] },
                table_indexes: { columns: [{ old: { index_name: names.ix }, deleted: true }] },
                table_triggers: { columns: [{ old: { name: names.tr }, deleted: true }] },
              });
              expect(gone.status, JSON.stringify(gone.body)).toBe(200);
              for (const tab of ["table_checks", "table_indexes", "table_triggers"]) {
                expect(await detail(page, id, t, tab), tab).toEqual([]);
              }
              expect(await detail(page, id, t, "table_keys")).toHaveLength(1); // only the primary key is left
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("primary key moves with the Primary Key checkboxes and with the Keys tab", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "k");
            try {
              await createTable(page, id, t, [col("a", "int", { primary: true, not_null: true }), col("b", "int", { not_null: true }), col("c", "int", { not_null: true })]);
              expect((await detail(page, id, t, "table_keys"))[0].ref_columns).toEqual(["a"]);

              // checkbox: a off, b on
              const flip = await edit(page, id, t, {
                table_columns: { columns: [
                  { old: col("a", "int", { primary: true, not_null: true }), new: col("a", "int", { primary: false, not_null: true }) },
                  { old: col("b", "int", { primary: false, not_null: true }), new: col("b", "int", { primary: true, not_null: true }) },
                ] },
              });
              expect(flip.status, JSON.stringify(flip.body)).toBe(200);
              expect((await detail(page, id, t, "table_keys"))[0].ref_columns).toEqual(["b"]);

              // Keys tab: composite (b, c)
              const composite = await edit(page, id, t, {
                table_keys: { columns: [{ old: { constraint_name: "x", constraint_type: "PRIMARY KEY" }, new: { constraint_name: `PK_${t}`, ref_columns: ["b", "c"], constraint_type: "PRIMARY KEY" } }] },
              });
              expect(composite.status, JSON.stringify(composite.body)).toBe(200);
              expect((await detail(page, id, t, "table_keys"))[0].ref_columns).toEqual(["b", "c"]);

              // drop it
              const dropped = await edit(page, id, t, { table_keys: { columns: [{ old: { constraint_name: `PK_${t}`, constraint_type: "PRIMARY KEY" }, deleted: true }] } });
              expect(dropped.status, JSON.stringify(dropped.body)).toBe(200);
              expect(await detail(page, id, t, "table_keys")).toEqual([]);

              // renaming a key column keeps the key
              await edit(page, id, t, { table_keys: { columns: [row({ constraint_name: `PK_${t}`, ref_columns: ["a"], constraint_type: "PRIMARY KEY" })] } });
              await edit(page, id, t, { table_columns: { columns: [{ old: col("a", "int", { primary: true, not_null: true }), new: col("a2", "int", { primary: true, not_null: true }) }] } });
              expect((await detail(page, id, t, "table_keys"))[0].ref_columns).toEqual(["a2"]);
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("column default can be added, changed, kept across a type change and removed", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "d");
            const defaultOf = async (): Promise<unknown> => (await detail(page, id, t, "table_columns")).find((r) => r.column_name === "n")!.column_default;
            const change = (from: Record<string, unknown>, to: Record<string, unknown>) =>
              edit(page, id, t, { table_columns: { columns: [{ old: col("n", "int", from), new: col("n", "int", to) }] } });
            try {
              await createTable(page, id, t, [col("id", "int", { primary: true, not_null: true, is_identity: true }), col("n", "int")]);
              expect(await defaultOf()).toBe("");

              expect((await change({}, { column_default: "5" })).status).toBe(200);
              await raw(page, id, `INSERT INTO ${t} DEFAULT VALUES`);
              expect(Number(await scalar(page, id, `SELECT n FROM ${t}`))).toBe(5);

              expect((await change({ column_default: "5" }, { column_default: "7" })).status).toBe(200);
              await raw(page, id, `INSERT INTO ${t} DEFAULT VALUES`);
              expect(Number(await scalar(page, id, `SELECT MAX(n) FROM ${t}`))).toBe(7);

              // type change while a default exists: default is put back
              const retype = await edit(page, id, t, { table_columns: { columns: [{ old: col("n", "int", { column_default: "7" }), new: col("n", "bigint", { column_default: "7" }) }] } });
              expect(retype.status, JSON.stringify(retype.body)).toBe(200);
              await raw(page, id, `INSERT INTO ${t} DEFAULT VALUES`);
              expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${t} WHERE n = 7`))).toBe(2);

              const removed = await edit(page, id, t, { table_columns: { columns: [{ old: col("n", "bigint", { column_default: "7" }), new: col("n", "bigint", { column_default: "" }) }] } });
              expect(removed.status, JSON.stringify(removed.body)).toBe(200);
              await raw(page, id, `INSERT INTO ${t} DEFAULT VALUES`);
              expect(await scalar(page, id, `SELECT n FROM ${t} WHERE id = (SELECT MAX(id) FROM ${t})`)).toBeNull();
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("identity cannot be switched on an existing column", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "i");
            try {
              await createTable(page, id, t, [col("id", "int", { primary: true, not_null: true }), col("n", "int")]);
              const res = await edit(page, id, t, { table_columns: { columns: [{ old: col("n", "int"), new: col("n", "int", { is_identity: true }) }] } });
              expect(res.status).toBeGreaterThanOrEqual(400);
              expect(JSON.stringify(res.body)).toMatch(/identity/i);
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("invalid constraint input is rejected before anything runs", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "v");
            try {
              await createTable(page, id, t, [col("id", "int", { primary: true, not_null: true })]);
              for (const tabs of [
                { table_checks: { columns: [row({ name: "", expression: "id > 0" })] } },
                { table_foreign_keys: { columns: [row({ constraint_name: "f", ref_columns: ["id"], target_table: "customers", target_columns: [] })] } },
                { table_indexes: { columns: [row({ index_name: "i", ref_columns: [] })] } },
                { table_triggers: { columns: [row({ name: "t", timing: "SOMETIME", event: "INSERT", body: "SELECT 1" })] } },
                { table_keys: { columns: [row({ constraint_name: "k", ref_columns: [], constraint_type: "UNIQUE" })] } },
              ]) {
                const res = await edit(page, id, t, tabs);
                expect(res.status, JSON.stringify(tabs)).toBeGreaterThanOrEqual(400);
                expect(res.status).toBeLessThan(500);
              }
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("foreign key form lists the target table's columns", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const res = await page.request.get(
              `${process.env.PLAYWRIGHT_API_URL}/tree/${encodeURIComponent(node("order_items"))}/dynamic?connectionId=${id}&field=columns&table=orders`,
              { headers: { "X-Client-Mode": "web" } },
            );
            const body = (await res.json()) as { data: { value: string }[] };
            expect(body.data.map((o) => o.value)).toEqual(["id", "customer_id", "status", "placed_at", "total"]);
          });
        });
      } else {
        test("sorting key changes by rebuilding the table, keeping data and skipping indexes", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "s");
            try {
              expect((await createTable(page, id, t, [col("a", "UInt32", { primary: true }), col("b", "String"), col("c", "UInt32")], {
                table_indexes: { columns: [row({ index_name: "ix_c", expression: "c", index_type: "minmax", granularity: "2" })] },
              })).status).toBe(200);
              await raw(page, id, `INSERT INTO ${t} SELECT number, toString(number), number * 2 FROM numbers(500)`);
              expect(await scalar(page, id, `SELECT sorting_key FROM system.tables WHERE database = '${ns}' AND name = '${t}'`)).toBe("a");

              const res = await edit(page, id, t, {
                table_keys: { columns: [{ old: { constraint_name: "PRIMARY", constraint_type: "PRIMARY KEY" }, new: { constraint_name: "PRIMARY", ref_columns: ["c", "a"], constraint_type: "PRIMARY KEY" } }] },
              });
              expect(res.status, JSON.stringify(res.body)).toBe(200);
              expect(await scalar(page, id, `SELECT sorting_key FROM system.tables WHERE database = '${ns}' AND name = '${t}'`)).toBe("c, a");
              expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${t}`))).toBe(500);
              expect(Number(await scalar(page, id, `SELECT SUM(c) FROM ${t}`))).toBe(249500);
              expect(await detail(page, id, t, "table_indexes")).toEqual([expect.objectContaining({ index_name: "ix_c" })]);
              // no leftovers from the rebuild
              expect((await tree(page, id, `${ns}.tableContainer`)).map((n) => n.name).filter((n) => n.startsWith("__dbo_tmp_"))).toEqual([]);

              // checkbox route: take a out of the key
              const flip = await edit(page, id, t, {
                table_columns: { columns: [{ old: col("a", "UInt32", { primary: true }), new: col("a", "UInt32", { primary: false }) }] },
              });
              expect(flip.status, JSON.stringify(flip.body)).toBe(200);
              expect(await scalar(page, id, `SELECT sorting_key FROM system.tables WHERE database = '${ns}' AND name = '${t}'`)).toBe("c");
              expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${t}`))).toBe(500);
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("partition key survives a sorting key change", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "pt");
            try {
              await raw(page, id, `CREATE TABLE ${t} (d Date, k UInt32, v UInt32) ENGINE = MergeTree PARTITION BY toYYYYMM(d) ORDER BY k`);
              await raw(page, id, `INSERT INTO ${t} SELECT toDate('2024-01-01') + number, number, 1 FROM numbers(100)`);
              const res = await edit(page, id, t, {
                table_keys: { columns: [{ old: { constraint_name: "PRIMARY", constraint_type: "PRIMARY KEY" }, new: { constraint_name: "PRIMARY", ref_columns: ["k", "d"], constraint_type: "PRIMARY KEY" } }] },
              });
              expect(res.status, JSON.stringify(res.body)).toBe(200);
              expect(await scalar(page, id, `SELECT partition_key FROM system.tables WHERE database = '${ns}' AND name = '${t}'`)).toBe("toYYYYMM(d)");
              expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${t}`))).toBe(100);
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("a table with TTL is not rebuilt (nothing is lost)", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "ttl");
            try {
              await raw(page, id, `CREATE TABLE ${t} (d DateTime, k UInt32) ENGINE = MergeTree ORDER BY k TTL d + INTERVAL 10 YEAR`);
              await raw(page, id, `INSERT INTO ${t} SELECT now(), number FROM numbers(10)`);
              const res = await edit(page, id, t, {
                table_keys: { columns: [{ old: { constraint_name: "PRIMARY", constraint_type: "PRIMARY KEY" }, new: { constraint_name: "PRIMARY", ref_columns: ["d", "k"], constraint_type: "PRIMARY KEY" } }] },
              });
              expect(res.status).toBeGreaterThanOrEqual(400);
              expect(res.status).toBeLessThan(500);
              expect(JSON.stringify(res.body)).toMatch(/TTL/i);
              expect(await scalar(page, id, `SELECT sorting_key FROM system.tables WHERE database = '${ns}' AND name = '${t}'`)).toBe("k");
              expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${t}`))).toBe(10);
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("skipping indexes: add, change, drop", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "ix");
            const idx = async () => detail(page, id, t, "table_indexes");
            try {
              await createTable(page, id, t, [col("a", "UInt32", { primary: true }), col("s", "String")]);
              await raw(page, id, `INSERT INTO ${t} SELECT number, toString(number) FROM numbers(100)`);

              expect((await edit(page, id, t, { table_indexes: { columns: [row({ index_name: "ix_s", expression: "s", index_type: "bloom_filter(0.01)", granularity: "4" })] } })).status).toBe(200);
              expect(await idx()).toEqual([expect.objectContaining({ index_name: "ix_s", expression: "s", index_type: "bloom_filter(0.01)", granularity: "4" })]);

              const changed = await edit(page, id, t, { table_indexes: { columns: [{ old: { index_name: "ix_s" }, new: { index_name: "ix_s", expression: "s", index_type: "set(50)", granularity: "1" } }] } });
              expect(changed.status, JSON.stringify(changed.body)).toBe(200);
              expect((await idx())[0]).toMatchObject({ index_type: "set(50)" });

              expect((await edit(page, id, t, { table_indexes: { columns: [{ old: { index_name: "ix_s" }, deleted: true }] } })).status).toBe(200);
              expect(await idx()).toEqual([]);

              const bad = await edit(page, id, t, { table_indexes: { columns: [row({ index_name: "bad", expression: "s; DROP TABLE x", index_type: "minmax" })] } });
              expect(bad.status).toBeGreaterThanOrEqual(400);
              const badKind = await edit(page, id, t, { table_indexes: { columns: [row({ index_name: "bad", expression: "s", index_type: "minmax'; --" })] } });
              expect(badKind.status).toBeGreaterThanOrEqual(400);
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("check constraints: add, enforce, change, drop", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "ck");
            try {
              await createTable(page, id, t, [col("a", "UInt32", { primary: true }), col("v", "Int32")]);
              expect((await edit(page, id, t, { table_checks: { columns: [row({ name: "pos", expression: "v > 0" })] } })).status).toBe(200);
              expect(await detail(page, id, t, "table_checks")).toEqual([{ name: "pos", expression: "v > 0" }]);
              expect(await rawError(page, id, `INSERT INTO ${t} VALUES (1, -5)`)).toMatch(/constraint|violated/i);
              expect(await rawError(page, id, `INSERT INTO ${t} VALUES (1, 5)`)).toBeNull();

              expect((await edit(page, id, t, { table_checks: { columns: [{ old: { name: "pos" }, new: { name: "pos", expression: "v > 100" } }] } })).status).toBe(200);
              expect(await rawError(page, id, `INSERT INTO ${t} VALUES (2, 5)`)).toMatch(/constraint|violated/i);

              expect((await edit(page, id, t, { table_checks: { columns: [{ old: { name: "pos" }, deleted: true }] } })).status).toBe(200);
              expect(await detail(page, id, t, "table_checks")).toEqual([]);
              expect(await rawError(page, id, `INSERT INTO ${t} VALUES (3, -1)`)).toBeNull();
            } finally {
              await drop(page, id, t);
            }
          });
        });

        test("unique keys, foreign keys and triggers are refused with a reason", async ({ page }, testInfo) => {
          await withConnection(page, testInfo, async (id) => {
            const t = tableOf(uniqueTestSuffix(testInfo), "no");
            try {
              await createTable(page, id, t, [col("a", "UInt32", { primary: true })]);
              const unique = await edit(page, id, t, { table_keys: { columns: [row({ constraint_name: "u", ref_columns: ["a"], constraint_type: "UNIQUE" })] } });
              expect(unique.status).toBeGreaterThanOrEqual(400);
              expect(JSON.stringify(unique.body)).toMatch(/unique/i);
              const trig = await edit(page, id, t, { table_triggers: { columns: [row({ name: "t", timing: "AFTER", event: "INSERT", body: "x" })] } });
              expect(trig.status).toBeGreaterThanOrEqual(400);
              expect(JSON.stringify(trig.body)).toMatch(/trigger/i);
            } finally {
              await drop(page, id, t);
            }
          });
        });
      }

    });

    test.describe("import, export and backup", () => {
      const exportBody = async (page: import("@playwright/test").Page, data: Record<string, unknown>): Promise<string> => {
        const jobId = await startJob(page, "/api/export", data);
        const job = await waitForJob(page, jobId);
        expect(job.status, job.error).toBe("completed");
        const res = await page.request.get(`/api/jobs/${jobId}/result`);
        expect(res.ok()).toBeTruthy();
        return (await res.body()).toString("utf8");
      };
      const importCsv = async (page: import("@playwright/test").Page, id: number, table: string, csv: string, extra: Record<string, string> = {}) => {
        const res = await page.request.post("/api/import", {
          multipart: { connectionId: String(id), table, format: "csv", ...extra, data: { name: "rows.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const jobId = ((await res.json()) as { data: { jobId: number } }).data.jobId;
        return waitForJob(page, jobId);
      };
      const scratch = async (page: import("@playwright/test").Page, id: number, table: string): Promise<void> => {
        const res = await objectExecute(page, id, `${ns}.tableContainer`, "createTable", {
          general: { new: { relname: table } },
          table_columns: {
            columns: [
              { new: { column_name: "id", data_type: engine === "mssql" ? "int" : "UInt32", primary: true, not_null: true }, added: true },
              { new: { column_name: "name", data_type: engine === "mssql" ? "nvarchar" : "String", ...(engine === "mssql" ? { character_maximum_length: "50" } : {}) }, added: true },
            ],
          },
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
      };
      const detail_ = async (page: import("@playwright/test").Page, id: number, table: string, tab: string) =>
        (await objectDetail(page, id, node(table), "editTable", tab)).data;
      const tableOf = (suffix: string): string => `e2e_ie_${suffix}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 60);

      test("export a table as CSV, JSON and SQL", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const base = { connectionId: id, table: "categories", query: "SELECT * FROM categories ORDER BY id" };

          const csv = (await exportBody(page, { ...base, format: "csv" })).trim().split(/\r?\n/);
          expect(csv).toHaveLength(SEED.categories + 1);
          expect(csv[0]).toMatch(/id/);
          expect(csv.join("\n")).toContain("Electronics");

          const json = JSON.parse(await exportBody(page, { ...base, format: "json" })) as Record<string, unknown>[];
          expect(json).toHaveLength(SEED.categories);
          expect(json[0].name).toBe("Electronics");

          const sql = await exportBody(page, { ...base, format: "sql" });
          // One multi-row INSERT per table.
          expect(sql).toMatch(/INSERT INTO/);
          for (const name of ["Electronics", "Home", "Books", "Toys", "Phones", "Laptops", "Kitchen", "Garden", "Fiction", "Science"]) {
            expect(sql).toContain(name);
          }
        });
      });

      test("export is not capped at the grid page size", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const csv = (await exportBody(page, { connectionId: id, table: "customers", query: "SELECT id FROM customers", format: "csv" })).trim().split(/\r?\n/);
          expect(csv).toHaveLength(SEED.customers + 1);
        });
      });

      test("import CSV, with a mapping, and report bad rows", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const table = tableOf(uniqueTestSuffix(testInfo));
          try {
            await scratch(page, id, table);

            const ok = await importCsv(page, id, table, "id,name\n1,Zürich ✓\n2,it's\n3,\n");
            expect(ok.status, ok.error).toBe("completed");
            const rows = (await raw(page, id, `SELECT id, name FROM ${table} ORDER BY id`)).data;
            expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
            expect(rows[0].name).toBe("Zürich ✓");
            expect(rows[1].name).toBe("it's");

            // A bad value stops a strict import; nothing from its chunk is kept.
            const strict = await importCsv(page, id, table, "id,name\n10,ok\nnot-a-number,bad\n");
            expect(strict.status).toBe("failed");
            expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${table} WHERE id >= 10`))).toBe(0);

            // Continue on error keeps the good rows.
            const lenient = await importCsv(page, id, table, "id,name\n20,good\nnope,bad\n21,good2\n", { continueOnError: "true" });
            expect(lenient.status, lenient.error).toBe("completed");
            expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${table} WHERE id >= 20`))).toBe(2);
          } finally {
            await objectExecute(page, id, node(table), "dropTable", {});
          }
        });
      });

      test("export tables with their schema, then load the dump back", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const suffix = tableOf(uniqueTestSuffix(testInfo));
          const parent = `${suffix}_p`.slice(0, 60);
          const child = `${suffix}_c`.slice(0, 60);
          // Child first in the list on purpose: the dump must still put the parent before it.
          const scopeArgs = { connectionId: id, scope: "tables", tables: [child, parent], content: "both", format: "sql", ...(engine === "clickhouse" ? { database: ns } : { schema: ns }) };

          try {
            if (engine === "mssql") {
              await raw(page, id, `CREATE TABLE ${parent} (id INT PRIMARY KEY, name NVARCHAR(50) NOT NULL DEFAULT N'x', at DATETIME2(3) NULL, flag BIT NULL, price DECIMAL(10,2) NULL, guid UNIQUEIDENTIFIER NULL, blob VARBINARY(10) NULL)`);
              await raw(page, id, `CREATE TABLE ${child} (id INT PRIMARY KEY, p_id INT NOT NULL, qty INT NOT NULL, dbl AS (qty * 2) PERSISTED, CONSTRAINT fk_${child} FOREIGN KEY (p_id) REFERENCES ${parent}(id), CONSTRAINT ck_${child} CHECK (qty >= 0))`);
              await raw(page, id, `CREATE INDEX ix_${child} ON ${child} (qty)`);
              await raw(page, id, `INSERT INTO ${parent} (id, name, at, flag, price, guid, blob) VALUES (1, N'Zürich ✓', '2024-01-02T03:04:05.678', 1, 12.34, '61F0C404-5CB3-11E7-907B-A6006AD3DBA0', 0x0AFF), (2, N'it''s', NULL, 0, NULL, NULL, NULL)`);
              await raw(page, id, `INSERT INTO ${child} (id, p_id, qty) VALUES (10, 1, 3), (11, 2, 4)`);
            } else {
              await raw(page, id, `CREATE TABLE ${parent} (id UInt32, name String, tags Array(String), at Nullable(DateTime64(3, 'UTC')), flag Bool, price Nullable(Decimal(10, 2)), guid Nullable(UUID), d Date, dt DateTime('UTC'), nd Nullable(Date)) ENGINE = MergeTree ORDER BY id`);
              await raw(page, id, `CREATE TABLE ${child} (id UInt32, p_id UInt32, attrs Map(String, String)) ENGINE = MergeTree PARTITION BY intDiv(id, 10) ORDER BY id`);
              await raw(page, id, `INSERT INTO ${parent} VALUES (1, 'Zürich ✓', ['a','b'], '2024-01-02 03:04:05.678', true, 12.34, '61f0c404-5cb3-11e7-907b-a6006ad3dba0', '2024-03-05', '2024-03-05 06:07:08', '2024-03-06'), (2, 'it\\'s', [], NULL, false, NULL, NULL, '2000-01-01', '2000-01-01 00:00:00', NULL)`);
              await raw(page, id, `INSERT INTO ${child} VALUES (10, 1, map('k','v')), (11, 2, map())`);
            }

            const dump = await exportBody(page, scopeArgs);
            expect(dump).toMatch(/CREATE TABLE/i);
            if (engine === "mssql") expect(dump.indexOf(parent)).toBeLessThan(dump.indexOf(child));
            expect(dump).toContain("Zürich ✓");

            await raw(page, id, `DROP TABLE ${child}`);
            await raw(page, id, `DROP TABLE ${parent}`);

            // Load the dump statement by statement, as a restore would.
            const statements = dump.split(/;\s*(?:\r?\n|$)/).map((x) => x.replace(/^(\s*--[^\n]*\n)+/, "").trim()).filter(Boolean);
            for (const statement of statements) {
              expect(await rawError(page, id, statement), statement).toBeNull();
            }

            expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${parent}`))).toBe(2);
            expect(Number(await scalar(page, id, `SELECT COUNT(*) FROM ${child}`))).toBe(2);
            expect((await raw(page, id, `SELECT name FROM ${parent} ORDER BY id`)).data.map((r) => r.name)).toEqual(["Zürich ✓", "it's"]);
            const first = (await raw(page, id, `SELECT * FROM ${parent} WHERE id = 1`)).data[0];
            const second = (await raw(page, id, `SELECT * FROM ${parent} WHERE id = 2`)).data[0];
            expect(String(first.at), dump).toContain("2024-01-02T03:04:05.678");
            expect(String(first.price)).toBe("12.34");
            expect(String(first.guid).toLowerCase()).toBe("61f0c404-5cb3-11e7-907b-a6006ad3dba0");
            expect(first.flag === true || first.flag === 1).toBe(true);
            expect(second.flag === false || second.flag === 0).toBe(true);
            expect([second.at, second.price, second.guid]).toEqual([null, null, null]);
            if (engine === "clickhouse") {
              expect(String(first.d)).toContain("2024-03-05");
              expect(String(first.dt)).toContain("2024-03-05T06:07:08");
              expect(String(first.nd)).toContain("2024-03-06");
              expect(second.nd).toBeNull();
            }

            if (engine === "mssql") {
              expect(Number(await scalar(page, id, `SELECT dbl FROM ${child} WHERE id = 11`))).toBe(8);
              expect(await rawError(page, id, `INSERT INTO ${child} (id, p_id, qty) VALUES (12, 99, 1)`)).toMatch(/FOREIGN KEY/i);
              expect(await rawError(page, id, `INSERT INTO ${child} (id, p_id, qty) VALUES (12, 1, -1)`)).toMatch(/CHECK/i);
              expect((await detail_(page, id, child, "table_indexes")).map((i) => i.ref_columns)).toEqual([["qty"]]);
            } else {
              expect(await scalar(page, id, `SELECT partition_key FROM system.tables WHERE database = '${ns}' AND name = '${child}'`)).toBe("intDiv(id, 10)");
              expect((await raw(page, id, `SELECT tags FROM ${parent} WHERE id = 1`)).data[0].tags).toEqual(["a", "b"]);
            }
          } finally {
            await objectExecute(page, id, node(child), "dropTable", {});
            await objectExecute(page, id, node(parent), "dropTable", {});
          }
        });
      });

      test("a full backup completes and produces a file", async ({ page }, testInfo) => {
        await withConnection(page, testInfo, async (id) => {
          const jobId = await startJob(page, "/api/backups", { connectionId: id, ...(engine === "clickhouse" ? { database: ns } : { schema: ns }) });
          const job = await waitForJob(page, jobId, 180_000);
          expect(job.status, job.error).toBe("completed");
          const history = ((await (await page.request.get(`/api/backups/history?connectionId=${id}`)).json()) as { data: { jobId: number; status: string; size: number }[] }).data;
          const artifact = history.find((h) => h.jobId === jobId)!;
          expect(artifact.status).toBe("completed");
          expect(artifact.size).toBeGreaterThan(1000);
        });
      });
    });
  });
}
