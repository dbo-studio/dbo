import { expect, type Page } from '@playwright/test';
import {
  POSTGRES_LIFECYCLE_FIELDS as F,
  POSTGRES_LIFECYCLE_PREVIEW as P,
  POSTGRES_LIFECYCLE_TABS as T
} from '../fixtures/postgresObjectFormLifecycle';
import { createDatabase, setupPostgresConnection } from './objectFormPostgresLifecycle';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

export { setupPostgresConnection, createDatabase };

export async function createSchema(
  page: Page,
  connectionName: string,
  databaseName: string,
  schemaName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName]);

  // After createDatabase, the workspace tab is renamed to the database name but keeps createDatabase action.
  // Close it so Create schema opens a fresh tab instead of reusing the stale one.
  await objectForm.closeWorkspaceTab(databaseName);
  await tree.runTreeAction(databaseName, 'Create schema');
  await objectForm.ensureWorkspaceTab('Create schema');
  await expect(objectForm.getTab(T.schema)).toBeVisible({ timeout: 30000 });

  await expect(objectForm.getGeneralField(F.schemaName)).toBeVisible({ timeout: 30000 });

  await objectForm.fillGeneralField(F.schemaName, schemaName);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.createSchema);
  await objectForm.assertPreviewContains(schemaName);
  await objectForm.confirmExecute();

  await tree.expandNode(databaseName);
  await expect(tree.getTreeNode(schemaName)).toBeVisible({ timeout: 15000 });
}

export async function createTableInSchema(
  page: Page,
  connectionName: string,
  databaseName: string,
  schemaName: string,
  tableName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName, schemaName]);
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

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTable);
  await objectForm.confirmExecute();

  await tree.waitForTreeLoad();
  await tree.expandPath([connectionName, databaseName, schemaName]);
  await tree.expandNode('Tables');
  await tree.waitForTreeLoad();
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 30000 });
}

export async function createViewInSchema(
  page: Page,
  connectionName: string,
  databaseName: string,
  schemaName: string,
  viewName: string,
  tableName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName, schemaName]);
  await tree.runTreeAction('Views', 'Create view');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create view');
  await objectForm.waitForReady();
  await objectForm.closeStaleWorkspaceTabs('Create view');
  await objectForm.wait(500);

  await objectForm.fillGeneralField(F.viewName, viewName);
  await objectForm.getGeneralField(F.viewQuery).click();
  await objectForm.wait(1000);
  await objectForm.fillGeneralQueryField(F.viewQuery, `SELECT id FROM ${schemaName}.${tableName}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createView);
  await objectForm.assertPreviewContains(viewName);
  await objectForm.confirmExecute();

  await tree.expandNode('Views');
  await expect(tree.getTreeNode(viewName)).toBeVisible({ timeout: 15000 });
}

export async function createMaterializedView(
  page: Page,
  connectionName: string,
  databaseName: string,
  schemaName: string,
  matViewName: string,
  tableName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath([connectionName, databaseName, schemaName]);
  await tree.runTreeAction('Materialized Views', 'Create materialized view');
  await objectForm.ensureWorkspaceTab('Create materialized view');
  await expect(objectForm.getTab(T.materializedView)).toBeVisible({ timeout: 30000 });

  await expect(objectForm.getGeneralField(F.matViewName)).toBeVisible({ timeout: 30000 });
  await objectForm.fillGeneralField(F.matViewName, matViewName);
  await objectForm.fillGeneralQueryField(F.matViewQuery, `SELECT id FROM ${schemaName}.${tableName}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createMaterializedView);
  await objectForm.assertPreviewContains(matViewName);
  await objectForm.confirmExecute();

  await tree.expandNode('Materialized Views');
  await expect(tree.getTreeNode(matViewName)).toBeVisible({ timeout: 15000 });
}

export async function editDatabaseComment(
  page: Page,
  databaseName: string,
  comment: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(databaseName, 'Edit database');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Edit database');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.databaseComment, comment);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.commentOnDatabase);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(databaseName)).toBeVisible({ timeout: 15000 });
}

export async function renameSchema(
  page: Page,
  schemaName: string,
  renamedSchemaName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(schemaName, 'Edit schema');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Edit schema');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.schemaName, renamedSchemaName);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.alterSchema);
  await objectForm.assertPreviewContains(/RENAME TO/i);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(renamedSchemaName)).toBeVisible({ timeout: 15000 });
}

