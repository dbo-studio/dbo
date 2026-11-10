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

/**
 * MySQL cannot roll DDL back, so the planner creates the new trigger under a temporary name
 * first. A body MySQL rejects must fail there, with the original trigger still in place.
 */
export async function editTriggerBodyRejectedByDb(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await objectForm.fillArrayQueryCell(0, F.triggerBody, 'SET NEW.nosuchcolumn = 1');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropTrigger);
  await objectForm.confirmExecuteExpectingError(/nosuchcolumn|Unknown column/i);
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

export interface MysqlTriggerSpec {
  name: string;
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  body: string;
}

/** Add several triggers in one save; rows are appended after the existing ones. */
export async function addTriggers(page: Page, tableName: string, specs: MysqlTriggerSpec[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  for (const spec of specs) {
    const row = await objectForm.addArrayRow(F.triggerName);
    await objectForm.fillArrayCell(row, F.triggerName, spec.name);
    await objectForm.selectArrayCellOption(row, F.triggerTiming, spec.timing);
    await objectForm.selectArrayCellOption(row, F.triggerEvent, spec.event);
    await objectForm.fillArrayQueryCell(row, F.triggerBody, spec.body);
  }

  await objectForm.save();
  for (const spec of specs) {
    await objectForm.assertPreviewContains(
      new RegExp(`CREATE TRIGGER [\\s\\S]*\`${spec.name}\` ${spec.timing} ${spec.event} ON [\\s\\S]*FOR EACH ROW ${spec.body}`)
    );
  }
  await objectForm.confirmExecute();
}

/** Rows come back ordered by trigger name, so `specs` must be sorted by name. */
export async function expectTriggerRows(page: Page, tableName: string, specs: MysqlTriggerSpec[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  for (const [row, spec] of specs.entries()) {
    await expect(objectForm.getArrayCell(row, F.triggerName).locator('input')).toHaveValue(spec.name);
    await expect(objectForm.getArrayCell(row, F.triggerTiming)).toContainText(spec.timing);
    await expect(objectForm.getArrayCell(row, F.triggerEvent)).toContainText(spec.event);
    await expect(objectForm.getArrayCell(row, F.triggerBody)).toContainText(spec.body);
  }
}

/** Change timing and event of one row. MySQL has no ALTER TRIGGER: the plan is DROP + CREATE. */
export async function retargetTrigger(
  page: Page,
  tableName: string,
  row: number,
  name: string,
  next: { timing: 'BEFORE' | 'AFTER'; event: 'INSERT' | 'UPDATE' | 'DELETE' }
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await objectForm.selectArrayCellOption(row, F.triggerTiming, next.timing);
  await objectForm.selectArrayCellOption(row, F.triggerEvent, next.event);

  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`DROP TRIGGER [\\s\\S]*\`${name}\``));
  await objectForm.assertPreviewContains(new RegExp(`CREATE TRIGGER [\\s\\S]*\`${name}\` ${next.timing} ${next.event} ON`));
  await objectForm.confirmExecute();
}

/** Delete several trigger rows in one save. */
export async function dropTriggerRows(page: Page, tableName: string, rows: number[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  for (const row of rows) {
    await objectForm.deleteArrayRow(row);
  }

  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropTrigger);
  await objectForm.confirmExecute();
}

// --------------------------------------------------------------- routines

async function openCreateRoutine(
  page: Page,
  names: MysqlCoreNames,
  container: 'functionContainer' | 'procedureContainer' | 'eventContainer',
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

/** Same safety net for routines: a body MySQL rejects must leave the original function intact. */
export async function editFunctionBodyRejectedByDb(page: Page, functionName: string): Promise<void> {
  const objectForm = await openEditRoutine(page, functionName, 'Edit function', T.function);

  await objectForm.fillGeneralQueryField(F.routineBody, 'RETURN a +');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropFunction);
  await objectForm.confirmExecuteExpectingError(/syntax/i);
}

