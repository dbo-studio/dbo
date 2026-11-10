import { expect, type Page } from '@playwright/test';
import { SQLITE_CORE_FIELDS as F, SQLITE_CORE_PREVIEW as P, SQLITE_CORE_TABS as T } from '../fixtures/sqliteCoreSchema';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';
import { removeSqliteDbFile } from './objectFormSqliteLifecycle';

export interface SqliteCoreNames {
  connectionName: string;
  dbPath: string;
  usersTable: string;
  indexName: string;
  triggerName: string;
  checkName: string;
}

async function openEditTable(page: Page, tableName: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();

  return objectForm;
}

// ---------------------------------------------------------------- indexes

export async function addIndex(page: Page, tableName: string, indexName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  const row = await objectForm.addArrayRow(F.indexName);
  await objectForm.fillArrayCell(row, F.indexName, indexName);
  await objectForm.selectMultiSelectOptions(row, F.indexColumns, ['email']);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createIndex);
  await objectForm.assertPreviewContains(indexName);
  // Adding an index must not recreate the table.
  await expect(page.getByText(/DROP TABLE/i)).toBeHidden();
  await objectForm.confirmExecute();
}

export async function expectIndexLoaded(page: Page, tableName: string, indexName: string, unique: boolean): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await expect(objectForm.getArrayCell(0, F.indexName).locator('input')).toHaveValue(indexName);
  await expect(objectForm.getArrayCell(0, F.indexColumns)).toContainText('email');

  const checkbox = objectForm.getArrayCell(0, F.indexUnique).locator('input[type="checkbox"]');
  if (unique) {
    await expect(checkbox).toBeChecked();
  } else {
    await expect(checkbox).not.toBeChecked();
  }
}

export async function makeIndexUnique(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await objectForm.toggleArrayCheckbox(0, F.indexUnique, true);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropIndex);
  await objectForm.assertPreviewContains(P.createUniqueIndex);
  await objectForm.confirmExecute();
}

export async function dropIndex(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await objectForm.deleteArrayRow(0);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropIndex);
  await objectForm.confirmExecute();
}

export async function expectNoIndexes(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await expect(objectForm.getArrayCell(0, F.indexName)).toBeHidden();
}

// --------------------------------------------------------------- triggers

export async function addTrigger(page: Page, tableName: string, triggerName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  const row = await objectForm.addArrayRow(F.triggerName);
  await objectForm.fillArrayCell(row, F.triggerName, triggerName);
  await objectForm.selectArrayCellOption(row, F.triggerTiming, 'AFTER');
  await objectForm.selectArrayCellOption(row, F.triggerEvent, 'INSERT');
  await objectForm.fillArrayQueryCell(row, F.triggerBody, 'UPDATE "' + tableName + '" SET email = lower(NEW.email) WHERE id = NEW.id;');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTrigger);
  await objectForm.assertPreviewContains(triggerName);
  await expect(page.getByText(/DROP TABLE/i)).toBeHidden();
  await objectForm.confirmExecute();
}

export async function expectTriggerLoaded(page: Page, tableName: string, triggerName: string, body: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await expect(objectForm.getArrayCell(0, F.triggerName).locator('input')).toHaveValue(triggerName);
  await expect(objectForm.getArrayCell(0, F.triggerTiming)).toContainText('AFTER');
  await expect(objectForm.getArrayCell(0, F.triggerEvent)).toContainText('INSERT');
  await expect(objectForm.getArrayCell(0, F.triggerBody)).toContainText(body);
}

export async function editTriggerBody(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await objectForm.fillArrayQueryCell(0, F.triggerBody, 'UPDATE "' + tableName + '" SET email = upper(NEW.email) WHERE id = NEW.id;');
  await objectForm.save();
  // SQLite has no ALTER TRIGGER: the edit drops and recreates.
  await objectForm.assertPreviewContains(P.dropTrigger);
  await objectForm.assertPreviewContains(/CREATE TRIGGER[\s\S]*upper\(NEW\.email\)/i);
  await objectForm.confirmExecute();
}

export async function dropTrigger(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await objectForm.deleteArrayRow(0);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropTrigger);
  await objectForm.confirmExecute();
}

export async function expectNoTriggers(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await expect(objectForm.getArrayCell(0, F.triggerName)).toBeHidden();
}

export async function addTriggerWithoutBodyRejected(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  const row = await objectForm.addArrayRow(F.triggerName);
  await objectForm.fillArrayCell(row, F.triggerName, 'trg_without_body');
  await objectForm.selectArrayCellOption(row, F.triggerTiming, 'AFTER');
  await objectForm.selectArrayCellOption(row, F.triggerEvent, 'INSERT');

  await objectForm.saveExpectingError(/body/i);
}

// ----------------------------------------------------------------- checks

export async function addCheck(page: Page, tableName: string, checkName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  const row = await objectForm.addArrayRow(F.checkName);
  await objectForm.fillArrayCell(row, F.checkName, checkName);
  await objectForm.fillArrayCell(row, F.checkExpression, 'length(email) > 3');

  await objectForm.save();
  // SQLite cannot add a CHECK in place: the table is recreated, and the index and trigger with it.
  await objectForm.assertPreviewContains(new RegExp(`CONSTRAINT "${checkName}" CHECK \\(length\\(email\\) > 3\\)`));
  await objectForm.assertPreviewContains(P.recreateKeepsIndex);
  await objectForm.assertPreviewContains(P.recreateKeepsTrigger);
  await objectForm.confirmExecute();
}

export async function expectCheckLoaded(page: Page, tableName: string, checkName: string, expression: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await expect(objectForm.getArrayCell(0, F.checkName).locator('input')).toHaveValue(checkName);
  await expect(objectForm.getArrayCell(0, F.checkExpression).locator('input')).toHaveValue(expression);
}

export async function editCheckExpression(page: Page, tableName: string, expression: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await objectForm.fillArrayCell(0, F.checkExpression, expression);
  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`CHECK \\(${expression.replace(/[()]/g, '\\$&')}\\)`));
  await objectForm.confirmExecute();
}

export async function dropCheck(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await objectForm.deleteArrayRow(0);
  await objectForm.save();
  await objectForm.assertPreviewContains(/CREATE TABLE/i);
  await objectForm.confirmExecute();
}

export async function expectNoChecks(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await expect(objectForm.getArrayCell(0, F.checkName)).toBeHidden();
}

export async function addCheckWithBadExpressionRejected(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  const row = await objectForm.addArrayRow(F.checkName);
  await objectForm.fillArrayCell(row, F.checkName, 'chk_bad');
  await objectForm.fillArrayCell(row, F.checkExpression, '1 = 1; DROP TABLE x');

  await objectForm.saveExpectingError(/single SQL expression/i);
}

// ---------------------------------------------------------------- cleanup

export async function cleanupSqliteCoreSchema(page: Page, names: SqliteCoreNames): Promise<void> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  try {
    await tree.expandPath([names.connectionName]);
    await tree.dropObject(names.usersTable, 'Drop table');
    await expect(tree.getTreeNode(names.usersTable)).toBeHidden({ timeout: 15000 });
    await connectionPage.deleteConnection(names.connectionName);
  } finally {
    removeSqliteDbFile(names.dbPath);
  }
}
