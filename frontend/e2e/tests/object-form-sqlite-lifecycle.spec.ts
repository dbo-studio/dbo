import { test } from '@playwright/test';
import { sqliteLifecycleNames } from '../fixtures/sqliteObjectFormLifecycle';
import { uniqueTestSuffix } from '../fixtures/uniqueSuffix';
import {
  cleanupSqliteLifecycle,
  createPostsTable,
  createUsersTable,
  createView,
  editUsersTableAddColumn,
  editViewQuery,
  setupSqliteConnection
} from '../helpers/objectFormSqliteLifecycle';

test.describe.configure({ mode: 'serial' });

test.describe('Object Form SQLite lifecycle', () => {
  test('Full create → edit → drop lifecycle', async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const names = sqliteLifecycleNames(suffix);

    await test.step('Connect to SQLite', async () => {
      await setupSqliteConnection(page, names.connectionName, names.dbPath);
    });

    await test.step('Create users table with columns and primary key', async () => {
      await createUsersTable(page, names.connectionName, names.usersTable);
    });

    await test.step('Create posts table with foreign key', async () => {
      await createPostsTable(page, names.connectionName, names.postsTable, names.usersTable);
    });

    await test.step('Create view', async () => {
      await createView(page, names.connectionName, names.viewName, names.postsTable);
    });

    await test.step('Edit users table — add column', async () => {
      await editUsersTableAddColumn(page, names.usersTable);
    });

    await test.step('Edit view — change query', async () => {
      await editViewQuery(page, names.viewName, names.postsTable);
    });

    await test.step('Cleanup — drop all objects and connection', async () => {
      await cleanupSqliteLifecycle(page, names);
    });
  });
});
