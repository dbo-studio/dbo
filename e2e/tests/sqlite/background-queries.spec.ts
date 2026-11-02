import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { EventStream } from "../../helpers/eventStream";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/** A counting query of about this size runs for a few seconds; the huge one would never finish on its own. */
const slow = (rows: number): string =>
  `WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<${rows}) SELECT count(*) AS n FROM c`;

type Job = { id: number; type: string; status: string; result?: { data?: { data?: Array<Record<string, unknown>> } } };

/** Queries that outlast their wait move to the background: one run, a job to follow, no clash with exports. */
test.describe("Background queries", () => {
  test("a slow query keeps running as a job and tells the user", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `bgq-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-bgq-${suffix}.db`;
    const table = `t_${suffix}`;
    ensureSqliteDbFile(dbPath);
    const baseURL = testInfo.project.use.baseURL as string;
    const stream = new EventStream();

    try {
      await withConnectionCleanup(page, connectionName, async () => {
        const connectionPage = new ConnectionPage(page);
        await connectionPage.goto();
        await connectionPage.waitForReady();
        await connectionPage.setupConnection(getDbConfig("sqlite", connectionName, dbPath));

        const connections = (await (await page.request.get("/api/connections")).json()) as {
          data: Array<{ id: number; name: string }>;
        };
        const connectionId = connections.data.find((item) => item.name === connectionName)?.id as number;
        const raw = (query: string, backgroundAfterSeconds?: number) =>
          page.request.post("/api/query/raw", { data: { connectionId, query, backgroundAfterSeconds } });
        const job = async (id: number): Promise<Job> =>
          ((await (await page.request.get(`/api/jobs/${id}`)).json()) as { data: Job }).data;
        const cookies = async (): Promise<string> =>
          (await page.context().cookies()).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

        await raw(`CREATE TABLE ${table} (id INTEGER)`);
        await raw(`INSERT INTO ${table} VALUES (1),(2)`);
        await stream.open(baseURL, await cookies());

        await test.step("A quick query answers as before and makes no job", async () => {
          const answer = await raw(`SELECT * FROM ${table}`, 5);
          expect(answer.status()).toBe(200);
          const body = (await answer.json()) as { data: { data: unknown[] } };
          expect(body.data.data).toHaveLength(2);
          expect(stream.events).toHaveLength(0);
        });

        await test.step("A slow query answers 202 with a job, and finishes there", async () => {
          const answer = await raw(slow(25_000_000), 1);
          expect(answer.status()).toBe(202);
          const { data } = (await answer.json()) as { data: { status: string; jobId: number } };
          expect(data.status).toBe("background");

          expect((await job(data.jobId)).status).toBe("running");
          await expect.poll(() => stream.of("job.completed").length, { timeout: 90_000 }).toBe(1);

          const done = await job(data.jobId);
          expect(done).toMatchObject({ type: "query", status: "completed" });
          expect(done.result?.data?.data?.[0]?.n).toBe(25_000_000);
          expect(stream.of("notification.created")[0].data).toMatchObject({ kind: "job_completed", jobType: "query", jobId: data.jobId });
        });

        await test.step("It ran exactly once", async () => {
          const history = (await (await page.request.get(`/api/histories?connectionId=${connectionId}&page=1&count=100`)).text());
          expect(history.split("25000000").length - 1).toBe(1);
        });

        await test.step("A background query and an export do not touch each other", async () => {
          const never = await raw(slow(100_000_000_000), 1);
          expect(never.status()).toBe(202);
          const neverId = ((await never.json()) as { data: { jobId: number } }).data.jobId;

          const exported = (
            (await (
              await page.request.post("/api/export", {
                data: { connectionId, table, query: `SELECT * FROM ${table}`, format: "csv", chunkSize: 100 },
              })
            ).json()) as { data: { jobId: number } }
          ).data.jobId;
          await expect.poll(async () => (await job(exported)).status, { timeout: 40_000 }).toBe("completed");
          // The single-run policy would have cancelled one of them.
          expect((await job(neverId)).status).toBe("running");

          await test.step("Cancel stops the query and frees the connection", async () => {
            expect((await page.request.delete(`/api/jobs/${neverId}`)).ok()).toBe(true);
            await expect.poll(() => stream.of("job.canceled").some((event) => event.data.id === neverId), { timeout: 15_000 }).toBe(true);
            expect((await job(neverId)).status).toBe("canceled");
            const quick = await raw(`SELECT 1 AS one`, 5);
            expect(quick.status()).toBe(200);
            // No notification for a cancel the user asked for.
            expect(stream.of("notification.created").some((event) => event.data.jobId === neverId)).toBe(false);
          });
        });

        await test.step("Zero keeps the query in the request", async () => {
          const answer = await raw(slow(3_000_000), 0);
          expect(answer.status()).toBe(200);
        });

        await test.step("Bad input is refused", async () => {
          expect((await raw(`SELECT 1`, -1)).status()).toBe(422);
        });
      });
    } finally {
      await stream.close();
      removeSqliteDbFile(dbPath);
    }
  });
});
