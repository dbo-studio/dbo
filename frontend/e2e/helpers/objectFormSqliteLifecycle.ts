import { expect, type Page } from '@playwright/test';
import {
  SQLITE_LIFECYCLE_FIELDS as F,
  SQLITE_LIFECYCLE_PREVIEW as P,
  SQLITE_LIFECYCLE_TABS as T
} from '../fixtures/sqliteObjectFormLifecycle';
import { getDbConfig } from '../fixtures/dbConfigs';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

export async function setupSqliteConnection(page: Page, connectionName: string, dbPath: string): Promise<ConnectionPage> {
  const connectionPage = new ConnectionPage(page);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig('sqlite', connectionName, dbPath));

  return connectionPage;
}

export async function createUsersTable(page: Page, connectionName: string, tableName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName]);
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, tableName);

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.columnName, 'id');
  await objectForm.selectArrayCellOption(0, F.columnType, 'INTEGER');
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, F.columnName, 'email');
  await objectForm.selectArrayCellOption(1, F.columnType, 'TEXT');

  await objectForm.selectTab(T.keys);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.keyName, 'pk_users');
  await objectForm.selectMultiSelectOptions(0, F.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(0, F.keyType, 'PRIMARY KEY');

  await objectForm.selectTab(T.columns);
  await objectForm.wait(300);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.assertPreviewContains(P.primaryKey);
  await objectForm.confirmExecute();

  await tree.expandNode('Tables');
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function createPostsTable(
  page: Page,
  connectionName: string,
  tableName: string,
  usersTable: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName]);
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, tableName);

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.columnName, 'id');
  await objectForm.selectArrayCellOption(0, F.columnType, 'INTEGER');
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, F.columnName, 'user_id');
  await objectForm.selectArrayCellOption(1, F.columnType, 'INTEGER');

  await objectForm.selectTab(T.keys);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.keyName, 'pk_posts');
  await objectForm.selectMultiSelectOptions(0, F.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(0, F.keyType, 'PRIMARY KEY');

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

  await objectForm.selectTab(T.columns);
  await objectForm.wait(300);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.assertPreviewContains(P.foreignKey);
  await objectForm.confirmExecute();

  await tree.expandNode('Tables');
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function createView(page: Page, connectionName: string, viewName: string, postsTable: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName]);
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
  await objectForm.activateWorkspaceTab('Edit table');
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
  await objectForm.assertPreviewContains(P.recreateView);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(viewName)).toBeVisible({ timeout: 15000 });
}

export async function cleanupSqliteLifecycle(
  page: Page,
  names: {
    connectionName: string;
    usersTable: string;
    postsTable: string;
    viewName: string;
  }
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  await tree.expandPath([names.connectionName]);

  await tree.dropObject(names.viewName, 'Drop view');
  await expect(tree.getTreeNode(names.viewName)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.postsTable, 'Drop table');
  await expect(tree.getTreeNode(names.postsTable)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.usersTable, 'Drop table');
  await expect(tree.getTreeNode(names.usersTable)).toBeHidden({ timeout: 15000 });

  await connectionPage.deleteConnection(names.connectionName);

  return connectionPage;
}
