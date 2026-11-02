import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { clearActiveAiProfile } from "../../helpers/aiSetup";
import {
  applyChangeset,
  previewWrite,
  proposeChangeset,
  type ProposedChangeset,
} from "../../helpers/changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "../../helpers/fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/** Applied data changes can be undone: an UPDATE, a DELETE and an INSERT each come back; a table without a key says why not. */
test.describe("Undo for data changes", () => {
  test("update, delete and insert are undone; no key, no undo", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `ai-data-undo-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-ai-data-undo-${suffix}.db`;
    const people = `people_${suffix}`;
    const loose = `loose_${suffix}`;
    ensureSqliteDbFile(dbPath);

    const llm = new FakeLlm();
    const llmUrl = await llm.start();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await clearActiveAiProfile(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(
          getDbConfig("sqlite", connectionName, dbPath),
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
        const query = async (
          sql: string,
        ): Promise<Array<Record<string, unknown>>> => {
          const response = await page.request.post("/api/query/raw", {
            data: { connectionId, query: sql },
          });
          expect(response.status(), sql).toBe(200);
          return (
            (await response.json()) as {
              data: { data: Array<Record<string, unknown>> };
            }
          ).data.data;
        };
        const snapshot = async (): Promise<string> =>
          JSON.stringify(
            (
              await query(`SELECT id, name, note FROM ${people} ORDER BY id`)
            ).map((row) => [row.id, row.name, row.note]),
          );
        const applyAndUndo = async (
          sql: string,
        ): Promise<ProposedChangeset> => {
          const proposal = await previewWrite(page, llm, connectionId, sql);
          expect((await applyChangeset(page, proposal)).status()).toBe(200);
          const undo = await page.request.post(
            `/api/ai/chats/${proposal.chatId}/changesets/${proposal.changeset.id}/undo`,
          );
          expect(undo.status()).toBe(200);
          const changeset = (
            (await undo.json()) as { data: ProposedChangeset["changeset"] }
          ).data;
          expect(
            (
              await applyChangeset(page, { chatId: proposal.chatId, changeset })
            ).status(),
          ).toBe(200);
          return proposal;
        };

        await applyChangeset(
          page,
          await proposeChangeset(page, llm, connectionId, [
            {
              op: "create_table",
              table: people,
              columns: [
                { name: "id", type: "INTEGER", primary: true },
                { name: "name", type: "TEXT" },
                { name: "note", type: "TEXT" },
              ],
            },
          ]),
        );
        await query(
          `INSERT INTO ${people} VALUES (1, 'Ana', 'it''s fine'), (2, 'Li', NULL), (3, 'Sam', 'x')`,
        );
        const original = await snapshot();

        await test.step("An UPDATE is undone, quotes and NULLs included", async () => {
          await applyAndUndo(
            `UPDATE ${people} SET note = 'changed', name = 'X' WHERE id IN (1, 2)`,
          );
          expect(await snapshot()).toBe(original);
        });

        await test.step("A DELETE is undone", async () => {
          await applyAndUndo(`DELETE FROM ${people} WHERE id >= 2`);
          expect(await snapshot()).toBe(original);
        });

        await test.step("An INSERT is undone", async () => {
          await applyAndUndo(
            `INSERT INTO ${people} (id, name) VALUES (10, 'New'), (11, 'Newer')`,
          );
          expect(await snapshot()).toBe(original);
        });

        await test.step("A table without a primary key says why it cannot be undone", async () => {
          await query(`CREATE TABLE ${loose} (name TEXT)`);
          await query(`INSERT INTO ${loose} VALUES ('a')`);
          const proposal = await previewWrite(
            page,
            llm,
            connectionId,
            `UPDATE ${loose} SET name = 'b' WHERE name = 'a'`,
          );
          expect((await applyChangeset(page, proposal)).status()).toBe(200);
          const list = (await (
            await page.request.get(
              `/api/ai/chats/${proposal.chatId}/changesets`,
            )
          ).json()) as {
            data: Array<{
              id: number;
              undoSql: string[];
              ops: Array<{ undoNote?: string }>;
            }>;
          };
          const changeset = list.data.find(
            (item) => item.id === proposal.changeset.id,
          );
          expect(changeset?.undoSql).toEqual([]);
          expect(changeset?.ops[0].undoNote).toBe(
            "the table has no primary key",
          );
        });
      });
    } finally {
      removeSqliteDbFile(dbPath);
      await llm.stop();
    }
  });
});
