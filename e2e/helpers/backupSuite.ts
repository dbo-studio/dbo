import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  type Artifact,
  connectionIdByName,
  expectError,
  listHistory,
  rawQuery,
  runBackup,
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

const SAFE_MODE_PASSWORD = "e2e-safe-mode";

function label(engine: DbEngine): string {
  return engine === "postgresql"
    ? "PostgreSQL"
    : engine === "mysql"
      ? "MySQL"
      : "SQLite";
}

/** Parent + child tables with a foreign key, portable across all three engines. */
async function createTables(
  pages: Awaited<ReturnType<typeof setupImportExport>>,
  parent: string,
  child: string,
): Promise<void> {
  await pages.sqlEditor.open();
  await pages.sqlEditor.typeAndRun(
    [
      `DROP TABLE IF EXISTS ${child};`,
      `DROP TABLE IF EXISTS ${parent};`,
      `CREATE TABLE ${parent} (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL);`,
      `CREATE TABLE ${child} (id INT PRIMARY KEY, parent_id INT NOT NULL, FOREIGN KEY (parent_id) REFERENCES ${parent}(id));`,
      `INSERT INTO ${parent} (id, name) VALUES (1, 'one'), (2, 'two');`,
      `INSERT INTO ${child} (id, parent_id) VALUES (10, 1), (11, 2);`,
    ].join("\n"),
  );
}

async function download(
  page: import("@playwright/test").Page,
  artifact: Artifact,
): Promise<Buffer> {
  const response = await page.request.get(
    `/api/backups/${artifact.id}/download`,
  );
  expect(response.ok()).toBeTruthy();
  return response.body();
}

