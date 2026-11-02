import { expect, type Page } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { ConnectionPage } from "../pages";
import { clearActiveAiProfile } from "./aiSetup";
import { applyChangeset, changesetStatuses, previewWrites } from "./changeset";
import { FakeLlm, pointProviderAtFakeLlm } from "./fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";

/**
 * Several data changes as one: seed rows for two related tables preview
 * together (children see their parents) and apply together; a batch that
 * fails at apply leaves nothing behind.
 */
export async function checkBatchWrites(
  page: Page,
  engine: DbEngine,
  connectionName: string,
  suffix: string,
  sqlitePath?: string,
): Promise<void> {
  if (sqlitePath) ensureSqliteDbFile(sqlitePath);
  const llm = new FakeLlm();
  const llmUrl = await llm.start();
  const authors = `authors_${suffix}`;
  const books = `books_${suffix}`;
  let connectionId = 0;
  const query = async (
    sql: string,
  ): Promise<Array<Record<string, unknown>>> => {
    const response = await page.request.post("/api/query/raw", {
      data: { connectionId, query: sql },
    });
    const rows = (
      (await response.json()) as {
        data: { data: Array<Record<string, unknown>> };
      }
    ).data.data;
    // The raw endpoint reports a failed statement as a row whose Message is the error.
    expect(
      rows.find(
        (row) => typeof row.Message === "string" && row.Message !== "OK",
      ),
      sql,
    ).toBeUndefined();
    return rows;
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
      engine === "postgresql"
        ? { database: "default", schema: "public" }
        : undefined;
    const ids = async (table: string): Promise<number[]> =>
      (await query(`SELECT id FROM ${table} ORDER BY id`)).map((row) =>
        Number(row.id),
      );

    await query(
      `CREATE TABLE ${authors} (id INTEGER PRIMARY KEY, name VARCHAR(50) NOT NULL)`,
    );
    await query(
      `CREATE TABLE ${books} (id INTEGER PRIMARY KEY, author_id INTEGER NOT NULL REFERENCES ${authors} (id), title VARCHAR(50))`,
    );

    const seed = await previewWrites(
      page,
      llm,
      connectionId,
      [
        `INSERT INTO ${authors} (id, name) VALUES (1, 'Ana'), (2, 'Li')`,
        `INSERT INTO ${books} (id, author_id, title) VALUES (1, 1, 'One'), (2, 2, 'Two'), (3, 1, 'Three')`,
        `UPDATE ${books} SET title = 'Third' WHERE id = 3`,
      ],
      scope,
    );
    // Each count comes from the same rolled-back batch: the UPDATE sees the book the INSERT before it adds.
    expect(seed.changeset.ops.map((op) => op.affectedRows)).toEqual([2, 3, 1]);
    expect(await ids(authors)).toEqual([]);

    expect((await applyChangeset(page, seed)).status()).toBe(200);
    expect(await changesetStatuses(page, seed)).toEqual([
      "applied",
      "applied",
      "applied",
    ]);
    expect(await ids(books)).toEqual([1, 2, 3]);
    expect(
      (await query(`SELECT title FROM ${books} WHERE id = 3`))[0].title,
    ).toBe("Third");

    const batch = await previewWrites(
      page,
      llm,
      connectionId,
      [
        `INSERT INTO ${authors} (id, name) VALUES (3, 'Sam')`,
        `INSERT INTO ${authors} (id, name) VALUES (4, 'Kim')`,
      ],
      scope,
    );
    // Someone takes id 4 before the user applies: the second insert fails, and the first goes back with it.
    await query(`INSERT INTO ${authors} (id, name) VALUES (4, 'Other')`);
    expect((await applyChangeset(page, batch)).status()).not.toBe(200);
    expect(await ids(authors)).toEqual([1, 2, 4]);
  } finally {
    await page.request.post("/api/query/raw", {
      data: { connectionId, query: `DROP TABLE IF EXISTS ${books}` },
    });
    await page.request.post("/api/query/raw", {
      data: { connectionId, query: `DROP TABLE IF EXISTS ${authors}` },
    });
    await llm.stop();
    if (sqlitePath) removeSqliteDbFile(sqlitePath);
  }
}
