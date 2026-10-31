import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { EventStream } from "../../helpers/eventStream";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

type Notification = { id: number; kind: string; jobType: string; title: string; body: string; jobId: number; read: boolean };

/** Live events and the notification center: a finished or failed job reaches the stream once and the inbox once. */
test.describe("Job events and notifications", () => {
  test("export jobs emit events and fill the inbox", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = uniqueTestSuffix(testInfo).replace(/[^a-z0-9_]/gi, "_");
    const connectionName = `notify-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-notify-${suffix}.db`;
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
        const raw = (query: string) => page.request.post("/api/query/raw", { data: { connectionId, query } });
        await raw(`CREATE TABLE ${table} (id INTEGER, name TEXT)`);
        await raw(`INSERT INTO ${table} VALUES (1,'a'),(2,'b')`);

        const cookieHeader = async (): Promise<string> =>
          (await page.context().cookies()).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        const list = async (): Promise<{ items: Notification[]; unread: number }> =>
          ((await (await page.request.get("/api/notifications")).json()) as { data: { items: Notification[]; unread: number } }).data;
        const startExport = async (query: string): Promise<number> =>
          ((await (
            await page.request.post("/api/export", { data: { connectionId, table, query, format: "csv", chunkSize: 100 } })
          ).json()) as { data: { jobId: number } }).data.jobId;

        expect((await list()).items).toEqual([]);
        await stream.open(baseURL, await cookieHeader());

        let okJob = 0;
        await test.step("A finished export emits one event and makes one notification", async () => {
          okJob = await startExport(`SELECT * FROM ${table}`);
          await expect.poll(() => stream.of("job.completed").length, { timeout: 30_000 }).toBe(1);
          await expect.poll(() => stream.of("notification.created").length).toBe(1);

          const completed = stream.of("job.completed")[0].data;
          expect(completed).toMatchObject({ id: okJob, type: "export", status: "completed" });
          // Events carry no result payload: that stays on the job.
          expect(completed).not.toHaveProperty("result");
          expect(stream.of("notification.created")[0].data).toMatchObject({ kind: "job_completed", jobType: "export", jobId: okJob, read: false });

          const inbox = await list();
          expect(inbox.unread).toBe(1);
          expect(inbox.items).toHaveLength(1);
          expect(inbox.items[0]).toMatchObject({ kind: "job_completed", jobType: "export", jobId: okJob, read: false });
        });

        await test.step("A failed export says so, with the reason", async () => {
          const failedJob = await startExport("SELECT * FROM table_that_is_missing");
          await expect.poll(() => stream.of("job.failed").length, { timeout: 30_000 }).toBe(1);
          expect(stream.of("job.failed")[0].data).toMatchObject({ id: failedJob, status: "failed" });

          const inbox = await list();
          expect(inbox.unread).toBe(2);
          expect(inbox.items[0]).toMatchObject({ kind: "job_failed", jobId: failedJob });
          expect(inbox.items[0].body).not.toBe("");
        });

        await test.step("A cancel is an event, not a notification", async () => {
          // Queued behind the worker's 5 second tick, so there is time to cancel it first.
          const canceled = await startExport(`SELECT * FROM ${table}`);
          expect((await page.request.delete(`/api/jobs/${canceled}`)).ok()).toBe(true);
          await expect.poll(() => stream.of("job.canceled").length, { timeout: 15_000 }).toBe(1);
          expect(stream.of("job.canceled")[0].data).toMatchObject({ id: canceled, status: "canceled" });
          await page.waitForTimeout(6_000);
          expect((await list()).items).toHaveLength(2);
          expect(stream.of("notification.created")).toHaveLength(2);
        });

        await test.step("Progress arrives on the stream while a job runs", async () => {
          expect(stream.of("job.progress").length).toBeGreaterThan(0);
        });

        await test.step("Read, read all and delete", async () => {
          const before = await list();
          await page.request.post(`/api/notifications/${before.items[1].id}/read`);
          expect((await list()).unread).toBe(1);
          await page.request.post("/api/notifications/read");
          expect((await list()).unread).toBe(0);
          await page.request.delete(`/api/notifications/${before.items[0].id}`);
          const after = await list();
          expect(after.items.map((item) => item.id)).toEqual([before.items[1].id]);
        });

        await test.step("A client that reconnects finds what it missed in the inbox", async () => {
          await stream.close();
          const missed = await startExport(`SELECT * FROM ${table}`);
          const again = new EventStream();
          await again.open(baseURL, await cookieHeader());
          await expect.poll(async () => (await list()).items.some((item) => item.jobId === missed), { timeout: 30_000 }).toBe(true);
          await again.close();
        });
      });
    } finally {
      await stream.close();
      removeSqliteDbFile(dbPath);
    }
  });
});
