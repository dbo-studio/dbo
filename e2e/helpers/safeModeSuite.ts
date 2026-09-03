import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { SAFE_MODE_PASSWORD } from "../fixtures/safeMode";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { dataBrowserTreePath } from "./dataBrowser";
import { API_DDL_TIMEOUT, apiRoute, pendingResponse } from "./network";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";
import {
  ConnectionPage,
  DataBrowserPage,
  DataGridPage,
  ObjectTreePage,
  SafeModePage,
  SqlEditorPage,
} from "../pages";

function createTableSql(engine: DbEngine, tableName: string): string {
  if (engine === "mysql") {
    return `CREATE TABLE ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT)`;
  }
  if (engine === "sqlite") {
    return `CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`;
  }
  return `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, name TEXT)`;
}

async function selectEditorContext(
  sqlEditor: SqlEditorPage,
  engine: DbEngine,
): Promise<void> {
  if (engine === "postgresql") {
    await sqlEditor.selectContext("default", "public");
  } else if (engine === "mysql") {
    await sqlEditor.selectContext("default");
  }
}

function engineLabel(engine: DbEngine): string {
  if (engine === "mysql") return "MySQL";
  if (engine === "sqlite") return "SQLite";
  return "PostgreSQL";
}

async function revealTable(
  tree: ObjectTreePage,
  engine: DbEngine,
  connectionName: string,
  tableName: string,
): Promise<void> {
  await tree.expandPath(dataBrowserTreePath(engine, connectionName));
  await tree.refreshExpandNode("Tables");
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

function connectionSetup(engine: DbEngine, connectionName: string) {
  const sqlitePath =
    engine === "sqlite" ? `/tmp/dbo-e2e-${connectionName}.db` : undefined;
  if (sqlitePath) ensureSqliteDbFile(sqlitePath);
  return {
    config: getDbConfig(engine, connectionName, sqlitePath),
    cleanupFile: (): void => {
      if (sqlitePath) removeSqliteDbFile(sqlitePath);
    },
  };
}

/**
 * Safe Mode coverage for PostgreSQL, MySQL, and SQLite.
 */
export function defineSafeModeTests(engine: DbEngine): void {
  const label = engineLabel(engine);
  const testPrefix = `safe-mode-${engine === "postgresql" ? "pg" : engine}`;

  test.describe(`Safe Mode ${label}`, () => {
    test("Menu shows modes and defaults to Silent", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const safeMode = new SafeModePage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-menu-${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Create and activate connection", async () => {
            await connectionPage.setupConnection(config);
          });

          await test.step("Open Safe Mode menu", async () => {
            await safeMode.openMenu();
            await expect(safeMode.option("silent")).toBeVisible();
            await expect(safeMode.option("alert")).toBeVisible();
            await expect(safeMode.option("alert_write")).toBeVisible();
            await expect(safeMode.option("safe")).toBeVisible();
            await expect(safeMode.option("safe_write")).toBeVisible();
            await safeMode.expectOptionSelected("silent");
          });
        });
      } finally {
        cleanupFile();
      }
    });

    test("Alert Mode 2 confirms writes and allows reads", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-alert-${suffix}`;
      const tableName = `e2e_safe_alert_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection and editor", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
            });

            await test.step("Enable Alert Mode 2", async () => {
              await safeMode.selectMode("alert_write");
            });

            await test.step("Create table with confirm", async () => {
              await safeMode.runWithConfirm(createTableSql(engine, tableName));
              await sqlEditor.expectQuerySucceeded(`CREATE TABLE ${tableName}`);
            });

            await test.step("SELECT runs without confirm", async () => {
              await safeMode.runWithoutGate(`SELECT * FROM ${tableName}`);
              await expect(page.getByRole("table")).toBeVisible({
                timeout: 15000,
              });
            });

            await test.step("INSERT requires confirm; cancel keeps gate", async () => {
              await safeMode.runAndCancelConfirm(
                `INSERT INTO ${tableName} (name) VALUES ('blocked')`,
              );
              await expect(safeMode.confirmTitle).toBeHidden();
            });

            await test.step("INSERT succeeds after Run anyway", async () => {
              await safeMode.runWithConfirm(
                `INSERT INTO ${tableName} (name) VALUES ('allowed')`,
              );
              await sqlEditor.expectQuerySucceeded(`INSERT INTO ${tableName}`);
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
                await sqlEditor.open();
                await safeMode.runWithoutGate(
                  `DROP TABLE IF EXISTS ${tableName}`,
                );
              } catch (err) {
                console.warn("[e2e] safe-mode alert cleanup failed:", err);
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });

    test("Safe Mode 2 requires password for writes", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-pass-${suffix}`;
      const tableName = `e2e_safe_pass_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection and editor", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
            });

            await test.step("Create table while Silent", async () => {
              await safeMode.runWithoutGate(createTableSql(engine, tableName));
              await sqlEditor.expectQuerySucceeded(`CREATE TABLE ${tableName}`);
            });

            await test.step("Enable Safe Mode 2", async () => {
              await safeMode.selectMode("safe_write");
            });

            await test.step("SELECT runs without password", async () => {
              await safeMode.runWithoutGate(`SELECT * FROM ${tableName}`);
              await expect(page.getByRole("table")).toBeVisible({
                timeout: 15000,
              });
            });

            await test.step("INSERT requires password", async () => {
              await safeMode.runWithPassword(
                `INSERT INTO ${tableName} (name) VALUES ('secured')`,
                SAFE_MODE_PASSWORD,
              );
              await sqlEditor.expectQuerySucceeded(`INSERT INTO ${tableName}`);
            });

            await test.step("Second INSERT still requires password", async () => {
              await safeMode.runWithPassword(
                `INSERT INTO ${tableName} (name) VALUES ('secured-again')`,
                SAFE_MODE_PASSWORD,
              );
              await sqlEditor.expectQuerySucceeded(`INSERT INTO ${tableName}`);
            });

            await test.step("Switching to Silent requires password", async () => {
              await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
              await safeMode.openMenu();
              await safeMode.expectOptionSelected("silent");
              await page.keyboard.press("Escape");
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await sqlEditor.open();
                await safeMode.runWithoutGate(
                  `DROP TABLE IF EXISTS ${tableName}`,
                );
              } catch (err) {
                console.warn("[e2e] safe-mode password cleanup failed:", err);
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });

    test("Alert Mode 2 confirms grid Save from query results", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-grid-${suffix}`;
      const tableName = `e2e_safe_grid_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection, table, and Alert Mode 2", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
              await sqlEditor.typeAndRun(
                `
${createTableSql(engine, tableName)};
INSERT INTO ${tableName} (name) VALUES ('before');
            `.trim(),
              );
              await safeMode.selectMode("alert_write");
            });

            await test.step("SELECT loads editable grid without confirm", async () => {
              await safeMode.runWithoutGate(
                `SELECT * FROM ${tableName} ORDER BY id;`,
              );
              await dataGrid.waitForData("before");
              await dataGrid.expectEditActionsVisible(true);
            });

            await test.step("Cancel grid Save leaves data unchanged", async () => {
              await dataGrid.editCell("before", "cancelled");
              await dataGrid.clickSave();
              await safeMode.cancelConfirm();
              await dataGrid.expectCellVisible("cancelled");

              await safeMode.runWithoutGate(
                `SELECT * FROM ${tableName} ORDER BY id;`,
              );
              await dataGrid.waitForData("before");
              await dataGrid.expectCellHidden("cancelled");
            });

            await test.step("Confirm grid Save applies update", async () => {
              await dataGrid.editCell("before", "after");
              await dataGrid.clickSave();
              await expect(safeMode.confirmTitle).toBeVisible({
                timeout: 15000,
              });

              const updatePromise = pendingResponse(page, apiRoute.queryUpdate);
              await safeMode.runAnywayButton.click();
              await updatePromise;
              await expect(safeMode.confirmTitle).toBeHidden({
                timeout: 10000,
              });

              await safeMode.runWithoutGate(
                `SELECT * FROM ${tableName} ORDER BY id;`,
              );
              await dataGrid.waitForData("after");
              await dataGrid.expectCellHidden("before");
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
                await sqlEditor.open();
                await safeMode.runWithoutGate(
                  `DROP TABLE IF EXISTS ${tableName}`,
                );
              } catch (err) {
                console.warn("[e2e] safe-mode grid cleanup failed:", err);
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });

    test("Safe Mode 2 requires password for each grid Save", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataGrid = new DataGridPage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-g2-${suffix}`;
      const tableName = `e2e_safe_g2_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection, table, and Safe Mode 2", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
              await sqlEditor.typeAndRun(
                `
${createTableSql(engine, tableName)};
INSERT INTO ${tableName} (name) VALUES ('before');
            `.trim(),
              );
              await safeMode.selectMode("safe_write");
            });

            await test.step("SELECT loads editable grid without password", async () => {
              await safeMode.runWithoutGate(
                `SELECT * FROM ${tableName} ORDER BY id;`,
              );
              await dataGrid.waitForData("before");
              await dataGrid.expectEditActionsVisible(true);
            });

            await test.step("First grid Save requires password", async () => {
              await dataGrid.editCell("before", "after1");
              const updatePromise = pendingResponse(page, apiRoute.queryUpdate);
              await dataGrid.clickSave();
              await safeMode.submitPassword(SAFE_MODE_PASSWORD);
              await updatePromise;
              await dataGrid.waitForData("after1");
            });

            await test.step("Second grid Save still requires password", async () => {
              await dataGrid.editCell("after1", "after2");
              const updatePromise = pendingResponse(page, apiRoute.queryUpdate);
              await dataGrid.clickSave();
              await expect(safeMode.passwordPrompt).toBeVisible({
                timeout: 15000,
              });
              await safeMode.submitPassword(SAFE_MODE_PASSWORD);
              await updatePromise;
              await dataGrid.waitForData("after2");
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
                await sqlEditor.open();
                await safeMode.runWithoutGate(
                  `DROP TABLE IF EXISTS ${tableName}`,
                );
              } catch (err) {
                console.warn(
                  "[e2e] safe-mode grid reauth cleanup failed:",
                  err,
                );
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });

    test("Alert Mode 2 confirms tree Drop table", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const tree = new ObjectTreePage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-tree-${suffix}`;
      const tableName = `e2e_safe_tree_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection, table, and Alert Mode 2", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
              await sqlEditor.typeAndRun(createTableSql(engine, tableName));
              await safeMode.selectMode("alert_write");
            });

            await test.step("Drop table from tree requires Safe Mode confirm", async () => {
              await revealTable(tree, engine, connectionName, tableName);

              const retryPromise = pendingResponse(
                page,
                { ...apiRoute.objectExecute, method: "POST", status: 200 },
                API_DDL_TIMEOUT,
              );
              await tree.runTreeAction(tableName, "Drop table");
              await expect(safeMode.confirmTitle).toBeVisible({
                timeout: 15000,
              });
              await safeMode.runAnywayButton.click();
              await retryPromise;
              await expect(safeMode.confirmTitle).toBeHidden({
                timeout: 10000,
              });
              await expect(tree.getTreeNode(tableName)).toHaveCount(0, {
                timeout: 15000,
              });
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
                await sqlEditor.open();
                await safeMode.runWithoutGate(
                  `DROP TABLE IF EXISTS ${tableName}`,
                );
              } catch (err) {
                console.warn("[e2e] safe-mode tree alert cleanup failed:", err);
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });

    test("Safe Mode 2 requires password for tree Drop table", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const tree = new ObjectTreePage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-t2-${suffix}`;
      const tableName = `e2e_safe_t2_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection, table, and Safe Mode 2", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
              await sqlEditor.typeAndRun(createTableSql(engine, tableName));
              await safeMode.selectMode("safe_write");
            });

            await test.step("Drop table from tree requires password", async () => {
              await revealTable(tree, engine, connectionName, tableName);

              const retryPromise = pendingResponse(
                page,
                { ...apiRoute.objectExecute, method: "POST", status: 200 },
                API_DDL_TIMEOUT,
              );
              await tree.runTreeAction(tableName, "Drop table");
              await safeMode.submitPassword(SAFE_MODE_PASSWORD);
              await retryPromise;
              await expect(tree.getTreeNode(tableName)).toHaveCount(0, {
                timeout: 15000,
              });
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
                await sqlEditor.open();
                await safeMode.runWithoutGate(
                  `DROP TABLE IF EXISTS ${tableName}`,
                );
              } catch (err) {
                console.warn(
                  "[e2e] safe-mode tree password cleanup failed:",
                  err,
                );
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });

    test("Grid run is gated by Safe Mode and export rejects writes", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataBrowser = new DataBrowserPage(page);
      const dataGrid = new DataGridPage(page);
      const safeMode = new SafeModePage(page);

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-grid-${suffix}`;
      const tableName = `e2e_safe_grid_${suffix}`;
      const { config, cleanupFile } = connectionSetup(engine, connectionName);

      try {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Setup connection and table while Silent", async () => {
              await connectionPage.setupConnection(config);
              await sqlEditor.open();
              await selectEditorContext(sqlEditor, engine);
              await sqlEditor.typeAndRun(createTableSql(engine, tableName));
              await sqlEditor.typeAndRun(
                `INSERT INTO ${tableName} (name) VALUES ('gated')`,
              );
            });

            await test.step("Enable Safe Mode 2 and open the grid", async () => {
              await safeMode.selectMode("safe_write");
              await dataBrowser.openTableFromTree(
                dataBrowserTreePath(engine, connectionName),
                tableName,
              );
              await dataGrid.waitForData("gated");
            });

            await test.step("Write inline query via grid is rejected", async () => {
              // Rewrite the next grid query/run to carry a write payload in
              // inlineQuery — the backend must refuse it (password gate).
              let intercepted = false;
              await page.route(/\/api\/query\/run/, async (route) => {
                intercepted = true;
                const request = route.request();
                const payload = request.postDataJSON() as Record<
                  string,
                  unknown
                >;
                payload.inlineQuery = `1=1; DROP TABLE ${tableName}`;
                await route.continue({ postData: JSON.stringify(payload) });
              });

              const blocked = page.waitForResponse(
                (response) =>
                  /\/api\/query\/run/.test(response.url()) &&
                  response.status() === 403,
              );

              await dataBrowser
                .addFilter("name", "=", "gated")
                .catch(() => undefined);

              const blockedResponse = await blocked;
              expect(intercepted).toBe(true);
              expect(blockedResponse.status()).toBe(403);

              const body = (await blockedResponse.json()) as {
                message?: string;
              };
              expect(body.message).toBe("safe_mode_password_required");

              await page.unroute(/\/api\/query\/run/);
            });

            await test.step("Table survives the blocked statement", async () => {
              await dataBrowser.runInlineQuery("name = 'gated'");
              await dataGrid.waitForData("gated");
            });

            await test.step("Export API rejects write queries", async () => {
              const listResponse = await page.request.get("/api/connections");
              const listBody = (await listResponse.json()) as {
                data: Array<{ id: number; name: string }>;
              };
              const connection = listBody.data.find(
                (item) => item.name === connectionName,
              );
              expect(connection).toBeDefined();

              const exportResponse = await page.request.post("/api/export", {
                data: {
                  connectionId: connection?.id,
                  table: tableName,
                  query: `DELETE FROM ${tableName}`,
                  format: "csv",
                },
              });
              expect(exportResponse.status()).toBe(400);

              const exportBody = (await exportResponse.json()) as {
                message?: string;
              };
              expect(exportBody.message).toContain("read-only");
            });

            await test.step("Switch back to Silent", async () => {
              await safeMode.selectSilentWithPassword(SAFE_MODE_PASSWORD);
            });
          } finally {
            await test.step("Cleanup table", async () => {
              try {
                await sqlEditor.open();
                await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName}`);
              } catch (err) {
                console.warn("[e2e] safe-mode grid cleanup failed:", err);
              }
            });
          }
        });
      } finally {
        cleanupFile();
      }
    });
  });
}
