import { test } from '@playwright/test';
import { postgresExtendedNames } from '../fixtures/postgresObjectFormLifecycle';
import { uniqueTestSuffix } from '../fixtures/uniqueSuffix';
import {
  cleanupExtended,
  createDatabase,
  createMaterializedView,
  createSchema,
  createTableInSchema,
  createViewInSchema,
  editDatabaseComment,
  editViewQuery,
  renameSchema,
  setupPostgresConnection
} from '../helpers/objectFormPostgresExtended';

test.describe.configure({ mode: 'serial' });

test.describe('Object Form PostgreSQL schema and matview', () => {
  test('Schema, matview, edit database, edit view lifecycle', async ({ page }, testInfo) => {
    const names = postgresExtendedNames(uniqueTestSuffix(testInfo));

    await test.step('Connect to PostgreSQL', async () => {
      await setupPostgresConnection(page, names.connectionName);
    });

    await test.step('Create database', async () => {
      await createDatabase(page, names.connectionName, names.databaseName);
    });

    await test.step('Create schema', async () => {
      await createSchema(page, names.connectionName, names.databaseName, names.schemaName);
    });

    await test.step('Create table in schema', async () => {
      await createTableInSchema(
        page,
        names.connectionName,
        names.databaseName,
        names.schemaName,
        names.tableName
      );
    });

    await test.step('Create materialized view', async () => {
      await createMaterializedView(
        page,
        names.connectionName,
        names.databaseName,
        names.schemaName,
        names.matViewName,
        names.tableName
      );
    });

    await test.step('Create view for edit step', async () => {
      await createViewInSchema(
        page,
        names.connectionName,
        names.databaseName,
        names.schemaName,
        names.viewName,
        names.tableName
      );
    });

    await test.step('Edit database — add comment', async () => {
      await editDatabaseComment(page, names.databaseName, 'e2e extended test database');
    });

    await test.step('Rename schema', async () => {
      await renameSchema(page, names.schemaName, names.renamedSchemaName);
    });

    await test.step('Edit view — change query', async () => {
      await editViewQuery(page, names.viewName, names.tableName);
    });

    await test.step('Cleanup — drop all objects and connection', async () => {
      await cleanupExtended(page, names);
    });
  });
});
