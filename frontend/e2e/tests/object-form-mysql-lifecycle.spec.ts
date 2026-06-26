import { test } from '@playwright/test';
import { mysqlLifecycleNames } from '../fixtures/mysqlObjectFormLifecycle';
import { uniqueTestSuffix } from '../fixtures/uniqueSuffix';
import {
  cleanupMysqlLifecycle,
  createPostsTable,
  createUsersTable,
  createView,
  editUsersTableAddColumn,
  editViewQuery,
  setupMysqlConnection
} from '../helpers/objectFormMysqlLifecycle';

test.describe.configure({ mode: 'serial' });

test.describe('Object Form MySQL lifecycle', () => {
  test('Full create → edit → drop lifecycle', async ({ page }, testInfo) => {
    const names = { ...mysqlLifecycleNames(uniqueTestSuffix(testInfo)), databaseName: 'default' };

    await test.step('Connect to MySQL', async () => {
      await setupMysqlConnection(page, names.connectionName);
    });

    await test.step('Create users table with columns and primary key', async () => {
      await createUsersTable(page, names.connectionName, names.databaseName, names.usersTable);
    });

    await test.step('Create posts table with foreign key and index', async () => {
      await createPostsTable(page, names.connectionName, names.databaseName, names.postsTable, names.usersTable);
    });

    await test.step('Create view', async () => {
      await createView(page, names.connectionName, names.databaseName, names.viewName, names.postsTable);
    });

    await test.step('Edit users table — add column', async () => {
      await editUsersTableAddColumn(page, names.usersTable);
    });

    await test.step('Edit view — change query', async () => {
      await editViewQuery(page, names.viewName, names.postsTable);
    });

    await test.step('Cleanup — drop all objects and connection', async () => {
      await cleanupMysqlLifecycle(page, names, { dropDatabase: false });
    });
  });
});
