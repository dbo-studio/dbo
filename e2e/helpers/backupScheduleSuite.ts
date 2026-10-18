import { expect, test } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  type Artifact,
  connectionIdByName,
  expectError,
  listHistory,
  scopeFor,
  waitForJob,
} from "./backupApi";
import {
  cleanupImportExportSqlite,
  dropTables,
  setupImportExport,
} from "./importExport";
import { withConnectionCleanup } from "./safeCleanup";

interface Schedule {
  id: number;
  enabled: boolean;
  nextRunAt: string | null;
  lastStatus: string;
  keepLast: number;
}

function label(engine: DbEngine): string {
  return engine === "postgresql"
    ? "PostgreSQL"
    : engine === "mysql"
      ? "MySQL"
      : "SQLite";
}

export function defineBackupScheduleTests(engine: DbEngine): void {
  test.describe(`Backup schedules ${label(engine)}`, () => {
    test("create, run now, keep only the newest N, pause and delete", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-sched-${suffix}`;
      const table = `e2e_bk_sched_${suffix}`;
      const scheduleName = `nightly-${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(
          page,
          { connectionName, exportTable: table },
          engine,
        );
        const connectionId = await connectionIdByName(page, connectionName);
        const scheduled = async (): Promise<Artifact[]> =>
          (await listHistory(page, connectionId)).filter(
            (a) => a.note === `Schedule: ${scheduleName}`,
          );

        try {
          await test.step("Invalid schedules are rejected", async () => {
            const badZone = await page.request.post("/api/backup-schedules", {
              data: {
                connectionId,
                name: "x",
                cadence: "daily",
                timezone: "Nope/Zone",
              },
            });
            await expectError(badZone, 422, "time zone");
            const badCadence = await page.request.post(
              "/api/backup-schedules",
              { data: { connectionId, name: "x", cadence: "yearly" } },
            );
            expect(badCadence.status()).toBe(422);
            const badName = await page.request.post("/api/backup-schedules", {
              data: {
                connectionId,
                name: "x",
                cadence: "daily",
                database: "--evil",
              },
            });
            expect(badName.status()).toBe(422);
          });

          const created =
            await test.step("Create a daily schedule with a next run", async () => {
              const response = await page.request.post(
                "/api/backup-schedules",
                {
                  data: {
                    connectionId,
                    name: scheduleName,
                    cadence: "daily",
                    hour: 2,
                    minute: 30,
                    timezone: "UTC",
                    keepLast: 2,
                    ...scopeFor(engine),
                  },
                },
              );
              expect(response.ok(), await response.text()).toBeTruthy();
              const schedule = ((await response.json()) as { data: Schedule })
                .data;
              expect(schedule.enabled).toBe(true);
              expect(
                new Date(schedule.nextRunAt ?? "").getTime(),
              ).toBeGreaterThan(Date.now());
              return schedule;
            });

          await test.step("Run now three times; retention keeps the newest two", async () => {
            for (let i = 0; i < 3; i++) {
              const response = await page.request.post(
                `/api/backup-schedules/${created.id}/run`,
              );
              expect(response.ok()).toBeTruthy();
              const jobId = (
                (await response.json()) as {
                  data: { jobId: number };
                }
              ).data.jobId;
              const job = await waitForJob(page, jobId);
              expect(job.status, job.error).toBe("completed");
            }
            // Retention runs right after each completed backup.
            await expect.poll(async () => (await scheduled()).length).toBe(2);
          });

          await test.step("The schedule records its last run", async () => {
            const list = (await (
              await page.request.get("/api/backup-schedules")
            ).json()) as { data: Schedule[] };
            const mine = list.data.find((s) => s.id === created.id);
            expect(mine?.lastStatus).toBe("completed");
          });

          await test.step("Pausing and editing keeps the schedule", async () => {
            const response = await page.request.patch(
              `/api/backup-schedules/${created.id}`,
              { data: { enabled: false, keepLast: 1 } },
            );
            expect(response.ok()).toBeTruthy();
            const updated = ((await response.json()) as { data: Schedule })
              .data;
            expect(updated.enabled).toBe(false);
            expect(updated.keepLast).toBe(1);
          });

          await test.step("Deleting a schedule keeps its backups", async () => {
            const before = (await scheduled()).length;
            const response = await page.request.delete(
              `/api/backup-schedules/${created.id}`,
            );
            expect(response.ok()).toBeTruthy();
            const list = (await (
              await page.request.get("/api/backup-schedules")
            ).json()) as { data: Schedule[] };
            expect(list.data.find((s) => s.id === created.id)).toBeUndefined();
            expect((await scheduled()).length).toBe(before);
          });

          await test.step("Unknown schedules are not found", async () => {
            const response = await page.request.post(
              "/api/backup-schedules/999999/run",
            );
            await expectError(response, 404, "not found");
          });
        } finally {
          if (engine === "sqlite") {
            cleanupImportExportSqlite(pages);
          } else {
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });
  });
}
