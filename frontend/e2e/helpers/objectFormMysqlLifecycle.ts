import { expect, type Page } from '@playwright/test';
import { getDbConfig } from '../fixtures/dbConfigs';
import {
  MYSQL_LIFECYCLE_FIELDS as F,
  MYSQL_LIFECYCLE_PREVIEW as P,
  MYSQL_LIFECYCLE_TABS as T
} from '../fixtures/mysqlObjectFormLifecycle';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

export async function setupMysqlConnection(page: Page, connectionName: string): Promise<ConnectionPage> {
  const connectionPage = new ConnectionPage(page);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig('mysql', connectionName));

  return connectionPage;
}

export async function createDatabase(page: Page, connectionName: string, databaseName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(connectionName, 'Create database');
  await objectForm.waitForReady();
  await expect(objectForm.getTab(T.database)).toBeVisible();

  await objectForm.fillGeneralField(F.databaseName, databaseName);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.createDatabase);
  await objectForm.assertPreviewContains(databaseName);
  await objectForm.confirmExecute();

  await tree.expandNode(connectionName);
  await expect(tree.getTreeNode(databaseName)).toBeVisible({ timeout: 15000 });
}

export async function createUsersTable(page: Page, connectionName: string, databaseName: string, tableName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName]);
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, tableName);

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.columnName, 'id');
  await objectForm.selectArrayCellOption(0, F.columnType, 'INT');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.assertPreviewContains('id');
  await objectForm.confirmExecute();

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName);
  await objectForm.waitForReady();
  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, F.columnName, 'email');
  await objectForm.selectArrayCellOption(1, F.columnType, 'VARCHAR');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.addColumn);
  await objectForm.confirmExecute();

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName);
  await objectForm.waitForReady();
  await objectForm.selectTab(T.keys);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.keyName, 'pk_users');
  await objectForm.selectMultiSelectOptions(0, F.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(0, F.keyType, 'PRIMARY KEY');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.primaryKey);
  await objectForm.confirmExecute();

  await tree.expandNode('Tables');
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function createPostsTable(
  page: Page,
  connectionName: string,
  databaseName: string,
  tableName: string,
  usersTable: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName]);
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, tableName);

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.columnName, 'id');
  await objectForm.selectArrayCellOption(0, F.columnType, 'INT');
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, F.columnName, 'user_id');
  await objectForm.selectArrayCellOption(1, F.columnType, 'INT');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.confirmExecute();

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName);
  await objectForm.waitForReady();

  await objectForm.selectTab(T.keys);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.keyName, 'pk_posts');
  await objectForm.selectMultiSelectOptions(0, F.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(0, F.keyType, 'PRIMARY KEY');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.primaryKey);
  await objectForm.confirmExecute();

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName);
  await objectForm.waitForReady();
  await objectForm.selectTab(T.foreignKeys);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.fkName, 'fk_posts_user');

  const dynamicOptionsPromise = page.waitForResponse(
    (response) => response.url().includes('/dynamic') && response.status() === 200,
    { timeout: 15000 }
  );
  await objectForm.selectArrayCellOption(0, F.fkTargetTable, usersTable);
  await dynamicOptionsPromise.catch(() => undefined);
  await objectForm.wait(500);

  await objectForm.selectMultiSelectOptions(0, F.fkSourceColumns, ['user_id']);
  await objectForm.selectMultiSelectOptions(0, F.fkTargetColumns, ['id']);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.foreignKey);
  await objectForm.confirmExecute();

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName);
  await objectForm.waitForReady();
  await objectForm.selectTab(T.indexes);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.indexName, 'idx_posts_user_id');
  await objectForm.selectMultiSelectOptions(0, F.indexColumns, ['user_id']);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.createIndex);
  await objectForm.confirmExecute();

  await tree.expandNode('Tables');
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function createView(
  page: Page,
  connectionName: string,
  databaseName: string,
  viewName: string,
  postsTable: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName]);
  await tree.runTreeAction('Views', 'Create view');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create view');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.viewName, viewName);
  await objectForm.fillGeneralQueryField(F.viewQuery, `SELECT id, user_id FROM ${postsTable}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createView);
  await objectForm.assertPreviewContains(viewName);
  await objectForm.confirmExecute();

  await tree.expandNode('Views');
  await expect(tree.getTreeNode(viewName)).toBeVisible({ timeout: 15000 });
}

export async function editUsersTableAddColumn(page: Page, tableName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName);
  await objectForm.waitForReady();

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(2, F.columnName, 'notes');
  await objectForm.selectArrayCellOption(2, F.columnType, 'TEXT');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addColumn);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function editViewQuery(page: Page, viewName: string, postsTable: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(viewName, 'Edit view');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Edit view');
  await objectForm.waitForReady();

  await objectForm.fillGeneralQueryField(F.viewQuery, `SELECT COUNT(*) AS total FROM ${postsTable}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.replaceView);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(viewName)).toBeVisible({ timeout: 15000 });
}

export async function cleanupMysqlLifecycle(
  page: Page,
  names: {
    connectionName: string;
    databaseName: string;
    usersTable: string;
    postsTable: string;
    viewName: string;
  },
  options?: { dropDatabase?: boolean }
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  await tree.expandPath([names.connectionName, names.databaseName]);

  await tree.dropObject(names.viewName, 'Drop view');
  await expect(tree.getTreeNode(names.viewName)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.postsTable, 'Drop table');
  await expect(tree.getTreeNode(names.postsTable)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.usersTable, 'Drop table');
  await expect(tree.getTreeNode(names.usersTable)).toBeHidden({ timeout: 15000 });

  if (options?.dropDatabase !== false && names.databaseName !== 'default') {
    await tree.expandNode(names.connectionName);
    await tree.dropObject(names.databaseName, 'Drop database');
    await expect(tree.getTreeNode(names.databaseName)).toBeHidden({ timeout: 15000 });
  }

  await connectionPage.deleteConnection(names.connectionName);

  return connectionPage;
}
