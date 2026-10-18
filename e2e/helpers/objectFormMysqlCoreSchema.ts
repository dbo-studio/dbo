import { expect, type Locator, type Page } from '@playwright/test';
import { MYSQL_CORE_FIELDS as F, MYSQL_CORE_PREVIEW as P, MYSQL_CORE_TABS as T } from '../fixtures/mysqlCoreSchema';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';
import { MYSQL_LIFECYCLE_FIELDS as LF, MYSQL_LIFECYCLE_TABS as LT } from '../fixtures/mysqlObjectFormLifecycle';
import { createDatabase, setupMysqlConnection } from './objectFormMysqlLifecycle';

export interface MysqlCoreNames {
  connectionName: string;
  databaseName: string;
  usersTable: string;
}

/** users(id INT auto-increment PK, email VARCHAR); the container is addressed by node id. */
async function createUsersTable(page: Page, names: MysqlCoreNames): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  const container = await expandContainer(page, names, 'tableContainer');
  await container.click({ button: 'right' });
  await tree.clickContextMenuAction('Create table');
  await objectForm.ensureWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(LF.tableName, names.usersTable);
  await objectForm.selectGeneralOption(LF.tableEngine, 'InnoDB');

  await objectForm.selectTab(LT.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, LF.columnName, 'id');
  await objectForm.selectArrayCellOption(0, LF.columnType, 'INT');
  await objectForm.toggleArrayCheckbox(0, LF.columnIdentity, true);
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, LF.columnName, 'email');
  await objectForm.selectArrayCellOption(1, LF.columnType, 'VARCHAR');

  await objectForm.selectTab(LT.keys);
  const keyRow = await objectForm.addArrayRow(LF.keyName);
  await objectForm.fillArrayCell(keyRow, LF.keyName, 'pk_users');
  await objectForm.selectMultiSelectOptions(keyRow, LF.keyColumns, ['id']);
  await objectForm.selectArrayCellOption(keyRow, LF.keyType, 'PRIMARY KEY');

  await objectForm.save();
  await objectForm.assertPreviewContains(/CREATE TABLE/i);
  await objectForm.confirmExecute();

  await expandContainer(page, names, 'tableContainer');
  await expect(tree.getTreeNode(names.usersTable)).toBeVisible({ timeout: 30000 });
}

export async function setupMysqlCoreSchema(page: Page, names: MysqlCoreNames): Promise<void> {
  await setupMysqlConnection(page, names.connectionName);
  await createDatabase(page, names.connectionName, names.databaseName);
  await createUsersTable(page, names);
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

/** Container nodes exist once per database; address them by node id, not by name search. */
async function expandContainer(page: Page, names: MysqlCoreNames, containerType: string): Promise<Locator> {
  const tree = new ObjectTreePage(page);

  await tree.clearTreeFilter();
  await tree.expandPath([names.connectionName, names.databaseName]);

  const node = page.locator(`[data-node-id="${names.databaseName}.${containerType}"]`);
  await expect(node).toBeVisible({ timeout: 15000 });
  await node.click();

  if ((await node.getAttribute('aria-expanded')) === 'true') {
    await node.press('ArrowLeft');
    await expect(node).toHaveAttribute('aria-expanded', 'false', { timeout: 15000 });
    await tree.waitForTreeLoad();
  }

  await node.press('ArrowRight');
  await expect(node).toHaveAttribute('aria-expanded', 'true', { timeout: 15000 });
  await tree.waitForTreeLoad();

  return node;
}

// --------------------------------------------------------------- triggers

export async function addTrigger(page: Page, tableName: string, triggerName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  const row = await objectForm.addArrayRow(F.triggerName);
  await objectForm.fillArrayCell(row, F.triggerName, triggerName);
  await objectForm.selectArrayCellOption(row, F.triggerTiming, 'BEFORE');
  await objectForm.selectArrayCellOption(row, F.triggerEvent, 'INSERT');
  await objectForm.fillArrayQueryCell(row, F.triggerBody, 'SET NEW.email = LOWER(NEW.email)');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTrigger);
  await objectForm.assertPreviewContains(triggerName);
  await objectForm.confirmExecute();
}

export async function expectTriggerLoaded(page: Page, tableName: string, triggerName: string, body: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await expect(objectForm.getArrayCell(0, F.triggerName).locator('input')).toHaveValue(triggerName);
  await expect(objectForm.getArrayCell(0, F.triggerTiming)).toContainText('BEFORE');
  await expect(objectForm.getArrayCell(0, F.triggerEvent)).toContainText('INSERT');
  await expect(objectForm.getArrayCell(0, F.triggerBody)).toContainText(body);
}