export async function editViewQuery(page: Page, viewName: string, tableName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(viewName, 'Edit view');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Edit view');
  await objectForm.waitForReady();

  await objectForm.fillGeneralQueryField(F.viewQuery, `SELECT COUNT(*) AS total FROM ${tableName}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.replaceView);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(viewName)).toBeVisible({ timeout: 15000 });
}

export async function editTableSetNotNull(page: Page, tableName: string, columnRowIndex: number): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.columns);
  await objectForm.toggleArrayCheckbox(columnRowIndex, F.columnNotNull, true);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.setNotNull);
  await objectForm.confirmExecute();
}

export async function editTableSetDefault(
  page: Page,
  tableName: string,
  columnRowIndex: number,
  defaultValue: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.columns);
  await objectForm.fillArrayCell(columnRowIndex, F.columnDefault, defaultValue);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.setDefault);
  await objectForm.confirmExecute();
}

export async function editTableSetColumnComment(
  page: Page,
  tableName: string,
  columnRowIndex: number,
  comment: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.columns);
  await objectForm.fillArrayCell(columnRowIndex, F.columnComment, comment);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.commentOnColumn);
  await objectForm.confirmExecute();
}

export async function editTableDropForeignKey(page: Page, tableName: string, fkRowIndex = 0): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.foreignKeys);
  await objectForm.deleteArrayRow(fkRowIndex);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropConstraint);
  await objectForm.confirmExecute();
}

export async function editTableDropColumn(page: Page, tableName: string, columnRowIndex: number): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.columns);
  await objectForm.deleteArrayRow(columnRowIndex);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropColumn);
  await objectForm.confirmExecute();
}

export async function editTableComment(page: Page, tableName: string, comment: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableComment, comment);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.commentOnTable);
  await objectForm.confirmExecute();
}

export async function editTableRename(page: Page, tableName: string, renamedTableName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(F.tableName, renamedTableName);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.renameTable);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(renamedTableName)).toBeVisible({ timeout: 15000 });
}

export async function editTableChangeColumnType(
  page: Page,
  tableName: string,
  columnRowIndex: number,
  dataType: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.columns);
  await objectForm.selectArrayCellOption(columnRowIndex, F.columnType, dataType);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.alterColumnType);
  await objectForm.confirmExecute();
}

export async function editTableAddUniqueKey(
  page: Page,
  tableName: string,
  constraintName: string,
  columns: string[]
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.keys);
  const existingRows = await page.getByTestId(/^object-form-delete-row-/).count();
  await objectForm.addRow();
  const newRowIndex = existingRows;
  await objectForm.fillArrayCell(newRowIndex, F.keyName, constraintName);
  await objectForm.selectMultiSelectOptions(newRowIndex, F.keyColumns, columns);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addUnique);
  await objectForm.confirmExecute();
}

export async function editTableDropKey(page: Page, tableName: string, keyRowIndex: number): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.selectTab(T.keys);
  await objectForm.deleteArrayRow(keyRowIndex);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropKey);
  await objectForm.confirmExecute();
}

export async function cleanupExtended(
  page: Page,
  names: {
    connectionName: string;
    databaseName: string;
    renamedSchemaName: string;
    tableName: string;
    viewName: string;
    matViewName: string;
  }
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  await tree.expandPath([names.connectionName, names.databaseName, names.renamedSchemaName]);

  await tree.dropObject(names.matViewName, 'Drop materialized view');
  await expect(tree.getTreeNode(names.matViewName)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.viewName, 'Drop view');
  await expect(tree.getTreeNode(names.viewName)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.tableName, 'Drop table');
  await expect(tree.getTreeNode(names.tableName)).toBeHidden({ timeout: 15000 });

  await tree.dropObject(names.renamedSchemaName, 'Drop schema');
  await expect(tree.getTreeNode(names.renamedSchemaName)).toBeHidden({ timeout: 15000 });

  await tree.expandNode(names.connectionName);
  await tree.dropObject(names.databaseName, 'Drop database');
  await expect(tree.getTreeNode(names.databaseName)).toBeHidden({ timeout: 15000 });

  await connectionPage.deleteConnection(names.connectionName);

  return connectionPage;
}
