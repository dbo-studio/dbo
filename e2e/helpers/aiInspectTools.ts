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

type ToolStep = { type: string; content?: string };
type Stats = {
  rows: number;
  columns: Array<{
    name: string;
    nullPercent: number;
    distinctCount?: number;
    min?: unknown;
    max?: unknown;
  }>;
};

/**
 * The read-only inspection tools in Ask mode, called by a scripted model:
 * explain_query returns the engine's plan and refuses a non-SELECT, and
 * table_stats returns the right figures for a known table.
 */
export async function checkInspectTools(
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
    const callTool = async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<ToolStep> => {
      llm.script = { name, args };
      const sent = await page.request.post("/api/ai/chat/stream", {
        data: {
          connectionId,
          message: "look at this",
          mode: "ask",
          contextOpts,
        },
      });
      const events = (await sent.text())
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ToolStep & { label?: string });
      const step = events.find(
        (event) => event.label === name && event.type !== "tool_start",
      );
      expect(step, `${name} ran`).toBeDefined();
      return step as ToolStep;
    };

    await raw(
      `CREATE TABLE ${table} (id INTEGER PRIMARY KEY, email VARCHAR(100), age INTEGER)`,
    );
    try {
      await raw(
        `INSERT INTO ${table} VALUES (1, 'a@x.io', 30), (2, 'b@x.io', NULL), (3, 'a@x.io', 50), (4, NULL, 20)`,
      );

      const plan = await callTool("explain_query", {
        sql: `SELECT id FROM ${table} WHERE email = 'a@x.io'`,
      });
      expect(plan.type).toBe("tool_result");
      expect(plan.content).toMatch(scanWord[engine]);

      const refused = await callTool("explain_query", {
        sql: `DELETE FROM ${table}`,
      });
      expect(refused.type).toBe("tool_error");
      expect(refused.content).toContain("only SELECT");

      const measured = await callTool("table_stats", { table });
      expect(measured.type, measured.content).toBe("tool_result");
      const stats = JSON.parse(measured.content ?? "{}") as Stats;
      const column = (name: string) =>
        stats.columns.find((item) => item.name === name);
      expect(stats.rows).toBe(4);
      expect(column("email")).toMatchObject({
        nullPercent: 25,
        distinctCount: 2,
        min: "a@x.io",
        max: "b@x.io",
      });
      expect(column("age")).toMatchObject({
        nullPercent: 25,
        distinctCount: 3,
      });
      expect(Number(column("age")?.min)).toBe(20);
      expect(Number(column("age")?.max)).toBe(50);
    } finally {
      await raw(`DROP TABLE ${table}`);
    }
  } finally {
    await llm.stop();
    if (sqlitePath) removeSqliteDbFile(sqlitePath);
  }
}
