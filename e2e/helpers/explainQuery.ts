import { expect, type Page } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { ConnectionPage } from "../pages";
import { clearActiveAiProfile } from "./aiSetup";
import { FakeLlm, pointProviderAtFakeLlm } from "./fakeLlm";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";

/** A word every engine's plan for a full scan of an unindexed column contains. */
const scanWord: Record<DbEngine, RegExp> = {
  postgresql: /Seq Scan/,
  mysql: /"ALL"/,
  sqlite: /SCAN/,
};

/**
 * The explain_query tool in Ask mode: a scripted model asks for the plan of a
 * SELECT and gets the engine's plan back; a non-SELECT is refused.
 */
export async function checkExplainQuery(
  page: Page,
  engine: DbEngine,
  connectionName: string,
  table: string,
  sqlitePath?: string,
): Promise<void> {
  if (sqlitePath) ensureSqliteDbFile(sqlitePath);
  const llm = new FakeLlm();
  const llmUrl = await llm.start();
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
    const connectionId = connections.data.find(
      (item) => item.name === connectionName,
    )?.id as number;
    const raw = async (query: string): Promise<void> => {
      const response = await page.request.post("/api/query/raw", {
        data: { connectionId, query },
      });
      expect(response.status(), query).toBe(200);
    };
    const contextOpts =
      engine === "mysql"
        ? { database: "default" }
        : engine === "postgresql"
          ? { schema: "public" }
          : undefined;
    const explain = async (
      sql: string,
    ): Promise<{ type: string; content?: string }> => {
      llm.script = { name: "explain_query", args: { sql } };
      const sent = await page.request.post("/api/ai/chat/stream", {
        data: {
          connectionId,
          message: "why is this slow?",
          mode: "ask",
          contextOpts,
        },
      });
      const events = (await sent.text())
        .split("\n")
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as {
              type: string;
              label?: string;
              content?: string;
            },
        );
      const step = events.find(
        (event) =>
          event.label === "explain_query" && event.type !== "tool_start",
      );
      expect(step, "the tool ran").toBeDefined();
      return step as { type: string; content?: string };
    };

    await raw(
      `CREATE TABLE ${table} (id INTEGER PRIMARY KEY, email VARCHAR(100))`,
    );
    try {
      await raw(`INSERT INTO ${table} VALUES (1, 'a@x.io'), (2, 'b@x.io')`);

      const plan = await explain(
        `SELECT id FROM ${table} WHERE email = 'a@x.io'`,
      );
      expect(plan.type).toBe("tool_result");
      expect(plan.content).toMatch(scanWord[engine]);

      const refused = await explain(`DELETE FROM ${table}`);
      expect(refused.type).toBe("tool_error");
      expect(refused.content).toContain("only SELECT");
      const left = await page.request.post("/api/query/raw", {
        data: { connectionId, query: `SELECT COUNT(*) AS n FROM ${table}` },
      });
      expect(JSON.stringify(await left.json())).toContain("2");
    } finally {
      await raw(`DROP TABLE ${table}`);
    }
  } finally {
    await llm.stop();
    if (sqlitePath) removeSqliteDbFile(sqlitePath);
  }
}