export async function expectFunctionBody(page: Page, functionName: string, body: RegExp): Promise<void> {
  const objectForm = await expectFunctionLoaded(page, functionName);

  await expect(objectForm.getGeneralField(F.routineBody)).toContainText(body);
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

/** IN / OUT parameters of a procedure round-trip through information_schema. */
export async function createProcedureWithOutParameter(page: Page, names: MysqlCoreNames, procedureName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateRoutine(page, names, 'procedureContainer', 'Create procedure', T.procedure);

  await objectForm.fillGeneralField(F.routineName, procedureName);
  await objectForm.fillGeneralField(F.routineParameters, 'IN a INT, OUT b INT');
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN SET b = a + 1; END');

  await objectForm.save();
  await objectForm.assertPreviewContains(/CREATE PROCEDURE[\s\S]*\(IN a INT, OUT b INT\) BEGIN SET b = a \+ 1; END/i);
  await objectForm.confirmExecute();

  await expandContainer(page, names, 'procedureContainer');
  await expect(tree.getTreeNode(procedureName)).toBeVisible({ timeout: 15000 });
}

export async function expectOutParameterLoaded(page: Page, procedureName: string): Promise<void> {
  const objectForm = await openEditRoutine(page, procedureName, 'Edit procedure', T.procedure);

  await expect(objectForm.getGeneralField(F.routineParameters).locator('input')).toHaveValue(/IN\s+a\s+int,\s*OUT\s+b\s+int/i);
}

/** A parameter list carrying a statement separator must be refused, not silently dropped. */
export async function createFunctionRejected(page: Page, names: MysqlCoreNames, functionName: string, message: RegExp): Promise<void> {
  const objectForm = await openCreateRoutine(page, names, 'functionContainer', 'Create function', T.function);

  await objectForm.fillGeneralField(F.routineName, functionName);
  await objectForm.fillGeneralField(F.routineParameters, 'a INT; DROP TABLE x');
  await objectForm.fillGeneralField(F.routineReturns, 'INT');
  await objectForm.fillGeneralQueryField(F.routineBody, 'RETURN a');

  await objectForm.saveExpectingError(message);
}

/** A trigger with no body must be refused, not silently dropped. */
export async function addTriggerWithoutBodyRejected(page: Page, tableName: string, triggerName: string, message: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  const row = await objectForm.addArrayRow(F.triggerName);
  await objectForm.fillArrayCell(row, F.triggerName, triggerName);
  await objectForm.selectArrayCellOption(row, F.triggerTiming, 'BEFORE');
  await objectForm.selectArrayCellOption(row, F.triggerEvent, 'INSERT');

  await objectForm.saveExpectingError(message);
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

// ----------------------------------------------------------------- events

const EVENT_BODY = 'UPDATE users SET email = LOWER(email)';

export async function createEvent(page: Page, names: MysqlCoreNames, eventName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateRoutine(page, names, 'eventContainer', 'Create event', T.event);

  await objectForm.fillGeneralField(F.eventName, eventName);
  await objectForm.fillGeneralField(F.eventSchedule, 'EVERY 1 DAY');
  await objectForm.selectGeneralOption(F.eventStatus, 'DISABLE');
  await objectForm.toggleGeneralCheckbox(F.eventPreserve, true);
  await objectForm.fillGeneralQueryField(F.eventBody, EVENT_BODY);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createEvent);
  await objectForm.assertPreviewContains(eventName);
  await objectForm.confirmExecute();

  await expandContainer(page, names, 'eventContainer');
  await expect(tree.getTreeNode(eventName)).toBeVisible({ timeout: 15000 });
}

export async function expectEventLoaded(page: Page, eventName: string, schedule: RegExp, body: RegExp): Promise<ObjectFormPage> {
  const objectForm = await openEditRoutine(page, eventName, 'Edit event', T.event);

  await expect(objectForm.getGeneralField(F.eventName).locator('input')).toHaveValue(eventName);
  await expect(objectForm.getGeneralField(F.eventSchedule).locator('input')).toHaveValue(schedule);
  await expect(objectForm.getGeneralField(F.eventStatus)).toContainText('DISABLE');
  await expect(objectForm.getGeneralField(F.eventPreserve).locator('input[type="checkbox"]')).toBeChecked();
  await expect(objectForm.getGeneralField(F.eventBody)).toContainText(body);

  return objectForm;
}

/** An edit emits one ALTER EVENT with only the clauses that changed. */
export async function editEventBody(page: Page, eventName: string): Promise<void> {
  const objectForm = await expectEventLoaded(page, eventName, /EVERY 1 DAY/i, /LOWER\(email\)/i);

  await objectForm.fillGeneralQueryField(F.eventBody, 'UPDATE users SET email = UPPER(email)');
  await objectForm.save();
  await objectForm.assertPreviewContains(/ALTER EVENT[\s\S]*DO UPDATE users SET email = UPPER\(email\)/i);
  await expect(page.getByText(/ON SCHEDULE/i)).toBeHidden();
  await objectForm.confirmExecute();
}

export async function rescheduleAndRenameEvent(page: Page, eventName: string, newName: string): Promise<void> {
  const objectForm = await expectEventLoaded(page, eventName, /EVERY 1 DAY/i, /UPPER\(email\)/i);

  await objectForm.fillGeneralField(F.eventName, newName);
  await objectForm.fillGeneralField(F.eventSchedule, 'EVERY 2 DAY');
  await objectForm.save();
  await objectForm.assertPreviewContains(/ALTER EVENT[\s\S]*ON SCHEDULE EVERY 2 DAY RENAME TO/i);
  await objectForm.assertPreviewContains(newName);
  await objectForm.confirmExecute();
}

export async function createEventRejected(page: Page, names: MysqlCoreNames, schedule: string, body: string, message: RegExp): Promise<void> {
  const objectForm = await openCreateRoutine(page, names, 'eventContainer', 'Create event', T.event);

  await objectForm.fillGeneralField(F.eventName, 'ev_rejected');
  await objectForm.fillGeneralField(F.eventSchedule, schedule);
  await objectForm.fillGeneralQueryField(F.eventBody, body);

  await objectForm.saveExpectingError(message);
}

export async function dropEvent(page: Page, eventName: string): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.dropObject(eventName, 'Drop event');
  await expect(tree.getTreeNode(eventName)).toBeHidden({ timeout: 15000 });
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

// ------------------------------------------------------------ unique keys

/** Add a UNIQUE key on `email`. It must come back in the Keys tab and stay out of Indexes. */
export async function addUniqueKey(page: Page, tableName: string, keyName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(LT.keys);

  const row = await objectForm.addArrayRow(LF.keyName);
  await objectForm.fillArrayCell(row, LF.keyName, keyName);
  await objectForm.selectMultiSelectOptions(row, LF.keyColumns, ['email']);
  await objectForm.selectArrayCellOption(row, LF.keyType, 'UNIQUE');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addUnique);
  await objectForm.assertPreviewContains(keyName);
  await objectForm.confirmExecute();
}

