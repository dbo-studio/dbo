import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { apiRoute, pendingResponse } from "./network";
import { withConnectionCleanup } from "./safeCleanup";
import {
  ConnectionPage,
  DataGridPage,
  SafeModePage,
  SqlEditorPage,
} from "../pages";

function createTableSql(engine: DbEngine, tableName: string): string {
  if (engine === "mysql") {
    return `CREATE TABLE ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT)`;
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

/**
 * Safe Mode coverage for engines that support it (PostgreSQL, MySQL).
 * SQLite has no Safe Mode — see sqlite/safe-mode.spec.ts.
 */
export function defineSafeModeTests(engine: DbEngine): void {
  const label = engine === "mysql" ? "MySQL" : "PostgreSQL";
  const testPrefix = `safe-mode-${engine === "postgresql" ? "pg" : engine}`;

  test.describe(`Safe Mode ${label}`, () => {
    test("Menu shows modes and defaults to Silent", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const safeMode = new SafeModePage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-menu-${suffix}`;
      const config = getDbConfig(engine, connectionName);

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
      const config = getDbConfig(engine, connectionName);
      const gatePassword = config.password;

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
              await safeMode.selectSilentWithPassword(gatePassword);
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
      const config = getDbConfig(engine, connectionName);
      const gatePassword = config.password;

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
              gatePassword,
            );
            await sqlEditor.expectQuerySucceeded(`INSERT INTO ${tableName}`);
          });

          await test.step("Switching to Silent requires password", async () => {
            await safeMode.selectSilentWithPassword(gatePassword);
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
      const config = getDbConfig(engine, connectionName);
      const gatePassword = config.password;

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
            await expect(safeMode.confirmTitle).toBeVisible({ timeout: 15000 });

            const updatePromise = pendingResponse(page, apiRoute.queryUpdate);
            await safeMode.runAnywayButton.click();
            await updatePromise;
            await expect(safeMode.confirmTitle).toBeHidden({ timeout: 10000 });

            await safeMode.runWithoutGate(
              `SELECT * FROM ${tableName} ORDER BY id;`,
            );
            await dataGrid.waitForData("after");
            await dataGrid.expectCellHidden("before");
          });
        } finally {
          await test.step("Cleanup table", async () => {
            try {
              await safeMode.selectSilentWithPassword(gatePassword);
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
    });
  });
}
