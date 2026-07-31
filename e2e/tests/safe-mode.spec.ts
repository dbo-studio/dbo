import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SafeModePage, SqlEditorPage } from "../pages";

/**
 * Safe Mode Scenario
 *
 * Covers header policy menu + SQL confirm / password gates (TablePlus-aligned modes).
 */
test.describe("Safe Mode", () => {
  const testPrefix = "safe-mode";

  test("Menu shows modes and defaults to Silent", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const safeMode = new SafeModePage(page);
    const connectionName = `${testPrefix}-menu-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

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
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Setup connection and editor", async () => {
          await connectionPage.setupConnection(config);
          await sqlEditor.open();
          await sqlEditor.selectContext("default", "public");
        });

        await test.step("Enable Alert Mode 2", async () => {
          await safeMode.selectMode("alert_write");
        });

        await test.step("Create table with confirm", async () => {
          await safeMode.runWithConfirm(
            `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, name TEXT)`,
          );
          await sqlEditor.expectQuerySucceeded(`CREATE TABLE ${tableName}`);
        });

        await test.step("SELECT runs without confirm", async () => {
          await safeMode.runWithoutGate(`SELECT * FROM ${tableName}`);
          await expect(page.getByRole("table")).toBeVisible({ timeout: 15000 });
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
            await safeMode.selectSilentWithPassword(config.password);
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
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Setup connection and editor", async () => {
          await connectionPage.setupConnection(config);
          await sqlEditor.open();
          await sqlEditor.selectContext("default", "public");
        });

        await test.step("Create table while Silent", async () => {
          await safeMode.runWithoutGate(
            `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, name TEXT)`,
          );
          await sqlEditor.expectQuerySucceeded(`CREATE TABLE ${tableName}`);
        });

        await test.step("Enable Safe Mode 2", async () => {
          await safeMode.selectMode("safe_write");
        });

        await test.step("SELECT runs without password", async () => {
          await safeMode.runWithoutGate(`SELECT * FROM ${tableName}`);
          await expect(page.getByRole("table")).toBeVisible({ timeout: 15000 });
        });

        await test.step("INSERT requires password", async () => {
          await safeMode.runWithPassword(
            `INSERT INTO ${tableName} (name) VALUES ('secured')`,
            config.password,
          );
          await sqlEditor.expectQuerySucceeded(`INSERT INTO ${tableName}`);
        });

        await test.step("Switching to Silent requires password", async () => {
          await safeMode.selectSilentWithPassword(config.password);
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
});
