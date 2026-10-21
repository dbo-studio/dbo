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

/** The new ops, index folding, the live table definition and the undo SQL on Postgres. */

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

test.describe("Persisted changeset ops (postgres)", () => {
  test("alter, drop, index, folded index, before and undo", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `cs-ops-${suffix}`;
    const table = `e2e_ops_${suffix}`;
    const folded = `e2e_ops_folded_${suffix}`;
    const scope = { database: "default", schema: "public" };

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("postgresql", connectionName),
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
            `SELECT column_name AS name, data_type AS type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${name}' ORDER BY ordinal_position`,
          );

        await rows(
          page,
          connectionId,
          `CREATE TABLE ${table} (id INTEGER PRIMARY KEY, email TEXT NOT NULL DEFAULT 'x', legacy TEXT)`,
        );
        await rows(
          page,
          connectionId,
          `CREATE INDEX ${table}_legacy_idx ON ${table} (legacy)`,
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
            notNull: true,
            isPrimaryKey: false,
          });
          expect(
            before.columns.find((column) => column.name === "email")?.default,
          ).toContain("x");
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
        let appliedProposal: Awaited<ReturnType<typeof proposeChangeset>> | undefined;

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
                column: { name: "phone", type: "TEXT" },
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

          expect((await columnsOf(table)).map((column) => column.name)).toEqual(
            ["id", "email", "phone"],
          );
          expect(
            (await columnsOf(table)).find((column) => column.name === "email")
              ?.type,
          ).toBe("character varying");
          expect(
            await rows(
              page,
              connectionId,
              `SELECT indexname FROM pg_indexes WHERE tablename = '${table}' AND indexname = 'idx_${table}_email'`,
            ),
          ).toHaveLength(1);

          undone = await undoSql(page, proposal);
          appliedProposal = proposal;
          expect(undone).toEqual([
            `ALTER TABLE "public"."${table}" DROP COLUMN "phone"`,
            `DROP INDEX "public"."idx_${table}_email"`,
          ]);
        });

        await test.step("Undo becomes a pending change that applies the undo SQL", async () => {
          const { chatId, changeset } = appliedProposal as NonNullable<typeof appliedProposal>;
          const response = await page.request.post(`/api/ai/chats/${chatId}/changesets/${changeset.id}/undo`);
          expect(response.status()).toBe(200);
          const undo = ((await response.json()) as { data: typeof changeset }).data;
          expect(undo.ops.map((op) => op.sql)).toEqual(undone);
          expect((await applyChangeset(page, { chatId, changeset: undo })).status()).toBe(200);
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
                  { name: "id", type: "INTEGER", primary: true },
                  { name: "code", type: "TEXT" },
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
              `SELECT indexdef FROM pg_indexes WHERE tablename = '${folded}' AND indexname = 'idx_${folded}_code'`,
            ),
          ).toHaveLength(1);
          expect(await undoSql(page, proposal)).toEqual([
            `DROP TABLE "public"."${folded}"`,
          ]);

          await rows(page, connectionId, `DROP TABLE ${folded}`);
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

        await test.step("A new database with its schema and tables is created in one apply", async () => {
          const blog = `e2e_blog_${suffix}`.toLowerCase();
          const proposal = await proposeChangeset(page, llm, connectionId, [
            { op: "create_database", name: blog },
            { op: "create_schema", name: "app" },
            {
              op: "create_table",
              table: "users",
              columns: [
                { name: "id", type: "INTEGER", primary: true },
                { name: "email", type: "TEXT" },
              ],
            },
          ]);
          try {
            expect((await applyChangeset(page, proposal)).status()).toBe(200);
            expect(await changesetStatuses(page, proposal)).toEqual([
              "applied",
              "applied",
              "applied",
            ]);
            expect(
              await rows(
                page,
                connectionId,
                `SELECT datname FROM pg_database WHERE datname = '${blog}'`,
              ),
            ).toHaveLength(1);
            expect(await undoSql(page, proposal)).toEqual([
              `DROP DATABASE "${blog}"`,
            ]);
          } finally {
            await rows(
              page,
              connectionId,
              `DROP DATABASE IF EXISTS "${blog}" WITH (FORCE)`,
            );
          }
        });

        await rows(page, connectionId, `DROP TABLE ${table}`);
      });
    } finally {
      await llm.stop();
    }
  });
});
