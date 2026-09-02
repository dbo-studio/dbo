import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../../pages";

async function setupSqliteUsersTable(
  page: import("@playwright/test").Page,
  connectionName: string,
  tableName: string,
  dbPath: string,
  rows: Array<{ name: string; email: string }> = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
    { name: "Bob Wilson", email: "bob@example.com" },
  ],
): Promise<{ sqlEditor: SqlEditorPage; dataGrid: DataGridPage }> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataGrid = new DataGridPage(page);
  const config = getDbConfig("sqlite", connectionName, dbPath);

  ensureSqliteDbFile(dbPath);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(config);
  await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
  await sqlEditor.open();

  const values = rows.map((r) => `('${r.name}', '${r.email}')`).join(",\n  ");
  await sqlEditor.typeAndRun(
    `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);
INSERT INTO ${tableName} (name, email) VALUES
  ${values};
    `.trim(),
  );

  return { sqlEditor, dataGrid };
}

test.describe("Query CRUD SQLite", () => {
  test("Create insert and select verify", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-sqlite-select-${suffix}`;
    const tableName = `e2e_users_sqlite_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-crud-select-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataGrid } = await setupSqliteUsersTable(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        await test.step("Select and verify", async () => {
          await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
          await dataGrid.waitForData("Jane Smith");
          await dataGrid.expectCellVisible("John Doe");
          await dataGrid.expectCellVisible("Bob Wilson");
        });

        await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
      } finally {
        await removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Inline edit and save", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-sqlite-edit-${suffix}`;
    const tableName = `e2e_users_sqlite_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-crud-edit-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataGrid } = await setupSqliteUsersTable(
          page,
          connectionName,
          tableName,
          dbPath,
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
        });

        await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
      } finally {
        await removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Discard unsaved edit and remove row", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-sqlite-discard-${suffix}`;
    const tableName = `e2e_users_sqlite_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-crud-discard-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataGrid } = await setupSqliteUsersTable(
          page,
          connectionName,
          tableName,
          dbPath,
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
      } finally {
        await removeSqliteDbFile(dbPath);
      }
    });
  });

  test("SQL update and delete", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-sqlite-sql-${suffix}`;
    const tableName = `e2e_users_sqlite_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-crud-sql-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataGrid } = await setupSqliteUsersTable(
          page,
          connectionName,
          tableName,
          dbPath,
        );

        await test.step("Update and delete via SQL", async () => {
          await sqlEditor.typeAndRun(
            `UPDATE ${tableName} SET name = 'John Updated' WHERE email = 'john@example.com';`,
          );
          await sqlEditor.typeAndRun(
            `DELETE FROM ${tableName} WHERE email = 'bob@example.com';`,
          );
          await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
          await dataGrid.waitForData();
          await dataGrid.expectCellVisible("John Updated");
          await dataGrid.expectCellVisible("Jane Smith");
          await dataGrid.expectCellHidden("Bob Wilson");
        });

        await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
      } finally {
        await removeSqliteDbFile(dbPath);
      }
    });
  });

  test("Create and query multiple tables with JOIN", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `crud-sqlite-join-${suffix}`;
    const table1 = `e2e_categories_sqlite_${suffix}`;
    const table2 = `e2e_products_sqlite_${suffix}`;
    const dbPath = `/tmp/dbo-e2e-crud-join-${suffix}.db`;
    const config = getDbConfig("sqlite", connectionName, dbPath);

    ensureSqliteDbFile(dbPath);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Setup connection and tables", async () => {
          await connectionPage.setupConnection(config);
          await sqlEditor.open();
          await sqlEditor.typeAndRun(
            `
PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS ${table2};
DROP TABLE IF EXISTS ${table1};
CREATE TABLE ${table1} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE ${table2} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES ${table1}(id),
  price REAL
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
      } finally {
        await removeSqliteDbFile(dbPath);
      }
    });
  });
});