export async function editTriggerBody(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await objectForm.fillArrayQueryCell(0, F.triggerBody, 'SET NEW.email = UPPER(NEW.email)');
  await objectForm.save();
  // MySQL has no ALTER TRIGGER: the edit drops and recreates.
  await objectForm.assertPreviewContains(P.dropTrigger);
  await objectForm.assertPreviewContains(/CREATE TRIGGER[\s\S]*UPPER\(NEW\.email\)/i);
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

// --------------------------------------------------------------- routines

async function openCreateRoutine(
  page: Page,
  names: MysqlCoreNames,
  container: 'functionContainer' | 'procedureContainer',
  action: string,
  tabId: string
): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  const node = await expandContainer(page, names, container);
  await node.click({ button: 'right' });
  await tree.clickContextMenuAction(action);
  await objectForm.ensureWorkspaceTab(action);
  await expect(objectForm.getTab(tabId)).toBeVisible({ timeout: 30000 });

  return objectForm;
}

async function openEditRoutine(page: Page, nodeName: string, action: string, tabId: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(nodeName, action);
  await objectForm.ensureWorkspaceTab(action);
  await expect(objectForm.getTab(tabId)).toBeVisible({ timeout: 30000 });
  await objectForm.waitForReady();

  return objectForm;
}

export async function createFunction(page: Page, names: MysqlCoreNames, functionName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateRoutine(page, names, 'functionContainer', 'Create function', T.function);

  await objectForm.fillGeneralField(F.routineName, functionName);
  await objectForm.fillGeneralField(F.routineParameters, 'a INT');
  await objectForm.fillGeneralField(F.routineReturns, 'INT');
  await objectForm.toggleGeneralCheckbox(F.routineDeterministic, true);
  await objectForm.fillGeneralQueryField(F.routineBody, 'RETURN a + 1');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createFunction);
  await objectForm.assertPreviewContains(functionName);
  await objectForm.confirmExecute();

  await expandContainer(page, names, 'functionContainer');
  await expect(tree.getTreeNode(functionName)).toBeVisible({ timeout: 15000 });
}

export async function expectFunctionLoaded(page: Page, functionName: string): Promise<ObjectFormPage> {
  const objectForm = await openEditRoutine(page, functionName, 'Edit function', T.function);

  await expect(objectForm.getGeneralField(F.routineName).locator('input')).toHaveValue(functionName);
  await expect(objectForm.getGeneralField(F.routineParameters).locator('input')).toHaveValue(/a\s+int/i);
  await expect(objectForm.getGeneralField(F.routineReturns).locator('input')).toHaveValue(/int/i);
  await expect(objectForm.getGeneralField(F.routineDeterministic).locator('input[type="checkbox"]')).toBeChecked();

  return objectForm;
}

export async function editFunctionBody(page: Page, functionName: string): Promise<void> {
  const objectForm = await expectFunctionLoaded(page, functionName);

  await objectForm.fillGeneralQueryField(F.routineBody, 'RETURN a + 2');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropFunction);
  await objectForm.assertPreviewContains(/CREATE FUNCTION[\s\S]*RETURN a \+ 2/i);
  await objectForm.confirmExecute();
}

export async function createProcedure(page: Page, names: MysqlCoreNames, procedureName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateRoutine(page, names, 'procedureContainer', 'Create procedure', T.procedure);

  await objectForm.fillGeneralField(F.routineName, procedureName);
  await objectForm.fillGeneralField(F.routineParameters, 'IN a INT');
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN SELECT a; END');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createProcedure);
  await objectForm.assertPreviewContains(procedureName);
  await objectForm.confirmExecute();

  await expandContainer(page, names, 'procedureContainer');
  await expect(tree.getTreeNode(procedureName)).toBeVisible({ timeout: 15000 });
}

export async function expectProcedureLoaded(page: Page, procedureName: string): Promise<void> {
  const objectForm = await openEditRoutine(page, procedureName, 'Edit procedure', T.procedure);

  await expect(objectForm.getGeneralField(F.routineName).locator('input')).toHaveValue(procedureName);
  await expect(objectForm.getGeneralField(F.routineParameters).locator('input')).toHaveValue(/IN\s+a\s+int/i);
}

export async function dropRoutine(page: Page, nodeName: string, action: 'Drop function' | 'Drop procedure'): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.dropObject(nodeName, action);
  await expect(tree.getTreeNode(nodeName)).toBeHidden({ timeout: 15000 });
}

// ---------------------------------------------------------------- cleanup

export async function cleanupMysqlCoreSchema(page: Page, names: MysqlCoreNames): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  // A leftover tree search would keep showing the dropped database.
  await tree.clearTreeFilter();
  await tree.expandPath([names.connectionName]);
  const databaseNode = tree.getTreeNode(names.databaseName);
  await expect(databaseNode).toBeVisible({ timeout: 15000 });
  await databaseNode.click();
  if ((await databaseNode.getAttribute('aria-expanded')) === 'true') {
    await databaseNode.press('ArrowLeft');
    await expect(databaseNode).toHaveAttribute('aria-expanded', 'false', { timeout: 15000 });
  }
  await tree.dropObject(names.databaseName, 'Drop database');
  await tree.clearTreeFilter();
  await expect(tree.getTreeNode(names.databaseName)).toBeHidden({ timeout: 15000 });

  await connectionPage.deleteConnection(names.connectionName);

  return connectionPage;
}
