import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

async function setupMysqlUsersTable(
  page: import("@playwright/test").Page,
  connectionName: string,
  tableName: string,
  rows: Array<{ name: string; email: string }> = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
    { name: "Bob Wilson", email: "bob@example.com" },
  ],
): Promise<{ sqlEditor: SqlEditorPage; dataGrid: DataGridPage }> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataGrid = new DataGridPage(page);
  const config = getDbConfig("mysql", connectionName);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(config);
  await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
  await sqlEditor.open();
  await sqlEditor.selectContext("default");

  const values = rows.map((r) => `('${r.name}', '${r.email}')`).join(",\n  ");
  await sqlEditor.typeAndRun(
    `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO ${tableName} (name, email) VALUES
  ${values};
    `.trim(),
  );

  return { sqlEditor, dataGrid };
}

test.describe("Query CRUD MySQL", () => {
  test("Create insert and select verify", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-mysql-select-${suffix}`;
    const tableName = `e2e_users_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupMysqlUsersTable(
        page,
        connectionName,
        tableName,
      );

      await test.step("Select and verify data in grid", async () => {
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
        await dataGrid.waitForData("Jane Smith");
        await dataGrid.expectCellVisible("John Doe");
        await dataGrid.expectCellVisible("jane@example.com");
        await dataGrid.expectCellVisible("Bob Wilson");
      });

      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });
  });

  test("Inline edit and save from result grid", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-mysql-edit-${suffix}`;
    const tableName = `e2e_users_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupMysqlUsersTable(
        page,
        connectionName,
        tableName,
      );

      await test.step("Edit cell and save", async () => {
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
        await dataGrid.waitForData("Jane Smith");
        await dataGrid.editCell("Jane Smith", "Jane Inline");
        await dataGrid.saveChanges();

        await sqlEditor.typeAndRun(
          `SELECT * FROM ${tableName} WHERE email = 'jane@example.com';`,
        );
        await dataGrid.waitForData("Jane Inline");
        await dataGrid.expectCellVisible("Jane Inline");
      });

      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });
  });

  test("Discard unsaved edit and remove row", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-mysql-discard-${suffix}`;
    const tableName = `e2e_users_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupMysqlUsersTable(
        page,
        connectionName,
        tableName,
        [
          { name: "Alice", email: "alice@example.com" },
          { name: "Bob", email: "bob@example.com" },
        ],
      );

      await test.step("Discard unsaved edit", async () => {
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
        await dataGrid.waitForData("Alice");
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
        await dataGrid.waitForData("Alice");
        await dataGrid.expectCellHidden("Bob");
      });

      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });
  });

  test("SQL update and delete", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-mysql-sql-${suffix}`;
    const tableName = `e2e_users_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupMysqlUsersTable(
        page,
        connectionName,
        tableName,
      );

      await test.step("Update via SQL", async () => {
        await sqlEditor.typeAndRun(
          `UPDATE ${tableName} SET name = 'John Updated' WHERE email = 'john@example.com';`,
        );
        await sqlEditor.typeAndRun(
          `SELECT * FROM ${tableName} WHERE email = 'john@example.com';`,
        );
        await dataGrid.waitForData();
        await dataGrid.expectCellVisible("John Updated");
      });

      await test.step("Delete via SQL", async () => {
        await sqlEditor.typeAndRun(
          `DELETE FROM ${tableName} WHERE email = 'bob@example.com';`,
        );
        await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
        await dataGrid.waitForData();
        await dataGrid.expectCellHidden("Bob Wilson");
        await dataGrid.expectCellVisible("John Updated");
        await dataGrid.expectCellVisible("Jane Smith");
      });

      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });
  });

  test("Create and query multiple tables with JOIN", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-mysql-join-${suffix}`;
    const table1 = `e2e_categories_mysql_${suffix}`;
    const table2 = `e2e_products_mysql_${suffix}`;
    const config = getDbConfig("mysql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection and tables", async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext("default");
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${table2};
DROP TABLE IF EXISTS ${table1};
CREATE TABLE ${table1} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);
CREATE TABLE ${table2} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INT,
  price DECIMAL(10, 2),
  CONSTRAINT fk_cat_${suffix} FOREIGN KEY (category_id) REFERENCES ${table1}(id)
);
INSERT INTO ${table1} (name) VALUES ('Electronics'), ('Books');
INSERT INTO ${table2} (name, category_id, price) VALUES
  ('Laptop', 1, 999.99),
  ('Phone', 1, 599.99),
  ('Novel', 2, 19.99);
          `.trim(),
        );
      });

      await test.step("Query with JOIN and edit driving table", async () => {
        await sqlEditor.typeAndRun(
          `
SELECT p.id, p.name as product, c.name as category, p.price
FROM ${table2} p
JOIN ${table1} c ON p.category_id = c.id
ORDER BY p.price DESC;
          `.trim(),
        );
        await dataGrid.waitForData();
        await dataGrid.expectCellVisible("Laptop");
        await dataGrid.expectCellVisible("Electronics");

        await dataGrid.editCell("Laptop", "Laptop Pro");
        await dataGrid.saveChanges();

        await sqlEditor.typeAndRun(
          `SELECT name FROM ${table2} WHERE name = 'Laptop Pro';`,
        );
        await dataGrid.waitForData();
        await dataGrid.expectCellVisible("Laptop Pro");
      });

      await test.step("Cleanup tables", async () => {
        await sqlEditor.typeAndRun(
          `
DROP TABLE IF EXISTS ${table2};
DROP TABLE IF EXISTS ${table1};
          `.trim(),
        );
      });
    });
  });
});
