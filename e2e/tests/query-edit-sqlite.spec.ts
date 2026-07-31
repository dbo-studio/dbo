import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

/**
 * Query result-grid edit smoke — SQLite.
 */
test.describe("Query edit SQLite", () => {
  test("Edit, discard, and remove via result grid", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qedit-sqlite-${suffix}`;
    const tableName = `e2e_qedit_sqlite_${suffix}`;
    const sqlitePath = `/tmp/dbo-e2e-qedit-${suffix}.db`;
    const config = getDbConfig("sqlite", connectionName, sqlitePath);

    ensureSqliteDbFile(sqlitePath);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Setup connection and table", async () => {
          await connectionPage.setupConnection(config);
          await expect(
            connectionPage.getConnectionItem(connectionName),
          ).toBeVisible();
          await sqlEditor.open();
          // SQLite has no schema selector in the query bar.
          await sqlEditor.typeAndRun(
            `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);
INSERT INTO ${tableName} (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');
            `.trim(),
          );
        });

        await test.step("Edit cell and save", async () => {
          await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
          await dataGrid.waitForData("Alice");
          await dataGrid.expectEditActionsVisible(true);
          await dataGrid.editCell("Alice", "Alice Updated");
          await dataGrid.saveChanges();

          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} WHERE email = 'alice@example.com';`,
          );
          await dataGrid.waitForData("Alice Updated");
        });

        await test.step("Discard unsaved edit", async () => {
          await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
          await dataGrid.waitForData("Alice Updated");
          await dataGrid.editCell("Bob", "Bob Dirty");
          await dataGrid.discardChanges();
          await dataGrid.expectCellVisible("Bob");
          await dataGrid.expectCellHidden("Bob Dirty");
        });

        await test.step("Remove row and save", async () => {
          await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
          await dataGrid.waitForData("Bob");
          await dataGrid.selectRowByCellText("Bob");
          await dataGrid.removeRow();
          await dataGrid.saveChanges();

          await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
          await dataGrid.waitForData("Alice Updated");
          await dataGrid.expectCellHidden("Bob");
        });

        await test.step("Cleanup table", async () => {
          await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
        });
      } finally {
        removeSqliteDbFile(sqlitePath);
      }
    });
  });
});
