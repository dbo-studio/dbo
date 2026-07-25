import { expect, type Page } from '@playwright/test';
import type { CreateTableScenario, EditTableScenario } from '../fixtures/objectFormScenarios';
import type { DbEngine } from '../fixtures/dbConfigs';
import { createDatabase as createMysqlDatabase } from './objectFormMysqlLifecycle';
import { createDatabase as createPostgresDatabase } from './objectFormPostgresLifecycle';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

export async function fillTableName(objectForm: ObjectFormPage, scenario: CreateTableScenario, tableName: string): Promise<void> {
  if (scenario.tableTabId) {
    await objectForm.selectTab(scenario.tableTabId);
  }

  const { location, fieldId, rowIndex = 0 } = scenario.tableName;

  if (location === 'general') {
    await objectForm.fillGeneralField(fieldId, tableName);
    return;
  }

  await objectForm.fillArrayCell(rowIndex, fieldId, tableName);
}

export async function addIdColumn(
  objectForm: ObjectFormPage,
  scenario: CreateTableScenario | EditTableScenario,
  rowIndex: number,
  columnName = 'id'
): Promise<void> {
  await objectForm.selectTab(scenario.columnsTabId);
  await objectForm.addRow();
  await objectForm.fillArrayCell(rowIndex, scenario.columnNameFieldId, columnName);

  if ('integerTypeLabel' in scenario) {
    await objectForm.selectArrayCellOption(rowIndex, scenario.columnTypeFieldId, scenario.integerTypeLabel);
  }
}

export async function addTextColumn(
  objectForm: ObjectFormPage,
  scenario: EditTableScenario,
  columnName: string
): Promise<void> {
  await objectForm.selectTab(scenario.columnsTabId);
  const rowIndex = await objectForm.addArrayRow(scenario.columnNameFieldId);
  await objectForm.fillArrayCell(rowIndex, scenario.columnNameFieldId, columnName);
  await objectForm.selectArrayCellOption(rowIndex, scenario.columnTypeFieldId, scenario.textTypeLabel);
  // Re-fill after combobox selection so blur commits text into the form store.
  await objectForm.fillArrayCell(rowIndex, scenario.columnNameFieldId, columnName);
}

export async function createTableViaObjectForm(
  page: Page,
  connectionName: string,
  scenario: CreateTableScenario,
  tableName: string,
  databaseName?: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  if ((scenario.engine === 'postgresql' || scenario.engine === 'mysql') && !databaseName) {
    throw new Error(`databaseName is required for ${scenario.engine} object-form table tests`);
  }

  await tree.expandPath(scenario.treePath(connectionName, databaseName));
  await tree.runTreeAction('Tables', 'Create table');
  await objectForm.waitForReady();
  await objectForm.activateWorkspaceTab('Create table');
  await objectForm.waitForReady();

  if (scenario.tableTabId) {
    await expect(objectForm.getTab(scenario.tableTabId)).toBeVisible();
  } else {
    await expect(objectForm.getTab(scenario.columnsTabId)).toBeVisible();
  }

  await fillTableName(objectForm, scenario, tableName);

  await objectForm.selectTab(scenario.columnsTabId);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, scenario.columnNameFieldId, 'id');
  await objectForm.selectArrayCellOption(0, scenario.columnTypeFieldId, scenario.integerTypeLabel);

  await objectForm.save();
  await objectForm.assertPreviewContains(scenario.previewCreatePattern);
  await objectForm.assertPreviewContains(tableName);
  await objectForm.confirmExecute();

  await tree.expandNode('Tables');
  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function editTableAddColumn(
  page: Page,
  scenario: EditTableScenario,
  tableName: string,
  columnName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();
  await addTextColumn(objectForm, scenario, columnName);

  await objectForm.selectTab(scenario.columnsTabId);
  await objectForm.wait(300);
  await objectForm.save();
  await objectForm.assertPreviewContains(scenario.previewEditPattern);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function setupConnectionForEngine(
  page: Page,
  engine: CreateTableScenario['engine'],
  connectionName: string,
  sqlitePath?: string
): Promise<ConnectionPage> {
  const connectionPage = new ConnectionPage(page);
  const { getDbConfig } = await import('../fixtures/dbConfigs');
  const { ensureSqliteDbFile } = await import('./objectFormSqliteLifecycle');

  if (engine === 'sqlite' && sqlitePath) {
    ensureSqliteDbFile(sqlitePath);
  }

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig(engine, connectionName, sqlitePath));

  return connectionPage;
}

export async function setupObjectFormDatabase(
  page: Page,
  engine: DbEngine,
  connectionName: string,
  databaseName: string
): Promise<void> {
  if (engine === 'postgresql') {
    await createPostgresDatabase(page, connectionName, databaseName);
    return;
  }

  if (engine === 'mysql') {
    await createMysqlDatabase(page, connectionName, databaseName);
  }
}

export async function cleanupObjectFormTable(
  page: Page,
  connectionName: string,
  tableName: string,
  options?: { databaseName?: string; sqlitePath?: string; engine?: DbEngine }
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);
  const databaseName = options?.databaseName;

  if (databaseName) {
    const objectPath =
      options?.engine === 'postgresql'
        ? [connectionName, databaseName, 'public']
        : [connectionName, databaseName];
    await tree.expandPath(objectPath);
    await tree.dropObject(tableName, 'Drop table');
    await tree.expandNode(connectionName);
    await tree.dropObject(databaseName, 'Drop database');
  } else if (options?.sqlitePath) {
    await tree.expandPath([connectionName]);
    await tree.dropObject(tableName, 'Drop table');
  } else {
    throw new Error('cleanupObjectFormTable requires databaseName or sqlitePath');
  }

  await connectionPage.deleteConnection(connectionName);

  if (options?.sqlitePath) {
    const { removeSqliteDbFile } = await import('./objectFormSqliteLifecycle');
    removeSqliteDbFile(options.sqlitePath);
  }

  return connectionPage;
}
