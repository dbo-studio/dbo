import { expect, test } from '@playwright/test';
import { ConnectionPage, SqlEditorPage, SidebarPage, type ConnectionConfig } from '../pages';

/**
 * Connection Management Scenario
 * 
 * Tests the full connection lifecycle using Page Object Model.
 */
test.describe('Connection Management', () => {
    const testPrefix = 'conn-test';

    test('Create and delete a connection', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const connectionName = `${testPrefix}-${Date.now()}`;
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

        await test.step('Create a new connection', async () => {
            await connectionPage.createConnection(config);
            await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
        });

        await test.step('Activate connection', async () => {
            await connectionPage.activateConnection(connectionName);
            await expect(connectionPage.getConnectionHeading(connectionName)).toBeVisible();
        });

        await test.step('Delete the connection', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });

    test('Edit connection', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const connectionName = `${testPrefix}-edit-${Date.now()}`;
        const editedName = `${connectionName}-edited`;
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

        await test.step('Create connection', async () => {
            await connectionPage.createConnection(config);
        });

        await test.step('Open edit dialog', async () => {
            await connectionPage.editConnection(connectionName);
            await expect(connectionPage.nameInput).toHaveValue(connectionName);
        });

        await test.step('Update connection name', async () => {
            await connectionPage.nameInput.fill(editedName);
            await connectionPage.testConnection();
            await connectionPage.submitConnection();
            await expect(connectionPage.getConnectionItem(editedName)).toBeVisible();
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(editedName);
        });
    });

    test('Refresh connection', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const connectionName = `${testPrefix}-refresh-${Date.now()}`;
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

        await test.step('Create and activate connection', async () => {
            await connectionPage.createConnection(config);
            await connectionPage.activateConnection(connectionName);
        });

        await test.step('Refresh connection via context menu', async () => {
            await connectionPage.refreshConnection(connectionName);
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });

    test('Connection context menu options', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const connectionName = `${testPrefix}-menu-${Date.now()}`;
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

        await test.step('Create connection', async () => {
            await connectionPage.createConnection(config);
        });

        await test.step('Verify context menu options', async () => {
            await connectionPage.openContextMenu(connectionName);

            const menu = page.getByRole('menu');
            await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
            await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
            await expect(menu.getByRole('menuitem', { name: 'Refresh' })).toBeVisible();

            await connectionPage.closeContextMenu();
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });

    test('Create schema via SQL query', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const sqlEditor = new SqlEditorPage(page);
        const sidebar = new SidebarPage(page);

        const connectionName = `${testPrefix}-schema-${Date.now()}`;
        const schemaName = `e2e_schema_${Date.now()}`;
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

        await test.step('Create schema via SQL', async () => {
            await sqlEditor.typeAndRun(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
        });

        await test.step('Verify schema in tree view', async () => {
            await sidebar.switchTo('Items');
            await sidebar.expectItemVisible(schemaName);
        });

        await test.step('Drop schema', async () => {
            await sqlEditor.typeAndRun(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });
});
