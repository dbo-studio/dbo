import { expect, test } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { ConnectionPage } from "../pages";
import { ensureSqliteDbFile, removeSqliteDbFile } from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";

type Rows = Array<Record<string, unknown>>;

/** {{filters}} in report SQL on a real server: typed values, injection stays text, field filters and ranges. */
export function defineReportFilterTests(engine: DbEngine): void {
  test.describe(`Report filters ${engine}`, () => {
    test("typed filters run, and a value never becomes SQL", async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
      const connectionName = `filters-${suffix}`;
      const table = `e2e_f_${suffix}`;
      const dbPath = `/tmp/dbo-e2e-filters-${suffix}.db`;
      if (engine === "sqlite") ensureSqliteDbFile(dbPath);
      // A backslash typed into SQL means different things per engine, so it is built from its character code.
      const backslashNote = { postgresql: "'back' || chr(92) || 'slash'", mysql: "CONCAT('back', CHAR(92), 'slash')", sqlite: "'back' || char(92) || 'slash'" }[engine];

      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig(engine, connectionName, dbPath));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const raw = (query: string) => page.request.post("/api/query/raw", { data: { connectionId, query, backgroundAfterSeconds: 0 } });
        const question = async (sql: string, params: Record<string, string> = {}): Promise<number> =>
          (
            (await (
              await page.request.post("/api/questions", {
                data: { connectionId, name: `q-${Math.random()}`, sql, chart: { type: "table", y: [] }, params },
              })
            ).json()) as { data: { id: number } }
          ).data.id;
        const run = async (id: number, params?: Record<string, string>): Promise<{ status: number; rows: Rows }> => {
          const answer = await page.request.post(`/api/questions/${id}/run`, { data: { params } });
          const body = (await answer.json()) as { data?: { rows?: Rows } };

          return { status: answer.status(), rows: body.data?.rows ?? [] };
        };

        try {
          await raw(`CREATE TABLE ${table} (region VARCHAR(20), amount INTEGER, note VARCHAR(40))`);
          await raw(`INSERT INTO ${table} VALUES ('east', 10, 'plain'), ('west', 20, 'it''s'), ('east', 500, ${backslashNote})`);

          await test.step("A number and a text filter", async () => {
            const id = await question(`SELECT count(*) AS n FROM ${table} WHERE amount > {{min:number}} AND region = {{region}}`);
            const answer = await run(id, { min: "5", region: "east" });
            expect(answer.status).toBe(200);
            expect(Number(answer.rows[0].n)).toBe(2);
          });

          await test.step("A filter used on its own, with a number or text, returns the value", async () => {
            for (const value of ["5", "hello"]) {
              const answer = await run(await question("SELECT {{x}} AS v"), { x: value });
              expect(answer.status, value).toBe(200);
              expect(String(answer.rows[0]?.v), value).toBe(value);
            }
          });

          await test.step("A value that tries to be SQL stays a value", async () => {
            const id = await question(`SELECT count(*) AS n FROM ${table} WHERE region = {{region}}`);
            for (const attack of [`east' OR '1'='1`, `east'; DROP TABLE ${table}; --`, `\\' OR 1=1 --`]) {
              const answer = await run(id, { region: attack });
              expect(answer.status, attack).toBe(200);
              expect(Number(answer.rows[0].n), attack).toBe(0);
            }
            // The table is still there.
            expect(Number((await run(await question(`SELECT count(*) AS n FROM ${table}`))).rows[0].n)).toBe(3);
          });

          await test.step("Quotes and backslashes in a value match the stored text", async () => {
            const id = await question(`SELECT count(*) AS n FROM ${table} WHERE note = {{note}}`);
            expect(Number((await run(id, { note: "it's" })).rows[0].n)).toBe(1);
            expect(Number((await run(id, { note: "back\\slash" })).rows[0].n)).toBe(1);
          });

          await test.step("A range and a field filter that may be left empty", async () => {
            const id = await question(
              `SELECT count(*) AS n FROM ${table} WHERE {{region:field=${table}.region}} AND amount BETWEEN {{amount:range}}`,
            );
            expect(Number((await run(id, { amount: "0..100" })).rows[0].n)).toBe(2);
            expect(Number((await run(id, { amount: "0..100", region: "east" })).rows[0].n)).toBe(1);
          });

          await test.step("A date and a true/false filter", async () => {
            const date = await question(`SELECT {{d:date}} AS d`);
            expect(String((await run(date, { d: "2026-01-31" })).rows[0].d)).toContain("2026-01-31");
            const flag = await question(`SELECT CASE WHEN {{b:boolean}} THEN 1 ELSE 0 END AS flag`);
            expect(Number((await run(flag, { b: "true" })).rows[0].flag)).toBe(1);
            expect(Number((await run(flag, { b: "false" })).rows[0].flag)).toBe(0);
          });

          await test.step("Wrong types and missing values are refused before the database sees them", async () => {
            const num = await question(`SELECT {{n:number}} AS n`);
            expect((await run(num, { n: "7 OR 1=1" })).status).toBe(400);
            expect((await run(num, {})).status).toBe(400);
          });
        } finally {
          await raw(`DROP TABLE IF EXISTS ${table}`);
          if (engine === "sqlite") removeSqliteDbFile(dbPath);
        }
      });
    });
  });
}
