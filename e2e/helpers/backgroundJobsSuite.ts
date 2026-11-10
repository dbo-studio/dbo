import { expect, test } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { ConnectionPage } from "../pages";
import { EventStream } from "./eventStream";
import { createTableSql } from "./ddl";
import { withConnectionCleanup } from "./safeCleanup";

type Job = { id: number; type: string; status: string; result?: { data?: { data?: Array<Record<string, unknown>> } } };

/** The statement that holds a connection for `seconds`, and how to see whether the server still runs it. */
const SERVER = {
  postgresql: {
    sleep: (seconds: number): string => `SELECT pg_sleep(${seconds}), 1 AS n`,
    running: (seconds: number): string =>
      `SELECT count(*) AS c FROM pg_stat_activity WHERE state = 'active' AND pid <> pg_backend_pid() AND query LIKE '%pg_sleep(${seconds})%'`,
  },
  mysql: {
    sleep: (seconds: number): string => `SELECT SLEEP(${seconds}) AS s, 1 AS n`,
    running: (seconds: number): string =>
      `SELECT COUNT(*) AS c FROM information_schema.processlist WHERE id <> CONNECTION_ID() AND info LIKE '%SLEEP(${seconds})%'`,
  },
  mssql: {
    sleep: (seconds: number): string => `WAITFOR DELAY '${hms(seconds)}'; SELECT 1 AS n`,
    running: (seconds: number): string =>
      `SELECT COUNT(*) AS c FROM sys.dm_exec_requests r CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t WHERE r.session_id <> @@SPID AND t.text LIKE '%WAITFOR DELAY ''${hms(seconds)}''%'`,
  },
  // ClickHouse caps one sleep() call at 3s, so sleep 1s per row with one row per block.
  clickhouse: {
    sleep: (seconds: number): string => `SELECT sleep(1), 1 AS n FROM numbers(${seconds}) SETTINGS max_block_size = 1`,
    running: (seconds: number): string =>
      `SELECT count() AS c FROM system.processes WHERE query LIKE '%numbers(${seconds})%' AND query NOT LIKE '%system.processes%'`,
  },
} as const;

function hms(seconds: number): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${p(Math.floor(seconds / 3600))}:${p(Math.floor((seconds % 3600) / 60))}:${p(seconds % 60)}`;
}

/** Background queries and job events on a server database: handover, one run, cancel stops the statement. */
export function defineBackgroundJobsTests(engine: Exclude<DbEngine, "sqlite">): void {
  const server = SERVER[engine];

  test.describe(`Background jobs ${engine}`, () => {
    test("a slow query becomes a job, runs once, cancels for real, and leaves exports alone", async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
      const connectionName = `bgjobs-${suffix}`;
      const table = `e2e_bg_${suffix}`;
      const baseURL = testInfo.project.use.baseURL as string;
      const stream = new EventStream();

      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig(engine, connectionName));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const raw = (query: string, backgroundAfterSeconds?: number) =>
          page.request.post("/api/query/raw", { data: { connectionId, query, backgroundAfterSeconds } });
        const job = async (id: number): Promise<Job> => ((await (await page.request.get(`/api/jobs/${id}`)).json()) as { data: Job }).data;
        const cookies = async (): Promise<string> =>
          (await page.context().cookies()).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        const running = async (seconds: number): Promise<number> => {
          const answer = (await (await raw(server.running(seconds), 5)).json()) as { data: { data: Array<{ c: number | string }> } };

          return Number(answer.data.data[0].c);
        };

        try {
          await raw(createTableSql(engine, table, ["id INT NOT NULL"], "id"));
          await raw(`INSERT INTO ${table} VALUES (1),(2)`);
          await stream.open(baseURL, await cookies());

          await test.step("A quick query answers as before", async () => {
            const answer = await raw(`SELECT * FROM ${table}`, 5);
            expect(answer.status()).toBe(200);
            expect(stream.events).toHaveLength(0);
          });

          await test.step("A slow one answers 202, finishes as a job, and was run once", async () => {
            const answer = await raw(server.sleep(4), 1);
            expect(answer.status()).toBe(202);
            const { jobId } = ((await answer.json()) as { data: { jobId: number } }).data;
            await expect.poll(() => stream.of("job.completed").length, { timeout: 60_000 }).toBe(1);
            expect(await job(jobId)).toMatchObject({ type: "query", status: "completed" });
            expect(stream.of("notification.created")[0].data).toMatchObject({ jobType: "query", jobId });

            const history = await (await page.request.get(`/api/histories?connectionId=${connectionId}&page=1&count=100`)).text();
            expect(history.split(`${server.sleep(4)}`).length - 1).toBe(1);
          });

          await test.step("An export finishes while a background query runs, and neither disturbs the other", async () => {
            const long = await raw(server.sleep(600), 1);
            expect(long.status()).toBe(202);
            const longId = ((await long.json()) as { data: { jobId: number } }).data.jobId;
            await expect.poll(() => running(600), { timeout: 15_000 }).toBe(1);

            const exported = (
              (await (
                await page.request.post("/api/export", {
                  data: { connectionId, table, query: `SELECT * FROM ${table}`, format: "csv", chunkSize: 100 },
                })
              ).json()) as { data: { jobId: number } }
            ).data.jobId;
            await expect.poll(async () => (await job(exported)).status, { timeout: 60_000 }).toBe("completed");
            expect((await job(longId)).status).toBe("running");

            await test.step("Cancel stops the statement on the server", async () => {
              expect((await page.request.delete(`/api/jobs/${longId}`)).ok()).toBe(true);
              await expect.poll(() => stream.of("job.canceled").some((event) => event.data.id === longId), { timeout: 15_000 }).toBe(true);
              // The database itself stopped running it, not only DBO's view of the job.
              await expect.poll(() => running(600), { timeout: 20_000 }).toBe(0);
              expect(stream.of("notification.created").some((event) => event.data.jobId === longId)).toBe(false);
            });
          });
        } finally {
          await stream.close();
          await raw(`DROP TABLE IF EXISTS ${table}`);
        }
      });
    });
  });
}
