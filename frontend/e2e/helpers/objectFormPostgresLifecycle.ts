import { expect, type Page } from '@playwright/test';
import { getDbConfig } from '../fixtures/dbConfigs';
import {
  POSTGRES_LIFECYCLE_FIELDS as F,
  POSTGRES_LIFECYCLE_PREVIEW as P,
  POSTGRES_LIFECYCLE_TABS as T
} from '../fixtures/postgresObjectFormLifecycle';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

export async function setupPostgresConnection(page: Page, connectionName: string): Promise<ConnectionPage> {
  const connectionPage = new ConnectionPage(page);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig('postgresql', connectionName));

  return connectionPage;
}

export async function createDatabase(page: Page, connectionName: string, databaseName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(connectionName, 'Create database');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create database');
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

export async function createUsersTable(
  page: Page,
  connectionName: string,
  databaseName: string,
  tableName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName, 'public']);
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, tableName);

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.columnName, 'id');
  await objectForm.selectArrayCellOption(0, F.columnType, 'integer');
  await objectForm.toggleArrayCheckbox(0, F.columnPrimary, true);
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, F.columnName, 'email');
  await objectForm.selectArrayCellOption(1, F.columnType, 'text');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.assertPreviewContains(/PRIMARY KEY/i);
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

  await tree.expandPath([connectionName, databaseName, 'public']);
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, tableName);

  await objectForm.selectTab(T.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, F.columnName, 'id');
  await objectForm.selectArrayCellOption(0, F.columnType, 'integer');
  await objectForm.toggleArrayCheckbox(0, F.columnPrimary, true);
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, F.columnName, 'user_id');
  await objectForm.selectArrayCellOption(1, F.columnType, 'integer');

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
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.assertPreviewContains(P.foreignKey);
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

  await tree.expandPath([connectionName, databaseName, 'public']);
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
  await objectForm.selectArrayCellOption(2, F.columnType, 'text');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addColumn);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function cleanupPostgresLifecycle(
  page: Page,
  names: {
    connectionName: string;
    databaseName: string;
    usersTable: string;
    postsTable: string;
    viewName: string;
  }
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  await tree.expandPath([names.connectionName, names.databaseName, 'public']);

  await tree.dropObject(names.viewName, 'Drop view');
  await expect(tree.getTreeNode(names.viewName)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.postsTable, 'Drop table');
  await expect(tree.getTreeNode(names.postsTable)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.usersTable, 'Drop table');
  await expect(tree.getTreeNode(names.usersTable)).toBeHidden({ timeout: 15000 });

  await tree.expandNode(names.connectionName);
  await tree.dropObject(names.databaseName, 'Drop database');
  await expect(tree.getTreeNode(names.databaseName)).toBeHidden({ timeout: 15000 });

  await connectionPage.deleteConnection(names.connectionName);

  return connectionPage;
}
