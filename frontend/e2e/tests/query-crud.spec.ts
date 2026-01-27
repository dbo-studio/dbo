import { expect, test } from '@playwright/test';
import { ConnectionPage, DataGridPage, SqlEditorPage, type ConnectionConfig } from '../pages';

/**
 * Query CRUD Scenario
 *
 * Tests SQL CRUD operations using Page Object Model.
 */
test.describe('Query CRUD Operations', () => {
  const testPrefix = 'crud-test';

  test('Full CRUD operations via SQL editor', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const connectionName = `${testPrefix}-${Date.now()}`;
    const tableName = `e2e_users_${Date.now()}`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
      await expect(connectionPage.getConnectionHeading(connectionName)).toBeVisible();
    });

    await test.step('Open SQL editor', async () => {
      await sqlEditor.open();
    });

    await test.step('Create test table', async () => {
      await sqlEditor.typeAndRun(
        `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
            `.trim()
      );
    });

    await test.step('Insert data', async () => {
      await sqlEditor.typeAndRun(
        `
INSERT INTO ${tableName} (name, email) VALUES 
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Wilson', 'bob@example.com');
            `.trim()
      );
    });

    await test.step('Select and verify data in grid', async () => {
      await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
      await dataGrid.waitForData();

      await dataGrid.expectCellVisible('John Doe');
      await dataGrid.expectCellVisible('jane@example.com');
      await dataGrid.expectCellVisible('Bob Wilson');
    });

    await test.step('Update data', async () => {
      await sqlEditor.typeAndRun(`UPDATE ${tableName} SET name = 'John Updated' WHERE email = 'john@example.com';`);

      // Verify update
      await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} WHERE email = 'john@example.com';`);
      await dataGrid.waitForData();
      await dataGrid.expectCellVisible('John Updated');
    });

    await test.step('Delete data', async () => {
      await sqlEditor.typeAndRun(`DELETE FROM ${tableName} WHERE email = 'bob@example.com';`);

      // Verify deletion
      await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY id;`);
      await dataGrid.waitForData();

      await dataGrid.expectCellHidden('Bob Wilson');
      await dataGrid.expectCellVisible('John Updated');
      await dataGrid.expectCellVisible('Jane Smith');
    });

    await test.step('Drop test table', async () => {
      await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
    });

    await test.step('Cleanup connection', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });

  test('Create and query multiple tables with JOIN', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const dataGrid = new DataGridPage(page);

    const connectionName = `${testPrefix}-multi-${Date.now()}`;
    const table1 = `e2e_categories_${Date.now()}`;
    const table2 = `e2e_products_${Date.now()}`;
    const config: ConnectionConfig = {
      name: connectionName,
      host: 'sample-pgsql',
      port: '5432',
      username: 'default',
      password: 'secret',
      type: 'PostgreSQL'
    };

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Open SQL editor', async () => {
      await sqlEditor.open();
    });

    await test.step('Create categories table', async () => {
      await sqlEditor.typeAndRun(
        `
DROP TABLE IF EXISTS ${table2};
DROP TABLE IF EXISTS ${table1};
CREATE TABLE ${table1} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);
            `.trim()
      );
    });

    await test.step('Create products table with foreign key', async () => {
      await sqlEditor.typeAndRun(
        `
CREATE TABLE ${table2} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT REFERENCES ${table1}(id),
    price DECIMAL(10, 2)
);
            `.trim()
      );
    });

    await test.step('Insert test data', async () => {
      await sqlEditor.typeAndRun(
        `
INSERT INTO ${table1} (name) VALUES ('Electronics'), ('Books');
INSERT INTO ${table2} (name, category_id, price) VALUES 
    ('Laptop', 1, 999.99),
    ('Phone', 1, 599.99),
    ('Novel', 2, 19.99);
            `.trim()
      );
    });

    await test.step('Query with JOIN', async () => {
      await sqlEditor.typeAndRun(
        `
SELECT p.name as product, c.name as category, p.price 
FROM ${table2} p 
JOIN ${table1} c ON p.category_id = c.id 
ORDER BY p.price DESC;
            `.trim()
      );
      await dataGrid.waitForData();

      await dataGrid.expectCellVisible('Laptop');
      await dataGrid.expectCellVisible('Electronics');
    });

    await test.step('Cleanup tables', async () => {
      await sqlEditor.typeAndRun(
        `
DROP TABLE IF EXISTS ${table2};
DROP TABLE IF EXISTS ${table1};
            `.trim()
      );
    });

    await test.step('Cleanup connection', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });
});