export function defineBackupTests(engine: DbEngine): void {
  test.describe(`Backup and restore ${label(engine)}`, () => {
    test("backup is recorded, checksummed and downloadable", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-${suffix}`;
      const parent = `e2e_bk_parent_${suffix}`;
      const child = `e2e_bk_child_${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(page, { connectionName }, engine);
        await createTables(pages, parent, child);
        const connectionId = await connectionIdByName(page, connectionName);

        try {
          const artifact = await test.step("Run a backup job", () =>
            runBackup(page, connectionId, engine, "e2e note"));

          await test.step("History row has size, checksum and method", async () => {
            expect(artifact.size).toBeGreaterThan(0);
            expect(artifact.checksum).toMatch(/^[0-9a-f]{64}$/);
            expect(["native", "basic"]).toContain(artifact.method);
            if (engine === "sqlite") {
              expect(artifact.method).toBe("native");
              expect(artifact.fileName).toMatch(/\.sqlite$/);
            }
            const history = await listHistory(page, connectionId);
            expect(history.map((item) => item.id)).toContain(artifact.id);
          });

          await test.step("Download is non-empty and holds the tables", async () => {
            const body = await download(page, artifact);
            expect(body.length).toBe(artifact.size);
            if (engine !== "sqlite") {
              const text = body.toString("utf8");
              expect(text).toContain(parent);
              expect(text).toContain(child);
            }
          });
        } finally {
          await dropTables(pages.sqlEditor, [child, parent]);
          cleanupImportExportSqlite(pages);
        }
      });
    });

    test("restore needs the typed name and a matching driver", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-guard-${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(page, { connectionName }, engine);
        const guardTables = [
          `e2e_bk_guard_p_${suffix}`,
          `e2e_bk_guard_c_${suffix}`,
        ] as const;
        await createTables(pages, guardTables[0], guardTables[1]);
        try {
          const connectionId = await connectionIdByName(page, connectionName);
          const artifact = await runBackup(page, connectionId, engine);
          const target = scopeFor(engine).database ?? "main";

          await test.step("Wrong confirmation is rejected and queues nothing", async () => {
            const response = await page.request.post("/api/backups/restore", {
              data: {
                connectionId,
                database: target,
                artifactId: artifact.id,
                confirmName: `${target}-typo`,
              },
            });
            await expectError(response, 400, "typed name does not match");
          });

          await test.step("Unknown backup id is not found", async () => {
            const response = await page.request.post("/api/backups/restore", {
              data: {
                connectionId,
                database: target,
                artifactId: 999_999_999,
                confirmName: target,
              },
            });
            await expectError(response, 404, "backup not found");
          });

          await test.step("Option-like and connection-string database names are rejected", async () => {
            for (const database of [
              "--init-command=x",
              "a=b host=evil",
              "x/y",
            ]) {
              const backup = await page.request.post("/api/backups", {
                data: { connectionId, database },
              });
              expect(backup.status(), database).toBe(422);
              const restore = await page.request.post("/api/backups/restore", {
                data: {
                  connectionId,
                  database,
                  artifactId: artifact.id,
                  confirmName: database,
                },
              });
              expect(restore.status(), database).toBe(422);
            }
          });
        } finally {
          await dropTables(pages.sqlEditor, [guardTables[1], guardTables[0]]);
          cleanupImportExportSqlite(pages);
        }
      });
    });

    test("uploaded files: type check and client-command scan", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-upload-${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        await setupImportExport(page, { connectionName }, engine);
        const connectionId = await connectionIdByName(page, connectionName);

        await test.step("Wrong extension is rejected", async () => {
          const response = await page.request.post("/api/backups/upload", {
            multipart: {
              connectionId: String(connectionId),
              file: {
                name: "notes.txt",
                mimeType: "text/plain",
                buffer: Buffer.from("x"),
              },
            },
          });
          await expectError(response, 400, "must be .sql or .sqlite");
        });

        if (engine === "sqlite") {
          return;
        }

        const evil =
          engine === "postgresql"
            ? "SELECT 1;\n\\! touch /tmp/dbo-e2e-pwned\n"
            : "SELECT 1;\nsystem touch /tmp/dbo-e2e-pwned\n";

        await test.step("A file with client commands is stored but never replayed", async () => {
          const upload = await page.request.post("/api/backups/upload", {
            multipart: {
              connectionId: String(connectionId),
              file: {
                name: "evil.sql",
                mimeType: "application/sql",
                buffer: Buffer.from(evil),
              },
            },
          });
          expect(upload.ok()).toBeTruthy();
          const artifact = ((await upload.json()) as { data: Artifact }).data;
          expect(artifact.status).toBe("completed");

          const target = scopeFor(engine).database!;
          const jobId = await startJob(page, "/api/backups/restore", {
            connectionId,
            database: target,
            artifactId: artifact.id,
            confirmName: target,
          });
          const job = await waitForJob(page, jobId);
          expect(job.status).toBe("failed");
          expect(job.error).toContain("not allowed");
        });
      });
    });

    test("tool manager lists tools and pinned downloads", async ({ page }) => {
      await test.step("Detection reports every known tool", async () => {
        const response = await page.request.get("/api/backups/tools");
        expect(response.ok()).toBeTruthy();
        const tools = (
          (await response.json()) as {
            data: Array<{ name: string; found: boolean }>;
          }
        ).data;
        expect(tools.map((tool) => tool.name)).toEqual(
          expect.arrayContaining([
            "pg_dump",
            "pg_restore",
            "psql",
            "mysqldump",
            "mysql",
            "sqlite3",
          ]),
        );
      });

      await test.step("Downloads list shows source and size, installs nothing", async () => {
        const response = await page.request.get("/api/backups/tools/downloads");
        expect(response.ok()).toBeTruthy();
        const downloads = (
          (await response.json()) as {
            data: Array<{ url: string; size: number }>;
          }
        ).data;
        for (const item of downloads) {
          expect(item.url).toMatch(/^https:\/\//);
          expect(item.size).toBeGreaterThan(0);
        }
      });

      await test.step("An unpinned tool cannot be installed", async () => {
        const response = await page.request.post("/api/backups/tools/install", {
          data: { driver: "sqlite", version: "0.0.0" },
        });
        await expectError(response, 400, "no pinned download");
      });
    });

    if (engine !== "sqlite") {
      test("backup restores into a fresh database with matching rows", async ({
        page,
      }, testInfo) => {
        const suffix = uniqueTestSuffix(testInfo);
        const connectionName = `bk-rt-${suffix}`;
        const targetName = `bk-rt-target-${suffix}`;
        const scratch = `e2e_rt_${suffix}`;
        const parent = `e2e_bk_parent_${suffix}`;
        const child = `e2e_bk_child_${suffix}`;

        const tools = (await (
          await page.request.get("/api/backups/tools")
        ).json()) as {
          data: Array<{ name: string; found: boolean }>;
        };
        const client = engine === "postgresql" ? "psql" : "mysql";
        test.skip(
          !tools.data.some((tool) => tool.name === client && tool.found),
          `${client} is not installed on this host`,
        );

        await withConnectionCleanup(page, connectionName, async () => {
          const pages = await setupImportExport(
            page,
            { connectionName },
            engine,
          );
          await createTables(pages, parent, child);
          const sourceId = await connectionIdByName(page, connectionName);

          const raw = (query: string) =>
            page.request.post("/api/query/raw", {
              data: { connectionId: sourceId, query },
            });

          const cfg = getDbConfig(engine, targetName);
          let targetId: number | undefined;

          try {
            const artifact = await runBackup(page, sourceId, engine);

            await test.step("Restore creates the new database and fills it", async () => {
              const jobId = await startJob(page, "/api/backups/restore", {
                connectionId: sourceId,
                database: scratch,
                ...(engine === "postgresql" ? { schema: "public" } : {}),
                artifactId: artifact.id,
                confirmName: scratch,
                createDatabase: true,
              });
              const job = await waitForJob(page, jobId);
              expect(job.status, job.error).toBe("completed");
            });

            const created = await page.request.post("/api/connections", {
              data: {
                name: targetName,
                type: engine,
                options: {
                  host: cfg.host,
                  port: Number(cfg.port),
                  username: cfg.username,
                  password: cfg.password,
                  database: scratch,
                  ssl: { mode: "disable" },
                },
              },
            });
            expect(created.ok(), await created.text()).toBeTruthy();
            targetId = await connectionIdByName(page, targetName);

            await test.step("Tables and rows match the source", async () => {
              for (const table of [parent, child]) {
                const rows = await rawQuery(
                  page,
                  targetId!,
                  `SELECT count(*) AS n FROM ${table}`,
                );
                expect(Number(rows[0].n)).toBe(2);
              }
            });
          } finally {
            if (targetId !== undefined) {
              await page.request.delete(`/api/connections/${targetId}`);
            }
            await raw(
              engine === "postgresql"
                ? `DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`
                : `DROP DATABASE IF EXISTS ${scratch}`,
            );
            await dropTables(pages.sqlEditor, [child, parent]);
          }
        });
      });
    }

    if (engine === "sqlite") {
      test("backup restores into an empty database; a non-empty one is refused", async ({
        page,
      }, testInfo) => {
        const suffix = uniqueTestSuffix(testInfo);
        const connectionName = `bk-rt-${suffix}`;
        const targetName = `bk-rt-target-${suffix}`;
        const targetPath = `/tmp/dbo-e2e-bk-target-${suffix}.db`;
        const parent = `e2e_bk_parent_${suffix}`;
        const child = `e2e_bk_child_${suffix}`;
        ensureSqliteDbFile(targetPath);

        try {
          await withConnectionCleanup(page, connectionName, async () => {
            const pages = await setupImportExport(
              page,
              { connectionName },
              engine,
            );
            await createTables(pages, parent, child);
            const sourceId = await connectionIdByName(page, connectionName);

            const created = await page.request.post("/api/connections", {
              data: {
                name: targetName,
                type: "sqlite",
                options: { path: targetPath },
              },
            });
            expect(created.ok()).toBeTruthy();
            const targetId = await connectionIdByName(page, targetName);

            try {
              const artifact = await runBackup(page, sourceId, engine);

              await test.step("Restore into the empty target", async () => {
                const jobId = await startJob(page, "/api/backups/restore", {
                  connectionId: targetId,
                  database: "main",
                  artifactId: artifact.id,
                  confirmName: "main",
                });
                const job = await waitForJob(page, jobId);
                expect(job.status, job.error).toBe("completed");

                const parents = await rawQuery(
                  page,
                  targetId,
                  `SELECT count(*) AS n FROM ${parent}`,
                );
                const children = await rawQuery(
                  page,
                  targetId,
                  `SELECT count(*) AS n FROM ${child}`,
                );
                expect(Number(parents[0].n)).toBe(2);
                expect(Number(children[0].n)).toBe(2);
              });

              await test.step("A second restore into the same target is refused", async () => {
                const jobId = await startJob(page, "/api/backups/restore", {
                  connectionId: targetId,
                  database: "main",
                  artifactId: artifact.id,
                  confirmName: "main",
                });
                const job = await waitForJob(page, jobId);
                expect(job.status).toBe("failed");
                expect(job.error).toContain("not empty");
              });

              await test.step("Safety backup runs first and is recorded", async () => {
                const before = (await listHistory(page, targetId)).length;
                const jobId = await startJob(page, "/api/backups/restore", {
                  connectionId: targetId,
                  database: "main",
                  artifactId: artifact.id,
                  confirmName: "main",
                  safetyBackup: true,
                });
                const job = await waitForJob(page, jobId);
                // Target is not empty, so the restore itself fails, but only
                // after the safety copy of it was made.
                expect(job.status).toBe("failed");
                const history = await listHistory(page, targetId);
                expect(history.length).toBe(before + 1);
                expect(history[0].status).toBe("completed");
              });
            } finally {
              await page.request.delete(`/api/connections/${targetId}`);
            }

            await dropTables(pages.sqlEditor, [child, parent]);
          });
        } finally {
          removeSqliteDbFile(targetPath);
        }
      });

      test("Safe Mode blocks restore until the password is given", async ({
        page,
      }, testInfo) => {
        const suffix = uniqueTestSuffix(testInfo);
        const connectionName = `bk-safe-${suffix}`;

        await withConnectionCleanup(page, connectionName, async () => {
          const pages = await setupImportExport(
            page,
            { connectionName },
            engine,
          );
          const safeTables = [
            `e2e_bk_safe_p_${suffix}`,
            `e2e_bk_safe_c_${suffix}`,
          ] as const;
          await createTables(pages, safeTables[0], safeTables[1]);
          const connectionId = await connectionIdByName(page, connectionName);
          const artifact = await runBackup(page, connectionId, engine);

          await test.step("Enable Safe Mode safe_write", async () => {
            // 409 means a password already exists from another test.
            const set = await page.request.post("/api/safe-mode/password", {
              data: {
                password: SAFE_MODE_PASSWORD,
                confirm: SAFE_MODE_PASSWORD,
              },
            });
            expect([200, 409]).toContain(set.status());
            const patch = await page.request.patch(
              `/api/connections/${connectionId}`,
              {
                data: { safeMode: "safe_write" },
              },
            );
            expect(patch.ok(), await patch.text()).toBeTruthy();
          });

          await test.step("Restore is refused with a password challenge", async () => {
            const response = await page.request.post("/api/backups/restore", {
              data: {
                connectionId,
                database: "main",
                artifactId: artifact.id,
                confirmName: "main",
              },
            });
            await expectError(response, 403, "safe_mode_password_required");
          });

          await test.step("Backup stays allowed", async () => {
            await runBackup(page, connectionId, engine);
          });
          // Safe Mode now blocks writes from the editor; the SQLite file is removed instead.
          cleanupImportExportSqlite(pages);
        });
      });
    }
  });
}
