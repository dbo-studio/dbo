import { expect, test } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  type Artifact,
  connectionIdByName,
  expectError,
  listHistory,
  rawQuery,
  scopeFor,
  startJob,
  waitForJob,
} from "./backupApi";
import {
  cleanupImportExportSqlite,
  dropTables,
  setupImportExport,
} from "./importExport";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";

interface Sealed extends Artifact {
  compressed: boolean;
  encrypted: boolean;
}

function label(engine: DbEngine): string {
  return engine === "postgresql"
    ? "PostgreSQL"
    : engine === "mysql"
      ? "MySQL"
      : "SQLite";
}

export function defineBackupSealTests(engine: DbEngine): void {
  test.describe(`Backup encryption and verify ${label(engine)}`, () => {
    test("an encrypted, compressed schedule run verifies and restores only with the passphrase", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-seal-${suffix}`;
      const table = `e2e_bk_seal_${suffix}`;
      const targetName = `bk-seal-target-${suffix}`;
      const targetPath = `/tmp/dbo-e2e-bk-seal-${suffix}.db`;
      const passphrase = "e2e-seal-secret";
      if (engine === "sqlite") ensureSqliteDbFile(targetPath);

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(
          page,
          { connectionName, exportTable: table },
          engine,
        );
        const connectionId = await connectionIdByName(page, connectionName);
        let targetId: number | undefined;

        try {
          const created = await page.request.post("/api/backup-schedules", {
            data: {
              connectionId,
              name: `sealed-${suffix}`,
              cadence: "daily",
              compress: true,
              passphrase,
              ...scopeFor(engine),
            },
          });
          expect(created.ok(), await created.text()).toBeTruthy();
          const schedule = (await created.json()) as {
            data: { id: number; encrypted: boolean; passphrase?: string };
          };
          expect(schedule.data.encrypted).toBe(true);
          expect(schedule.data.passphrase).toBeUndefined();

          const artifact =
            await test.step("Run now writes a .gz.enc file", async () => {
              const run = await page.request.post(
                `/api/backup-schedules/${schedule.data.id}/run`,
              );
              const jobId = ((await run.json()) as { data: { jobId: number } })
                .data.jobId;
              const job = await waitForJob(page, jobId);
              expect(job.status, job.error).toBe("completed");
              const found = (await listHistory(page, connectionId)).find(
                (a) => a.jobId === jobId,
              ) as Sealed;
              expect(found.fileName).toMatch(/\.gz\.enc$/);
              expect(found.compressed && found.encrypted).toBe(true);
              return found;
            });

          await test.step("The stored file is not readable as SQL or SQLite", async () => {
            const body = await (
              await page.request.get(`/api/backups/${artifact.id}/download`)
            ).body();
            expect(body.subarray(0, 8).toString()).toBe("DBOENC01");
            expect(body.toString("latin1")).not.toContain(table);
          });

          await test.step("Verify: checksum only, wrong passphrase, right passphrase", async () => {
            const verify = async (
              pw?: string,
            ): Promise<{ ok: boolean; message: string }> =>
              (
                (await (
                  await page.request.post(
                    `/api/backups/${artifact.id}/verify`,
                    { data: { passphrase: pw } },
                  )
                ).json()) as { data: { ok: boolean; message: string } }
              ).data;
            expect(await verify()).toMatchObject({ ok: true });
            expect(await verify("wrong")).toMatchObject({ ok: false });
            expect(await verify(passphrase)).toMatchObject({
              ok: true,
              message: expect.stringContaining("read back"),
            });
          });

          const target = scopeFor(engine).database ?? "main";

          await test.step("Restore without a passphrase is refused", async () => {
            const response = await page.request.post("/api/backups/restore", {
              data: {
                connectionId,
                database: target,
                artifactId: artifact.id,
                confirmName: target,
              },
            });
            await expectError(response, 400, "passphrase is required");
          });

          if (engine === "sqlite") {
            const created = await page.request.post("/api/connections", {
              data: {
                name: targetName,
                type: "sqlite",
                options: { path: targetPath },
              },
            });
            expect(created.ok()).toBeTruthy();
            targetId = await connectionIdByName(page, targetName);
            const restore = async (pw: string): Promise<string> => {
              const jobId = await startJob(page, "/api/backups/restore", {
                connectionId: targetId,
                database: "main",
                artifactId: artifact.id,
                confirmName: "main",
                passphrase: pw,
              });
              const job = await waitForJob(page, jobId);
              return job.status === "completed" ? "completed" : job.error;
            };

            await test.step("A wrong passphrase fails cleanly and writes nothing", async () => {
              expect(await restore("wrong")).toContain("wrong passphrase");
              const tables = await rawQuery(
                page,
                targetId!,
                "SELECT count(*) AS n FROM sqlite_master",
              );
              expect(Number(tables[0].n)).toBe(0);
            });

            await test.step("The right passphrase restores the data", async () => {
              expect(await restore(passphrase)).toBe("completed");
              const rows = await rawQuery(
                page,
                targetId!,
                `SELECT count(*) AS n FROM ${table}`,
              );
              expect(Number(rows[0].n)).toBe(3);
            });
          }
        } finally {
          if (targetId !== undefined) {
            await page.request.delete(`/api/connections/${targetId}`);
          }
          if (engine === "sqlite") {
            removeSqliteDbFile(targetPath);
            cleanupImportExportSqlite(pages);
          } else {
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });
  });
}
