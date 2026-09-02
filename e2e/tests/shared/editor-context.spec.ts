import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../../pages";

/**
 * Engine-aware SQL editor database/schema context autofill and visibility.
 */
test.describe("SQL editor context", () => {
  test("PostgreSQL shows both selects and autofills default + public", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `editor-ctx-pg-${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create PostgreSQL connection", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Open editor and assert context", async () => {
        await sqlEditor.open();
        await sqlEditor.expectContextVisibility({
          database: true,
          schema: true,
        });
        await sqlEditor.expectSelectedContext("default", "public");
      });

      await test.step("Manual schema change stays locked against autofill", async () => {
        const lockedSchema = await sqlEditor.selectAlternateSchema("public");

        // Opening editor again reuses the empty Query tab; locked context must win.
        await page.getByRole("button", { name: "sql", exact: true }).click();
        await expect(sqlEditor.editor).toBeVisible({ timeout: 15000 });
        await sqlEditor.expectSelectedContext("default", lockedSchema);
      });
    });
  });

  test("MySQL shows database only and autofills connection default", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `editor-ctx-mysql-${suffix}`;
    const config = getDbConfig("mysql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create MySQL connection", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Open editor and assert context", async () => {
        await sqlEditor.open();
        await sqlEditor.expectContextVisibility({
          database: true,
          schema: false,
        });
        await sqlEditor.expectSelectedContext("default");
      });
    });
  });

  test("SQLite hides database and schema selects", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `editor-ctx-sqlite-${suffix}`;
    const dbPath = `/tmp/dbo-e2e-editor-ctx-${suffix}.db`;
    const config = getDbConfig("sqlite", connectionName, dbPath);

    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const connectionPage = new ConnectionPage(page);
        const sqlEditor = new SqlEditorPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Create SQLite connection", async () => {
          await connectionPage.setupConnection(config);
          await expect(
            connectionPage.getConnectionItem(connectionName),
          ).toBeVisible();
        });

        await test.step("Open editor without context selects", async () => {
          await sqlEditor.open();
          await sqlEditor.expectContextVisibility({
            database: false,
            schema: false,
          });
        });
      } finally {
        removeSqliteDbFile(dbPath);
      }
    });
  });
});
