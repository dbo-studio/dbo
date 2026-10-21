import { expect, type Page } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { ConnectionPage } from "../pages";
import { clearActiveAiProfile } from "./aiSetup";
import {
  applyChangeset,
  applyUndo,
  changesetStatuses,
  proposeChangeset,
  undoSql,
  type ProposedChangeset,
} from "./changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "./fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";

/**
 * Renames, a check constraint, a view and a dropped table, proposed by a
 * scripted model and applied on the engine; reversible ones are undone.
 * SQLite cannot add constraints to a table and says so.
 */
export async function checkMoreSchemaOps(
  page: Page,
  engine: DbEngine,
  connectionName: string,
  suffix: string,
  sqlitePath?: string,
): Promise<void> {
  if (sqlitePath) ensureSqliteDbFile(sqlitePath);
  const llm = new FakeLlm();
  const llmUrl = await llm.start();
  const table = `items_${suffix}`;
  const renamed = `goods_${suffix}`;
  const view = `cheap_${suffix}`;
  let connectionId = 0;
  const query = async (
    sql: string,
  ): Promise<{ ok: boolean; rows: Array<Record<string, unknown>> }> => {
    const response = await page.request.post("/api/query/raw", {
      data: { connectionId, query: sql },
    });
    const body = (await response.json()) as {
      data?: { data: Array<Record<string, unknown>> };
    };
    const rows = body.data?.data ?? [];
    // The raw endpoint reports a failed statement as a row whose Message is the error.
    const failed = rows.some(
      (row) => typeof row.Message === "string" && row.Message !== "OK",
    );
    return { ok: response.status() === 200 && !failed, rows };
  };

  try {
    const connectionPage = new ConnectionPage(page);
    await clearActiveAiProfile(page);
    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.setupConnection(
      getDbConfig(engine, connectionName, sqlitePath),
    );
    await pointProviderAtFakeLlm(page, llmUrl);
    const connections = (await (
      await page.request.get("/api/connections")
    ).json()) as {
      data: Array<{ id: number; name: string }>;
    };
    connectionId = connections.data.find((item) => item.name === connectionName)
      ?.id as number;
    const scope =
      engine === "mysql"
        ? { database: "default" }
        : engine === "postgresql"
          ? { database: "default", schema: "public" }
          : undefined;
    const propose = (
      ops: Array<Record<string, unknown>>,
    ): Promise<ProposedChangeset> =>
      proposeChangeset(page, llm, connectionId, ops, scope);

    expect(
      (
        await query(
          `CREATE TABLE ${table} (id INTEGER PRIMARY KEY, price INTEGER, title VARCHAR(50))`,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await query(
          `INSERT INTO ${table} VALUES (1, 5, 'pen'), (2, 50, 'lamp')`,
        )
      ).ok,
    ).toBe(true);

    const ops: Array<Record<string, unknown>> = [
      { op: "rename_column", table, columnName: "title", name: "label" },
      {
        op: "create_view",
        name: view,
        sql: `SELECT id, price FROM ${table} WHERE price < 10`,
      },
    ];
    if (engine !== "sqlite")
      ops.push({
        op: "add_check",
        table,
        name: `chk_price_${suffix}`,
        sql: "price >= 0",
      });

    const proposal = await propose(ops);
    expect((await applyChangeset(page, proposal)).status()).toBe(200);
    expect(await changesetStatuses(page, proposal)).toEqual(
      ops.map(() => "applied"),
    );
    expect(
      (await query(`SELECT label FROM ${table} WHERE id = 1`)).rows[0]?.label,
    ).toBe("pen");
    expect(
      (await query(`SELECT id FROM ${view}`)).rows.map((row) => Number(row.id)),
    ).toEqual([1]);
    if (engine !== "sqlite") {
      expect(
        (await query(`INSERT INTO ${table} (id, price) VALUES (3, -1)`)).ok,
        "the check refuses a negative price",
      ).toBe(false);
    }

    // Every op here can be taken back: the view goes, the check goes, the column gets its name back.
    expect((await undoSql(page, proposal)).length).toBe(ops.length);
    await applyUndo(page, proposal);
    expect(
      (await query(`SELECT title FROM ${table} WHERE id = 1`)).rows[0]?.title,
    ).toBe("pen");
    expect((await query(`SELECT id FROM ${view}`)).ok).toBe(false);
    if (engine !== "sqlite") {
      expect(
        (await query(`INSERT INTO ${table} (id, price) VALUES (3, -1)`)).ok,
      ).toBe(true);
    }

    const rename = await propose([
      { op: "rename_table", table, name: renamed },
    ]);
    expect((await applyChangeset(page, rename)).status()).toBe(200);
    expect((await query(`SELECT COUNT(*) AS n FROM ${renamed}`)).ok).toBe(true);

    const drop = await propose([{ op: "drop_table", table: renamed }]);
    expect(drop.changeset.ops[0]).toMatchObject({
      undoNote: "it loses what was there before",
    });
    expect((await applyChangeset(page, drop)).status()).toBe(200);
    expect((await query(`SELECT COUNT(*) AS n FROM ${renamed}`)).ok).toBe(
      false,
    );
    expect(await undoSql(page, drop)).toEqual([]);

    if (engine === "sqlite") {
      llm.script = {
        name: "propose_schema_change",
        args: {
          ops: [{ op: "add_check", table, name: "chk", sql: "price >= 0" }],
        },
      };
      const sent = await page.request.post("/api/ai/chat/stream", {
        data: { connectionId, message: "add a check", mode: "agent" },
      });
      expect(await sent.text()).toContain(
        "SQLite cannot add or drop constraints",
      );
    }
  } finally {
    await query(`DROP VIEW IF EXISTS ${view}`);
    await query(`DROP TABLE IF EXISTS ${table}`);
    await query(`DROP TABLE IF EXISTS ${renamed}`);
    await llm.stop();
    if (sqlitePath) removeSqliteDbFile(sqlitePath);
  }
}
