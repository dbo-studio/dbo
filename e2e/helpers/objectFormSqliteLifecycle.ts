import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import {
  SQLITE_LIFECYCLE_FIELDS as F,
  SQLITE_LIFECYCLE_PREVIEW as P,
  SQLITE_LIFECYCLE_TABS as T
} from '../fixtures/sqliteObjectFormLifecycle';
import { getDbConfig } from '../fixtures/dbConfigs';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

/** Backend rejects SQLite connections when the path does not exist yet. */
export function ensureSqliteDbFile(dbPath: string): void {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
  }
}

export function removeSqliteDbFile(dbPath: string): void {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
}

export async function setupSqliteConnection(page: Page, connectionName: string, dbPath: string): Promise<ConnectionPage> {
  const connectionPage = new ConnectionPage(page);

  ensureSqliteDbFile(dbPath);
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
  await objectForm.fillArrayCell(0, F.columnName, 'id');

  await objectForm.selectTab(T.keys);
  const keyRowIndex = await objectForm.addArrayRow(F.keyName);
  await objectForm.fillArrayCell(keyRowIndex, F.keyName, 'pk_users');
  await objectForm.selectMultiSelectOptions(keyRowIndex, F.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(keyRowIndex, F.keyType, 'PRIMARY KEY');

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
  usersTable: string,
  fkName: string
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
  await objectForm.fillArrayCell(0, F.columnName, 'id');

  const userIdRowIndex = await objectForm.addArrayRow(F.columnName);
  await objectForm.fillArrayCell(userIdRowIndex, F.columnName, 'user_id');
  await objectForm.selectArrayCellOption(userIdRowIndex, F.columnType, 'INTEGER');
  await objectForm.fillArrayCell(userIdRowIndex, F.columnName, 'user_id');

  await objectForm.selectTab(T.keys);
  const keyRowIndex = await objectForm.addArrayRow(F.keyName);
  await objectForm.fillArrayCell(keyRowIndex, F.keyName, 'pk_posts');
  await objectForm.selectMultiSelectOptions(keyRowIndex, F.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(keyRowIndex, F.keyType, 'PRIMARY KEY');

  await objectForm.selectTab(T.foreignKeys);
  const fkRowIndex = await objectForm.addArrayRow(F.fkName);
  await objectForm.fillArrayCell(fkRowIndex, F.fkName, fkName);

  const dynamicOptionsPromise = page.waitForResponse(
    (response) => response.url().includes('/dynamic') && response.status() === 200,
    { timeout: 15000 }
  );
  await objectForm.selectArrayCellOption(fkRowIndex, F.fkTargetTable, usersTable);
  await dynamicOptionsPromise.catch(() => undefined);
  await objectForm.wait(500);

  await objectForm.selectMultiSelectOptions(fkRowIndex, F.fkSourceColumns, ['user_id']);
  await objectForm.selectMultiSelectOptions(fkRowIndex, F.fkTargetColumns, ['id']);

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
  await objectForm.closeStaleWorkspaceTabs('Create view');
  await objectForm.wait(500);

  await objectForm.fillGeneralField(F.viewName, viewName);
  await objectForm.getGeneralField(F.viewQuery).click();
  await objectForm.wait(1000);
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
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();

  await objectForm.selectTab(T.columns);
  const notesRowIndex = await objectForm.addArrayRow(F.columnName);
  await objectForm.fillArrayCell(notesRowIndex, F.columnName, 'notes');
  await objectForm.selectArrayCellOption(notesRowIndex, F.columnType, 'TEXT');
  await objectForm.fillArrayCell(notesRowIndex, F.columnName, 'notes');

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
  await objectForm.ensureWorkspaceTab(viewName, 'Edit view');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.view);
  await objectForm.wait(500);

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
    dbPath: string;
    usersTable: string;
    postsTable: string;
    viewName: string;
  }
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  try {
    await tree.expandPath([names.connectionName]);

    await tree.dropObject(names.viewName, 'Drop view');
    await expect(tree.getTreeNode(names.viewName)).toBeHidden({ timeout: 15000 });

    await tree.dropObject(names.postsTable, 'Drop table');
    await expect(tree.getTreeNode(names.postsTable)).toBeHidden({ timeout: 15000 });

    await tree.dropObject(names.usersTable, 'Drop table');
    await expect(tree.getTreeNode(names.usersTable)).toBeHidden({ timeout: 15000 });

    await connectionPage.deleteConnection(names.connectionName);
  } finally {
    removeSqliteDbFile(names.dbPath);
  }

  return connectionPage;
}
