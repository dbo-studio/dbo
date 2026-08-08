import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import {
  ConnectionPage,
  DataBrowserPage,
  DataGridPage,
  SqlEditorPage,
} from "../pages";

/**
 * MySQL + SQLite connection form + data-browser smoke.
 */
test.describe("Connections MySQL SQLite smoke", () => {
  test("MySQL connect seed and open Data", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `conn-mysql-smoke-${suffix}`;
    const tableName = `e2e_smoke_mysql_${suffix}`;
    const config = getDbConfig("mysql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const connectionPage = new ConnectionPage(page);
      const sqlEditor = new SqlEditorPage(page);
      const dataBrowser = new DataBrowserPage(page);
      const dataGrid = new DataGridPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create MySQL connection", async () => {
        await connectionPage.setupConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Seed table", async () => {
        await sqlEditor.open();
        await sqlEditor.selectContext("default");
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
INSERT INTO ${tableName} (name) VALUES ('MySQL Smoke');
          `.trim(),
        );
      });

      await test.step("Open table from Data browser", async () => {
        await dataBrowser.openTableFromTree(
          [connectionName, "default"],
          tableName,
        );
        await dataGrid.waitForData("MySQL Smoke");
        await dataGrid.expectCellVisible("MySQL Smoke");
      });

      await sqlEditor.open();
      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });
  });

  test("SQLite connect seed and open Data", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `conn-sqlite-smoke-${suffix}`;
    const tableName = `e2e_smoke_sqlite_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-conn-smoke-${suffix}.db`;
    const config = getDbConfig("sqlite", connectionName, dbPath);

    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const connectionPage = new ConnectionPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const dataBrowser = new DataBrowserPage(page);
        const dataGrid = new DataGridPage(page);

        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Create SQLite connection", async () => {
          await connectionPage.setupConnection(config);
          await expect(
            connectionPage.getConnectionItem(connectionName),
          ).toBeVisible();
        });

        await test.step("Seed table", async () => {
          await sqlEditor.open();
          await sqlEditor.typeAndRun(
            `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
INSERT INTO ${tableName} (name) VALUES ('SQLite Smoke');
            `.trim(),
          );
        });

        await test.step("Open table from Data browser", async () => {
          await dataBrowser.openTableFromTree([connectionName], tableName);
          await dataGrid.waitForData("SQLite Smoke");
          await dataGrid.expectCellVisible("SQLite Smoke");
        });

        await sqlEditor.open();
        await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
      } finally {
        await removeSqliteDbFile(dbPath);
      }
    });
  });
});
