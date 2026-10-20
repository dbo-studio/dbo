import { expect, test, type Page } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import {
  applyChangeset,
  changesetBefore,
  changesetStatuses,
  previewWrite,
  proposeChangeset,
  undoSql,
} from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/** The new ops, index folding, the live table definition, undo SQL and the partial-apply report on MySQL. */

async function rows(
  page: Page,
  connectionId: number,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const response = await page.request.post("/api/query/raw", {
    data: { connectionId, query },
  });
  expect(response.status(), query).toBe(200);
  return (
    (await response.json()) as {
      data: { data: Array<Record<string, unknown>> };
    }
  ).data.data;
}

test.describe("Persisted changeset ops (mysql)", () => {
  test("alter, drop, index, folded index, before, undo and partial failure", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `cs-ops-${suffix}`;
    const table = `e2e_ops_${suffix}`;
    const folded = `e2e_ops_folded_${suffix}`;
    const fresh = `e2e_ops_fresh_${suffix}`;
    const scope = { database: "default" };

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("mysql", connectionName),
        );
        await pointProviderAtFakeLlm(page, llmUrl);
        const connections = (await (
          await page.request.get("/api/connections")
        ).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find(
          (item) => item.name === connectionName,
        )?.id as number;
        const columnsOf = async (
          name: string,
        ): Promise<Array<Record<string, unknown>>> =>
          rows(
            page,
            connectionId,
            `SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'default' AND TABLE_NAME = '${name}' ORDER BY ORDINAL_POSITION`,
          );
        const tableExists = async (name: string): Promise<boolean> =>
          (
            await rows(
              page,
              connectionId,
              `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'default' AND TABLE_NAME = '${name}'`,
            )
          ).length === 1;

        await rows(
          page,
          connectionId,
          `CREATE TABLE \`${table}\` (id INT PRIMARY KEY, email VARCHAR(50) NOT NULL DEFAULT 'x', legacy VARCHAR(50))`,
        );
        await rows(
          page,
          connectionId,
          `CREATE INDEX \`${table}_legacy_idx\` ON \`${table}\` (legacy)`,
        );

        await test.step("Before is the live definition with nullability, defaults and indexes", async () => {
          const proposal = await proposeChangeset(
            page,
            llm,
            connectionId,
            [
              {
                op: "alter_column",
                table,
                column: { name: "email", type: "VARCHAR(120)" },
              },
            ],
            scope,
          );
          const before = (await changesetBefore(page, proposal))[table];

          expect(
            before.columns.find((column) => column.name === "email"),
          ).toMatchObject({
            dataType: "varchar(50)",
            notNull: true,
            default: "x",
            isPrimaryKey: false,
          });
          expect(
            before.columns.find((column) => column.name === "id")?.isPrimaryKey,
          ).toBe(true);
          expect(before.indexes).toContainEqual({
            name: `${table}_legacy_idx`,
            columns: ["legacy"],
            unique: false,
          });
        });

        let undone: string[] = [];

        await test.step("Alter, index, add and drop apply together", async () => {
          const proposal = await proposeChangeset(
            page,
            llm,
            connectionId,
            [
              {
                op: "alter_column",
                table,
                column: { name: "email", type: "VARCHAR(120)", notNull: true },
              },
              { op: "add_index", table, indexColumns: ["email"], unique: true },
              { op: "drop_column", table, columnName: "legacy" },
              {
                op: "add_column",
                table,
                column: { name: "phone", type: "VARCHAR(30)" },
              },
            ],
            scope,
          );
          expect((await applyChangeset(page, proposal)).status()).toBe(200);
          expect(await changesetStatuses(page, proposal)).toEqual([
            "applied",
            "applied",
            "applied",
            "applied",
          ]);

          const columns = await columnsOf(table);
          expect(columns.map((column) => column.name)).toEqual([
            "id",
            "email",
            "phone",
          ]);
          expect(columns.find((column) => column.name === "email")?.type).toBe(
            "varchar(120)",
          );
          expect(
            await rows(
              page,
              connectionId,
              `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'default' AND TABLE_NAME = '${table}' AND INDEX_NAME = 'idx_${table}_email'`,
            ),
          ).toHaveLength(1);

          undone = await undoSql(page, proposal);
          expect(undone).toEqual([
            `ALTER TABLE \`default\`.\`${table}\` DROP COLUMN \`phone\``,
            `DROP INDEX \`idx_${table}_email\` ON \`default\`.\`${table}\``,
          ]);
        });

        await test.step("The undo SQL runs", async () => {
          for (const statement of undone) {
            await rows(page, connectionId, statement);
          }
          expect((await columnsOf(table)).map((column) => column.name)).toEqual(
            ["id", "email"],
          );
        });

        await test.step("An index on a table created in the same changeset is part of its creation", async () => {
          const proposal = await proposeChangeset(
            page,
            llm,
            connectionId,
            [
              {
                op: "create_table",
                table: folded,
                columns: [
                  { name: "id", type: "INT", primary: true },
                  { name: "code", type: "VARCHAR(20)" },
                ],
              },
              {
                op: "add_index",
                table: folded,
                indexColumns: ["code"],
                unique: true,
              },
            ],
            scope,
          );
          expect((await applyChangeset(page, proposal)).status()).toBe(200);
          expect(await changesetStatuses(page, proposal)).toEqual([
            "applied",
            "applied",
          ]);
          expect(
            await rows(
              page,
              connectionId,
              `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'default' AND TABLE_NAME = '${folded}' AND INDEX_NAME = 'idx_${folded}_code'`,
            ),
          ).toHaveLength(1);
          expect(await undoSql(page, proposal)).toEqual([
            `DROP TABLE \`default\`.\`${folded}\``,
          ]);

          await rows(page, connectionId, `DROP TABLE \`${folded}\``);
        });

        await test.step("MySQL stops at the failing step and reports each op", async () => {
          const column = [{ name: "id", type: "INT", primary: true }];
          // The first create is valid; the second collides with an existing table.
          const proposal = await proposeChangeset(
            page,
            llm,
            connectionId,
            [
              { op: "create_table", table: fresh, columns: column },
              { op: "create_table", table, columns: column },
            ],
            scope,
          );
          const response = await applyChangeset(page, proposal);
          expect(response.status()).toBe(200);

          const ops = (
            (await response.json()) as {
              data: { ops: Array<{ status: string; error?: string }> };
            }
          ).data.ops;
          expect(ops.map((op) => op.status)).toEqual(["applied", "failed"]);
          expect(ops[1].error).toBeTruthy();
          // DDL is not transactional on MySQL: what ran stays.
          expect(await tableExists(fresh)).toBe(true);

          await rows(page, connectionId, `DROP TABLE \`${fresh}\``);
        });

        await test.step("A data change is counted without running, then applied", async () => {
          const emails = async (): Promise<unknown[]> =>
            (
              await rows(
                page,
                connectionId,
                `SELECT email FROM ${table} ORDER BY id`,
              )
            ).map((row) => row.email);
          await rows(
            page,
            connectionId,
            `INSERT INTO ${table} (id, email) VALUES (1, 'a'), (2, 'b')`,
          );

          const proposal = await previewWrite(
            page,
            llm,
            connectionId,
            `UPDATE ${table} SET email = 'z' WHERE id = 1`,
            scope,
          );
          expect(proposal.changeset.ops).toMatchObject([
            { op: "write", affectedRows: 1, status: "pending" },
          ]);
          expect(await emails()).toEqual(["a", "b"]);

          expect((await applyChangeset(page, proposal)).status()).toBe(200);
          expect(await changesetStatuses(page, proposal)).toEqual(["applied"]);
          expect(await emails()).toEqual(["z", "b"]);
          expect(await undoSql(page, proposal)).toEqual([]);
        });

        await test.step("A new database with its tables is created in one apply", async () => {
          const blog = `e2e_blog_${suffix}`.toLowerCase();
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_database", name: blog },
            {
              op: "create_table",
              table: "users",
              columns: [
                { name: "id", type: "INT", primary: true },
                { name: "email", type: "VARCHAR(100)" },
              ],
            },
          ]);
          try {
            expect((await applyChangeset(page, proposal)).status()).toBe(200);
            expect(await changesetStatuses(page, proposal)).toEqual([
              "applied",
              "applied",
            ]);
            expect(
              await rows(
                page,
                connectionId,
                `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${blog}'`,
              ),
            ).toHaveLength(1);
            expect(await undoSql(page, proposal)).toEqual([
              `DROP DATABASE \`${blog}\``,
            ]);
          } finally {
            await rows(
              page,
              connectionId,
              `DROP DATABASE IF EXISTS \`${blog}\``,
            );
          }
        });

        await rows(page, connectionId, `DROP TABLE \`${table}\``);
      });
    } finally {
      await llm.stop();
    }
  });
});
