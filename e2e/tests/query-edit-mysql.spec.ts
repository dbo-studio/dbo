import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

/**
 * Query result-grid edit smoke — MySQL.
 */
test.describe("Query edit MySQL", () => {
  test("Edit, discard, and remove via result grid", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qedit-mysql-${suffix}`;
    const tableName = `e2e_qedit_mysql_${suffix}`;
    const config = getDbConfig("mysql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and table", async () => {
        await connectionPage.setupConnection(config);
        await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
        await sqlEditor.open();
        await sqlEditor.selectContext("default");
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE
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
        // Re-query after prior save — MySQL refresh can leave duplicate row keys.
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
    });
  });
});
