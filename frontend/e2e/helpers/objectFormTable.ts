import { expect, type Page } from '@playwright/test';
import type { CreateTableScenario, EditTableScenario } from '../fixtures/objectFormScenarios';
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
  rowIndex: number,
  columnName: string
): Promise<void> {
  await objectForm.selectTab(scenario.columnsTabId);
  await objectForm.addRow();
  await objectForm.fillArrayCell(rowIndex, scenario.columnNameFieldId, columnName);
  await objectForm.selectArrayCellOption(rowIndex, scenario.columnTypeFieldId, scenario.textTypeLabel);
}

export async function createTableViaObjectForm(
  page: Page,
  connectionName: string,
  scenario: CreateTableScenario,
  tableName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await tree.expandPath(scenario.treePath(connectionName));
  await tree.runTreeAction('Tables', 'Create table');
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
  await addTextColumn(objectForm, scenario, 1, columnName);

  await objectForm.save();
  await objectForm.assertPreviewContains(scenario.previewEditPattern);
  await objectForm.confirmExecute();

  await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
}

export async function setupConnectionForEngine(
  page: Page,
  engine: CreateTableScenario['engine'],
  connectionName: string
): Promise<ConnectionPage> {
  const connectionPage = new ConnectionPage(page);
  const { getDbConfig } = await import('../fixtures/dbConfigs');

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig(engine, connectionName));

  return connectionPage;
}