/** Keys rows are the PRIMARY KEY first, then UNIQUE keys by name. */
export async function expectUniqueKeyLoaded(page: Page, tableName: string, keyName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(LT.keys);

  await expect(objectForm.getArrayCell(1, LF.keyName).locator('input')).toHaveValue(keyName);
  await expect(objectForm.getArrayCell(1, LF.keyColumns)).toContainText('email');
  await expect(objectForm.getArrayCell(1, LF.keyType)).toContainText('UNIQUE');

  await objectForm.selectTab(T.indexes);
  await expect(objectForm.getArrayCell(0, F.indexName)).toBeHidden();
}

export async function renameUniqueKey(page: Page, tableName: string, from: string, to: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(LT.keys);

  await objectForm.fillArrayCell(1, LF.keyName, to);
  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`DROP INDEX \`${from}\``));
  await objectForm.assertPreviewContains(new RegExp(`ADD CONSTRAINT \`${to}\` UNIQUE`));
  await objectForm.confirmExecute();
}

export async function dropUniqueKey(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(LT.keys);

  await objectForm.deleteArrayRow(1);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropUnique);
  await objectForm.confirmExecute();
}

export async function expectOnlyPrimaryKey(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(LT.keys);

  await expect(objectForm.getArrayCell(0, LF.keyType)).toContainText('PRIMARY KEY');
  await expect(objectForm.getArrayCell(1, LF.keyName)).toBeHidden();
}

// ----------------------------------------------------------------- checks

export async function addCheck(page: Page, tableName: string, checkName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  const row = await objectForm.addArrayRow(F.checkName);
  await objectForm.fillArrayCell(row, F.checkName, checkName);
  await objectForm.fillArrayCell(row, F.checkExpression, 'CHAR_LENGTH(email) > 3');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addCheck);
  await objectForm.assertPreviewContains(checkName);
  await objectForm.confirmExecute();
}

/** MySQL stores a normalised clause, so match on its parts. */
export async function expectCheckLoaded(page: Page, tableName: string, checkName: string, expression: RegExp): Promise<void> {
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
  // The new definition is validated under a temporary name before the original is dropped.
  await objectForm.assertPreviewContains(P.dropCheck);
  await objectForm.assertPreviewContains(/__dbo_check_/);
  await objectForm.confirmExecute();
}

export async function editCheckRejectedByDb(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await objectForm.fillArrayCell(0, F.checkExpression, 'nosuchcolumn > 1');
  await objectForm.save();
  await objectForm.confirmExecuteExpectingError(/nosuchcolumn|Unknown column/i);
}

export async function addCheckWithBadExpressionRejected(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  const row = await objectForm.addArrayRow(F.checkName);
  await objectForm.fillArrayCell(row, F.checkName, 'chk_bad');
  await objectForm.fillArrayCell(row, F.checkExpression, '1 = 1; DROP TABLE x');

  await objectForm.saveExpectingError(/single SQL expression/i);
}

export async function dropCheck(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await objectForm.deleteArrayRow(0);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropCheck);
  await objectForm.confirmExecute();
}

export async function expectNoChecks(page: Page, tableName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await expect(objectForm.getArrayCell(0, F.checkName)).toBeHidden();
}
