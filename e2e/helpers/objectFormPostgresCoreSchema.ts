import { expect, type Locator, type Page } from '@playwright/test';
import { PG_CORE_FIELDS as F, PG_CORE_PREVIEW as P, PG_CORE_TABS as T } from '../fixtures/postgresCoreSchema';
import { ConnectionPage, ObjectFormPage, ObjectTreePage, SqlEditorPage } from '../pages';
import { API_DDL_TIMEOUT, apiRoute, waitForResponseDuring } from './network';
import { POSTGRES_LIFECYCLE_FIELDS as LF, POSTGRES_LIFECYCLE_TABS as LT } from '../fixtures/postgresObjectFormLifecycle';
import { createDatabase, setupPostgresConnection } from './objectFormPostgresLifecycle';

export { createDatabase, setupPostgresConnection };

export interface PgCoreNames {
  connectionName: string;
  databaseName: string;
  usersTable: string;
}

/** Connect, create a database and a `users` table (id pk, email text) in `public`. */
export async function setupPgCoreSchema(page: Page, names: PgCoreNames): Promise<void> {
  await setupPostgresConnection(page, names.connectionName);
  await createDatabase(page, names.connectionName, names.databaseName);
  await createUsersTable(page, names);
}

/** The shared createUsersTable finds "Tables" by name, which is ambiguous on a server with other databases. */
async function createUsersTable(page: Page, names: PgCoreNames): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  const container = await expandPublicContainer(page, names, 'Tables');
  await container.click({ button: 'right' });
  await tree.clickContextMenuAction('Create table');
  await objectForm.ensureWorkspaceTab('Create table');
  await objectForm.waitForReady();

  await objectForm.fillGeneralField(LF.tableName, names.usersTable);

  await objectForm.selectTab(LT.columns);
  await objectForm.addRow();
  await objectForm.fillArrayCell(0, LF.columnName, 'id');
  await objectForm.selectArrayCellOption(0, LF.columnType, 'integer');
  await objectForm.toggleArrayCheckbox(0, LF.columnPrimary, true);
  await objectForm.addRow();
  await objectForm.fillArrayCell(1, LF.columnName, 'email');
  await objectForm.selectArrayCellOption(1, LF.columnType, 'text');

  await objectForm.save();
  await objectForm.assertPreviewContains(/CREATE TABLE/i);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Tables');
  await expect(tree.getTreeNode(names.usersTable)).toBeVisible({ timeout: 30000 });
}

/** Open Edit table on a fresh form tab so the form always reloads from the database. */
export async function openEditTable(page: Page, tableName: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(tableName, 'Edit table');
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, 'Edit table');
  await objectForm.waitForReady();

  return objectForm;
}

/**
 * Container nodes ("Functions", "Types", ...) exist once per schema, so a name
 * search matches every database on a shared server. Address them by node id.
 */
function containerNode(page: Page, databaseName: string, containerType: string): Locator {
  return page.locator(`[data-node-id="${databaseName}.public.${containerType}"]`);
}

const CONTAINER_TYPES: Record<string, string> = {
  Functions: 'functionContainer',
  Procedures: 'procedureContainer',
  Sequences: 'sequenceContainer',
  Types: 'typeContainer',
  'Materialized Views': 'materializedViewContainer',
  Tables: 'tableContainer'
};

/** Expand `public` of the database and (re)load one of its containers. */
export async function expandPublicContainer(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  container: string
): Promise<Locator> {
  const tree = new ObjectTreePage(page);

  await tree.clearTreeFilter();
  await tree.expandPath([names.connectionName, names.databaseName, 'public']);

  const node = containerNode(page, names.databaseName, CONTAINER_TYPES[container]);
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

/** Open a standalone-object create form from a container context menu. */
async function openCreateForm(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  container: string,
  action: string,
  tabId: string
): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  const node = await expandPublicContainer(page, names, container);
  await node.click({ button: 'right' });
  await tree.clickContextMenuAction(action);
  await objectForm.ensureWorkspaceTab(action);
  await expect(objectForm.getTab(tabId)).toBeVisible({ timeout: 30000 });

  return objectForm;
}

/** Open the Edit form of a standalone node (via context menu). */
async function openEditForm(page: Page, nodeName: string, action: string, tabId: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(nodeName, action);
  await objectForm.ensureWorkspaceTab(action);
  await expect(objectForm.getTab(tabId)).toBeVisible({ timeout: 30000 });
  await objectForm.waitForReady();

  return objectForm;
}

/** Add one row to an array tab and return its index. */
async function addRow(objectForm: ObjectFormPage, firstFieldId: string): Promise<number> {
  return objectForm.addArrayRow(firstFieldId);
}

// ---------------------------------------------------------------- indexes

export async function addIndex(
  page: Page,
  tableName: string,
  indexName: string,
  opts: { unique: boolean; column: string; where?: string }
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  const row = await addRow(objectForm, F.indexName);
  await objectForm.fillArrayCell(row, F.indexName, indexName);
  await objectForm.selectMultiSelectOptions(row, F.indexColumns, [opts.column]);
  await objectForm.toggleArrayCheckbox(row, F.indexUnique, opts.unique);
  if (opts.where) {
    await objectForm.fillArrayCell(row, F.indexWhere, opts.where);
  }

  await objectForm.save();
  await objectForm.assertPreviewContains(opts.unique ? P.createUniqueIndex : /CREATE INDEX/i);
  await objectForm.assertPreviewContains(indexName);
  if (opts.where) {
    await objectForm.assertPreviewContains(new RegExp(`WHERE ${opts.where}`, 'i'));
  }
  await objectForm.confirmExecute();
}

/** An index whose WHERE carries a statement separator must be refused, not silently dropped. */
export async function addIndexRejected(page: Page, tableName: string, indexName: string, where: string, message: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  const row = await addRow(objectForm, F.indexName);
  await objectForm.fillArrayCell(row, F.indexName, indexName);
  await objectForm.selectMultiSelectOptions(row, F.indexColumns, ['email']);
  await objectForm.fillArrayCell(row, F.indexWhere, where);

  await objectForm.saveExpectingError(message);
}

export async function expectIndexWhereLoaded(page: Page, tableName: string, where: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await expect(objectForm.getArrayCell(0, F.indexWhere).locator('input')).toHaveValue(where);
}

export async function expectIndexLoaded(
  page: Page,
  tableName: string,
  indexName: string,
  opts: { unique: boolean; method: string }
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await expect(objectForm.getArrayCell(0, F.indexName).locator('input')).toHaveValue(indexName);
  await expect(objectForm.getArrayCell(0, F.indexUnique).locator('input[type="checkbox"]')).toBeChecked({
    checked: opts.unique
  });
  await expect(objectForm.getArrayCell(0, F.indexMethod)).toContainText(opts.method);
  await expect(objectForm.getArrayCell(0, F.indexColumns)).toContainText('email');
}

export async function changeIndexMethod(page: Page, tableName: string, method: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  // hash indexes cannot be unique in PostgreSQL, so clear Unique together with the method.
  await objectForm.selectArrayCellOption(0, F.indexMethod, method);
  await objectForm.toggleArrayCheckbox(0, F.indexUnique, false);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropIndex);
  await objectForm.assertPreviewContains(P.createHashIndex);
  await objectForm.confirmExecute();
}

export async function dropFirstRowOfTab(
  page: Page,
  tableName: string,
  tabId: string,
  expectedPreview: RegExp
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(tabId);

  await objectForm.deleteArrayRow(0);
  await objectForm.save();
  await objectForm.assertPreviewContains(expectedPreview);
  await objectForm.confirmExecute();
}

export async function expectTabEmpty(page: Page, tableName: string, tabId: string, firstFieldId: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(tabId);

  await expect(objectForm.getArrayCell(0, firstFieldId)).toBeHidden();
}

// ----------------------------------------------------------------- checks

export async function addCheck(page: Page, tableName: string, checkName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  const row = await addRow(objectForm, F.checkName);
  await objectForm.fillArrayCell(row, F.checkName, checkName);
  await objectForm.fillArrayCell(row, F.checkExpression, 'length(email) > 3');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addCheck);
  await objectForm.assertPreviewContains(checkName);
  await objectForm.confirmExecute();
}

export async function addCheckRejected(page: Page, tableName: string, checkName: string, expression: string, message: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  const row = await addRow(objectForm, F.checkName);
  await objectForm.fillArrayCell(row, F.checkName, checkName);
  await objectForm.fillArrayCell(row, F.checkExpression, expression);

  await objectForm.saveExpectingError(message);
}

export async function expectCheckLoaded(page: Page, tableName: string, checkName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await expect(objectForm.getArrayCell(0, F.checkName).locator('input')).toHaveValue(checkName);
  // Postgres normalises the stored expression; it still names the column.
  await expect(objectForm.getArrayCell(0, F.checkExpression).locator('input')).toHaveValue(/length\(.*email.*\) > 3/);
}

export async function editCheckExpression(page: Page, tableName: string, checkName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.checks);

  await objectForm.fillArrayCell(0, F.checkExpression, 'length(email) > 5');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropConstraint);
  await objectForm.assertPreviewContains(/ADD CONSTRAINT[\s\S]*CHECK \(length\(email\) > 5\)/i);
  await objectForm.assertPreviewContains(checkName);
  await objectForm.confirmExecute();
}

// --------------------------------------------------------------- routines

export async function createTriggerFunction(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  functionName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(page, names, 'Functions', 'Create function', T.function);

  await objectForm.fillGeneralField(F.routineName, functionName);
  await objectForm.fillGeneralField(F.routineReturns, 'trigger');
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN RETURN NEW; END;');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createFunction);
  await objectForm.assertPreviewContains(functionName);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Functions');
  await expect(tree.getTreeNode(`${functionName}()`)).toBeVisible({ timeout: 15000 });
}

/** A parameter list carrying a statement separator must be refused, not silently dropped. */
export async function createFunctionRejected(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  functionName: string,
  parameters: string,
  message: RegExp
): Promise<void> {
  const objectForm = await openCreateForm(page, names, 'Functions', 'Create function', T.function);

  await objectForm.fillGeneralField(F.routineName, functionName);
  await objectForm.fillGeneralField(F.routineParameters, parameters);
  await objectForm.fillGeneralField(F.routineReturns, 'integer');
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN RETURN 1; END;');

  await objectForm.saveExpectingError(message);
}

export async function editFunctionBody(page: Page, functionName: string): Promise<void> {
  const objectForm = await openEditForm(page, `${functionName}()`, 'Edit function', T.function);

  await expect(objectForm.getGeneralField(F.routineName).locator('input')).toHaveValue(functionName);
  await expect(objectForm.getGeneralField(F.routineReturns).locator('input')).toHaveValue('trigger');

  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN NEW.email := lower(NEW.email); RETURN NEW; END;');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.replaceFunction);
  await objectForm.assertPreviewContains(/lower\(NEW\.email\)/);
  await objectForm.confirmExecute();
}

/** A function that takes one integer and returns it; used to exercise signature changes. */
export async function createIntegerFunction(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  functionName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(page, names, 'Functions', 'Create function', T.function);

  await objectForm.fillGeneralField(F.routineName, functionName);
  await objectForm.fillGeneralField(F.routineParameters, 'a integer');
  await objectForm.fillGeneralField(F.routineReturns, 'integer');
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN RETURN a; END;');

  await objectForm.save();
  await objectForm.assertPreviewContains(/CREATE FUNCTION[\s\S]*\(a integer\) RETURNS integer/i);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Functions');
  await expect(tree.getTreeNode(`${functionName}(a integer)`)).toBeVisible({ timeout: 15000 });
}

/** Changing parameters changes the signature: PostgreSQL needs DROP + CREATE, not CREATE OR REPLACE. */
export async function changeFunctionSignature(page: Page, functionName: string): Promise<void> {
  const objectForm = await openEditForm(page, `${functionName}(a integer)`, 'Edit function', T.function);

  await expect(objectForm.getGeneralField(F.routineParameters).locator('input')).toHaveValue('a integer');
  await objectForm.fillGeneralField(F.routineParameters, 'a integer, b integer');
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN RETURN a + b; END;');

  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`DROP FUNCTION "public"\\."${functionName}"\\(a integer\\)`));
  await objectForm.assertPreviewContains(/CREATE FUNCTION[\s\S]*\(a integer, b integer\) RETURNS integer/i);
  await objectForm.confirmExecute();
}

export async function expectFunctionSignature(page: Page, nodeName: string, parameters: string): Promise<void> {
  const objectForm = await openEditForm(page, nodeName, 'Edit function', T.function);

  await expect(objectForm.getGeneralField(F.routineParameters).locator('input')).toHaveValue(parameters);
  await expect(objectForm.getGeneralField(F.routineBody)).toContainText(/a\s+\+\s+b/);
}

export async function editProcedureBody(page: Page, nodeName: string): Promise<void> {
  const objectForm = await openEditForm(page, nodeName, 'Edit procedure', T.procedure);

  await expect(objectForm.getGeneralField(F.routineName).locator('input')).toHaveValue(nodeName.replace(/\(.*\)$/, ''));
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN PERFORM 1; END;');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.replaceProcedure);
  await objectForm.assertPreviewContains(/PERFORM 1/);
  await objectForm.confirmExecute();
}

export async function createProcedure(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  procedureName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(page, names, 'Procedures', 'Create procedure', T.procedure);

  await objectForm.fillGeneralField(F.routineName, procedureName);
  await objectForm.fillGeneralQueryField(F.routineBody, 'BEGIN NULL; END;');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createProcedure);
  await objectForm.assertPreviewContains(procedureName);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Procedures');
  await expect(tree.getTreeNode(`${procedureName}()`)).toBeVisible({ timeout: 15000 });
}

export async function dropRoutine(page: Page, nodeName: string, action: 'Drop function' | 'Drop procedure'): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.dropObject(nodeName, action);
  await expect(tree.getTreeNode(nodeName)).toBeHidden({ timeout: 15000 });
}

// --------------------------------------------------------------- triggers

export async function addTrigger(
  page: Page,
  tableName: string,
  triggerName: string,
  functionName: string
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  const row = await addRow(objectForm, F.triggerName);
  await objectForm.fillArrayCell(row, F.triggerName, triggerName);
  await objectForm.selectArrayCellOption(row, F.triggerTiming, 'BEFORE');
  await objectForm.selectMultiSelectOptions(row, F.triggerEvents, ['INSERT']);
  await objectForm.selectArrayCellOption(row, F.triggerOrientation, 'ROW');
  await objectForm.selectArrayCellOption(row, F.triggerFunction, `public.${functionName}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createTrigger);
  await objectForm.assertPreviewContains(triggerName);
  await objectForm.confirmExecute();
}

export async function addTriggerRejected(
  page: Page,
  tableName: string,
  triggerName: string,
  functionName: string,
  when: string,
  message: RegExp
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  const row = await addRow(objectForm, F.triggerName);
  await objectForm.fillArrayCell(row, F.triggerName, triggerName);
  await objectForm.selectArrayCellOption(row, F.triggerTiming, 'BEFORE');
  await objectForm.selectMultiSelectOptions(row, F.triggerEvents, ['INSERT']);
  await objectForm.selectArrayCellOption(row, F.triggerFunction, `public.${functionName}`);
  await objectForm.fillArrayCell(row, F.triggerWhen, when);

  await objectForm.saveExpectingError(message);
}

export async function expectTriggerLoaded(page: Page, tableName: string, triggerName: string, functionName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await expect(objectForm.getArrayCell(0, F.triggerName).locator('input')).toHaveValue(triggerName);
  await expect(objectForm.getArrayCell(0, F.triggerTiming)).toContainText('BEFORE');
  await expect(objectForm.getArrayCell(0, F.triggerEvents)).toContainText('INSERT');
  await expect(objectForm.getArrayCell(0, F.triggerOrientation)).toContainText('ROW');
  await expect(objectForm.getArrayCell(0, F.triggerFunction)).toContainText(functionName);
}

// -------------------------------------------------------------- sequences

export async function createSequence(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  sequenceName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(page, names, 'Sequences', 'Create sequence', T.sequence);

  await objectForm.fillGeneralField(F.sequenceName, sequenceName);
  await objectForm.fillGeneralField(F.sequenceStart, '10');
  await objectForm.fillGeneralField(F.sequenceIncrement, '5');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createSequence);
  await objectForm.assertPreviewContains(sequenceName);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Sequences');
  await expect(tree.getTreeNode(sequenceName)).toBeVisible({ timeout: 15000 });
}

export async function createSequenceRejected(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  sequenceName: string,
  message: RegExp
): Promise<void> {
  const objectForm = await openCreateForm(page, names, 'Sequences', 'Create sequence', T.sequence);

  await objectForm.fillGeneralField(F.sequenceName, sequenceName);
  await objectForm.fillGeneralField(F.sequenceIncrement, 'abc');

  await objectForm.saveExpectingError(message);
}

export async function editSequenceIncrement(page: Page, sequenceName: string): Promise<void> {
  const objectForm = await openEditForm(page, sequenceName, 'Edit sequence', T.sequence);

  await expect(objectForm.getGeneralField(F.sequenceName).locator('input')).toHaveValue(sequenceName);
  await expect(objectForm.getGeneralField(F.sequenceIncrement).locator('input')).toHaveValue('5');

  await objectForm.fillGeneralField(F.sequenceIncrement, '7');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.alterSequence);
  await objectForm.confirmExecute();
}

export async function expectSequenceIncrement(page: Page, sequenceName: string, increment: string): Promise<void> {
  const objectForm = await openEditForm(page, sequenceName, 'Edit sequence', T.sequence);

  await expect(objectForm.getGeneralField(F.sequenceIncrement).locator('input')).toHaveValue(increment);
}

export async function dropSequence(page: Page, sequenceName: string): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.dropObject(sequenceName, 'Drop sequence');
  await expect(tree.getTreeNode(sequenceName)).toBeHidden({ timeout: 15000 });
}

export async function addTableSequence(page: Page, tableName: string, sequenceName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.tableSequences);

  const row = await addRow(objectForm, F.sequenceName);
  await objectForm.fillArrayCell(row, F.sequenceName, sequenceName);
  await objectForm.selectArrayCellOption(row, F.sequenceOwnedBy, 'id');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createOwnedSequence);
  await objectForm.assertPreviewContains(sequenceName);
  await objectForm.confirmExecute();
}

export async function expectTableSequenceLoaded(page: Page, tableName: string, sequenceName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.tableSequences);

  await expect(objectForm.getArrayCell(0, F.sequenceName).locator('input')).toHaveValue(sequenceName);
  await expect(objectForm.getArrayCell(0, F.sequenceOwnedBy)).toContainText('id');
}

// ------------------------------------------------------------- enum types

export async function createEnumType(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  enumName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(page, names, 'Types', 'Create enum type', T.type);

  await objectForm.fillGeneralField(F.typeName, enumName);
  await objectForm.fillGeneralField(F.typeValues, 'sad, ok');

  await objectForm.save();
  await objectForm.assertPreviewContains(P.createEnum);
  await objectForm.assertPreviewContains(enumName);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Types');
  await expect(tree.getTreeNode(enumName)).toBeVisible({ timeout: 15000 });
}

export async function addEnumValue(page: Page, enumName: string): Promise<void> {
  const objectForm = await openEditForm(page, enumName, 'Edit enum type', T.type);

  await expect(objectForm.getGeneralField(F.typeName).locator('input')).toHaveValue(enumName);
  await expect(objectForm.getGeneralField(F.typeValues).locator('input')).toHaveValue('sad, ok');

  await objectForm.fillGeneralField(F.typeValues, 'sad, ok, happy');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.addEnumValue);
  await objectForm.confirmExecute();
}

/** PostgreSQL can only append enum labels: removing or reordering must be refused. */
export async function editEnumValuesRejected(page: Page, enumName: string, values: string, message: RegExp): Promise<void> {
  const objectForm = await openEditForm(page, enumName, 'Edit enum type', T.type);

  await objectForm.fillGeneralField(F.typeValues, values);
  await objectForm.saveExpectingError(message);
}

export async function expectEnumValues(page: Page, enumName: string, values: string): Promise<void> {
  const objectForm = await openEditForm(page, enumName, 'Edit enum type', T.type);

  await expect(objectForm.getGeneralField(F.typeValues).locator('input')).toHaveValue(values);
}

export async function addEnumColumn(page: Page, tableName: string, enumName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.columns);

  const row = await addRow(objectForm, F.columnName);
  await objectForm.fillArrayCell(row, F.columnName, 'mood');
  await objectForm.selectArrayCellOption(row, F.columnType, enumName);

  await objectForm.save();
  await objectForm.assertPreviewContains(P.addEnumColumn);
  await objectForm.confirmExecute();

  // Reload: the column exists with the enum as its type.
  const reloaded = await openEditTable(page, tableName);
  await reloaded.selectTab(T.columns);
  await expect(reloaded.getArrayCell(row, F.columnName).locator('input')).toHaveValue('mood');
  await expect(reloaded.getArrayCell(row, F.columnType)).toContainText(enumName);
}

/** DROP TYPE is RESTRICT: a type a column still uses must fail with the server's message, and stay. */
export async function dropEnumTypeInUse(page: Page, enumName: string): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.runTreeAction(enumName, 'Drop enum type');
  const response = await waitForResponseDuring(
    page,
    apiRoute.objectExecute,
    () => tree.confirmDangerAction(),
    API_DDL_TIMEOUT
  );
  expect(response.status(), 'drop of a type in use is refused').toBeGreaterThanOrEqual(400);
  expect(await response.text()).toMatch(/depend on it|cannot drop type/i);

  await tree.waitForTreeLoad();
  await expect(tree.getTreeNode(enumName)).toBeVisible({ timeout: 15000 });
}

export async function dropColumnByName(page: Page, tableName: string, columnName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.columns);

  const count = await objectForm.arrayRowCount(F.columnName);
  let row = -1;
  for (let i = 0; i < count; i++) {
    if ((await objectForm.getArrayCell(i, F.columnName).locator('input').inputValue()) === columnName) {
      row = i;
    }
  }
  expect(row, `column ${columnName} found`).toBeGreaterThanOrEqual(0);

  await objectForm.deleteArrayRow(row);
  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`DROP COLUMN "${columnName}"`, 'i'));
  await objectForm.confirmExecute();
}

export async function dropEnumType(page: Page, enumName: string): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.dropObject(enumName, 'Drop enum type');
  await expect(tree.getTreeNode(enumName)).toBeHidden({ timeout: 15000 });
}

// ------------------------------------------------------------ matview edit

export async function createMatView(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName' | 'usersTable'>,
  matViewName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(
    page,
    names,
    'Materialized Views',
    'Create materialized view',
    T.materializedView
  );

  await objectForm.fillGeneralField(F.matViewName, matViewName);
  await objectForm.fillGeneralQueryField(F.matViewQuery, `SELECT id FROM public.${names.usersTable}`);

  await objectForm.save();
  await objectForm.assertPreviewContains(/CREATE MATERIALIZED VIEW/i);
  await objectForm.assertPreviewContains(matViewName);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Materialized Views');
  await expect(tree.getTreeNode(matViewName)).toBeVisible({ timeout: 15000 });
}

export async function expectMatViewComment(page: Page, matViewName: string, comment: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(matViewName, 'Edit materialized view');
  await objectForm.ensureWorkspaceTab('Edit materialized view');
  await expect(objectForm.getTab(T.materializedView)).toBeVisible({ timeout: 30000 });
  await objectForm.waitForReady();

  await expect(objectForm.getGeneralField(F.matViewComment).locator('input')).toHaveValue(comment);
}

export async function dropMatView(page: Page, matViewName: string): Promise<void> {
  const tree = new ObjectTreePage(page);

  await tree.dropObject(matViewName, 'Drop materialized view');
  await expect(tree.getTreeNode(matViewName)).toBeHidden({ timeout: 15000 });
}

export async function editMatViewComment(page: Page, matViewName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(matViewName, 'Edit materialized view');
  await objectForm.ensureWorkspaceTab('Edit materialized view');
  await expect(objectForm.getTab(T.materializedView)).toBeVisible({ timeout: 30000 });
  await expect(objectForm.getGeneralField(F.matViewName).locator('input')).toHaveValue(matViewName);

  await objectForm.fillGeneralField(F.matViewComment, 'edited by e2e');
  await objectForm.save();
  await objectForm.assertPreviewContains(P.editMatViewComment);
  await objectForm.confirmExecute();
}

export async function editMatViewQuery(page: Page, matViewName: string, query: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(matViewName, 'Edit materialized view');
  await objectForm.ensureWorkspaceTab('Edit materialized view');
  await expect(objectForm.getTab(T.materializedView)).toBeVisible({ timeout: 30000 });
  await objectForm.waitForReady();

  await objectForm.fillGeneralQueryField(F.matViewQuery, query);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.editMatViewRecreate);
  await objectForm.confirmExecute();
}

export async function refreshMatView(page: Page, matViewName: string, action: string): Promise<void> {
  const tree = new ObjectTreePage(page);

  // Tree actions of type "action" ask for confirmation before executing.
  await tree.runTreeAction(matViewName, action);
  const response = await waitForResponseDuring(
    page,
    apiRoute.objectExecute,
    () => tree.confirmDangerAction(),
    API_DDL_TIMEOUT
  );
  expect(response.status(), await response.text().catch(() => '')).toBe(200);
  await expect(page.getByText(/executed successfully/i).first()).toBeVisible({ timeout: 15000 });
}

/** Double-clicking a standalone node opens its Edit form with the stored values. */
export async function expectDoubleClickOpensEdit(
  page: Page,
  nodeName: string,
  tabId: string,
  fieldId: string,
  expectedValue: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  const node = await tree.expectNodeVisible(nodeName);
  await node.dblclick();
  await expect(objectForm.getTab(tabId)).toBeVisible({ timeout: 30000 });
  await objectForm.waitForReady();
  await expect(objectForm.getGeneralField(fieldId).locator('input')).toHaveValue(expectedValue);
}

// ----------------------------------------------- more trigger / index / sequence cases

export interface TriggerSpec {
  name: string;
  timing: 'BEFORE' | 'AFTER';
  /** In canonical order: INSERT, UPDATE, DELETE, TRUNCATE. */
  events: string[];
  orientation: 'ROW' | 'STATEMENT';
}

/** Add several triggers in one save; rows are appended after the existing ones. */
export async function addTriggers(page: Page, tableName: string, functionName: string, specs: TriggerSpec[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  for (const spec of specs) {
    const row = await addRow(objectForm, F.triggerName);
    await objectForm.fillArrayCell(row, F.triggerName, spec.name);
    await objectForm.selectArrayCellOption(row, F.triggerTiming, spec.timing);
    await objectForm.selectMultiSelectOptions(row, F.triggerEvents, spec.events);
    await objectForm.selectArrayCellOption(row, F.triggerOrientation, spec.orientation);
    await objectForm.selectArrayCellOption(row, F.triggerFunction, `public.${functionName}`);
  }

  await objectForm.save();
  for (const spec of specs) {
    await objectForm.assertPreviewContains(
      new RegExp(
        `CREATE TRIGGER "${spec.name}" ${spec.timing} ${spec.events.join(' OR ')} ON "public"\\."${tableName}" FOR EACH ${spec.orientation}`
      )
    );
  }
  await objectForm.confirmExecute();
}

/** Rows come back ordered by trigger name, so `specs` must be sorted by name. */
export async function expectTriggerRows(page: Page, tableName: string, functionName: string, specs: TriggerSpec[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  for (const [row, spec] of specs.entries()) {
    await expect(objectForm.getArrayCell(row, F.triggerName).locator('input')).toHaveValue(spec.name);
    await expect(objectForm.getArrayCell(row, F.triggerTiming)).toContainText(spec.timing);
    for (const event of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
      const cell = objectForm.getArrayCell(row, F.triggerEvents);
      // Check absence too: a mix-up between two events would otherwise pass when both are selected.
      if (spec.events.includes(event)) {
        await expect(cell).toContainText(event);
      } else {
        await expect(cell).not.toContainText(event);
      }
    }
    await expect(objectForm.getArrayCell(row, F.triggerOrientation)).toContainText(spec.orientation);
    await expect(objectForm.getArrayCell(row, F.triggerFunction)).toContainText(functionName);
  }
}

/** A rename plus comment is applied in place: no DROP TRIGGER. */
export async function renameTriggerWithComment(
  page: Page,
  tableName: string,
  row: number,
  oldName: string,
  newName: string,
  comment: string
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.triggers);

  await objectForm.fillArrayCell(row, F.triggerName, newName);
  await objectForm.fillArrayCell(row, F.triggerComment, comment);

  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`ALTER TRIGGER "${oldName}" ON [\\s\\S]*RENAME TO "${newName}"`));
  await objectForm.assertPreviewContains(new RegExp(`COMMENT ON TRIGGER "${newName}"[\\s\\S]*IS '${comment}'`));
  await expect(objectForm.previewModal).not.toContainText(/DROP TRIGGER/);
  await objectForm.confirmExecute();
}

/** Delete several rows of an array tab in one save. */
export async function dropRowsOfTab(page: Page, tableName: string, tabId: string, rows: number[], expectedPreview: RegExp): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(tabId);

  for (const row of rows) {
    await objectForm.deleteArrayRow(row);
  }

  await objectForm.save();
  await objectForm.assertPreviewContains(expectedPreview);
  await objectForm.confirmExecute();
}

export async function addColumn(page: Page, tableName: string, columnName: string, dataType: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.columns);

  const row = await addRow(objectForm, F.columnName);
  await objectForm.fillArrayCell(row, F.columnName, columnName);
  await objectForm.selectArrayCellOption(row, F.columnType, dataType);

  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`ADD COLUMN "${columnName}"`, 'i'));
  await objectForm.confirmExecute();
}

export interface IndexSpec {
  name: string;
  method: string;
  columns: string[];
  unique?: boolean;
}

/** Add several indexes in one save. */
export async function addIndexes(page: Page, tableName: string, specs: IndexSpec[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  for (const spec of specs) {
    const row = await addRow(objectForm, F.indexName);
    await objectForm.fillArrayCell(row, F.indexName, spec.name);
    await objectForm.selectArrayCellOption(row, F.indexMethod, spec.method);
    await objectForm.selectMultiSelectOptions(row, F.indexColumns, spec.columns);
    await objectForm.toggleArrayCheckbox(row, F.indexUnique, spec.unique ?? false);
  }

  await objectForm.save();
  for (const spec of specs) {
    const columns = spec.columns.map((column) => `"${column}"`).join(', ');
    await objectForm.assertPreviewContains(
      new RegExp(`CREATE ${spec.unique ? 'UNIQUE ' : ''}INDEX "${spec.name}" ON [\\s\\S]*USING ${spec.method} \\(${columns}\\)`)
    );
  }
  await objectForm.confirmExecute();
}

/** Rows come back ordered by index name, so `specs` must be sorted by name. */
export async function expectIndexRows(page: Page, tableName: string, specs: IndexSpec[]): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  for (const [row, spec] of specs.entries()) {
    await expect(objectForm.getArrayCell(row, F.indexName).locator('input')).toHaveValue(spec.name);
    await expect(objectForm.getArrayCell(row, F.indexMethod)).toContainText(spec.method);
    await expect(objectForm.getArrayCell(row, F.indexUnique).locator('input[type="checkbox"]')).toBeChecked({
      checked: spec.unique ?? false
    });
    for (const column of spec.columns) {
      await expect(objectForm.getArrayCell(row, F.indexColumns)).toContainText(column);
    }
  }
}

/** A rename is applied in place (ALTER INDEX ... RENAME), without recreating the index. */
export async function renameIndex(page: Page, tableName: string, row: number, oldName: string, newName: string): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);

  await objectForm.fillArrayCell(row, F.indexName, newName);
  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`ALTER INDEX [\\s\\S]*"${oldName}" RENAME TO "${newName}"`));
  await expect(objectForm.previewModal).not.toContainText(/DROP INDEX/);
  await objectForm.confirmExecute();
}

export async function createSequenceWithOptions(
  page: Page,
  names: Pick<PgCoreNames, 'connectionName' | 'databaseName'>,
  sequenceName: string
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openCreateForm(page, names, 'Sequences', 'Create sequence', T.sequence);

  await objectForm.fillGeneralField(F.sequenceName, sequenceName);
  await objectForm.fillGeneralField(F.sequenceStart, '1');
  await objectForm.fillGeneralField(F.sequenceIncrement, '2');
  await objectForm.fillGeneralField(F.sequenceMin, '1');
  await objectForm.fillGeneralField(F.sequenceMax, '1000');
  await objectForm.fillGeneralField(F.sequenceCache, '20');
  await objectForm.toggleGeneralCheckbox(F.sequenceCycle, true);

  await objectForm.save();
  await objectForm.assertPreviewContains(/INCREMENT BY 2 MINVALUE 1 MAXVALUE 1000 START WITH 1 CACHE 20 CYCLE/);
  await objectForm.confirmExecute();

  await expandPublicContainer(page, names, 'Sequences');
  await expect(tree.getTreeNode(sequenceName)).toBeVisible({ timeout: 15000 });
}

export async function expectSequenceOptions(
  page: Page,
  sequenceName: string,
  expected: { start: string; increment: string; min: string; max: string; cache: string; cycle: boolean }
): Promise<ObjectFormPage> {
  const objectForm = await openEditForm(page, sequenceName, 'Edit sequence', T.sequence);

  await expect(objectForm.getGeneralField(F.sequenceStart).locator('input')).toHaveValue(expected.start);
  await expect(objectForm.getGeneralField(F.sequenceIncrement).locator('input')).toHaveValue(expected.increment);
  await expect(objectForm.getGeneralField(F.sequenceMin).locator('input')).toHaveValue(expected.min);
  await expect(objectForm.getGeneralField(F.sequenceMax).locator('input')).toHaveValue(expected.max);
  await expect(objectForm.getGeneralField(F.sequenceCache).locator('input')).toHaveValue(expected.cache);
  await expect(objectForm.getGeneralField(F.sequenceCycle).locator('input[type="checkbox"]')).toBeChecked({
    checked: expected.cycle
  });

  return objectForm;
}

export async function editSequenceOptions(page: Page, sequenceName: string): Promise<void> {
  const objectForm = await openEditForm(page, sequenceName, 'Edit sequence', T.sequence);

  await objectForm.fillGeneralField(F.sequenceMax, '2000');
  await objectForm.fillGeneralField(F.sequenceCache, '50');
  await objectForm.toggleGeneralCheckbox(F.sequenceCycle, false);

  await objectForm.save();
  await objectForm.assertPreviewContains(/ALTER SEQUENCE[\s\S]*MAXVALUE 2000 CACHE 50 NO CYCLE/);
  await objectForm.confirmExecute();
}

/** Set (or, with `owner` empty, clear) the standalone sequence's OWNED BY. */
export async function setSequenceOwner(page: Page, sequenceName: string, owner: string, preview: RegExp): Promise<void> {
  const objectForm = await openEditForm(page, sequenceName, 'Edit sequence', T.sequence);

  await objectForm.fillGeneralField(F.sequenceOwnedBy, owner);
  await objectForm.save();
  await objectForm.assertPreviewContains(preview);
  await objectForm.confirmExecute();
}

export async function expectSequenceOwner(page: Page, sequenceName: string, owner: string): Promise<void> {
  const objectForm = await openEditForm(page, sequenceName, 'Edit sequence', T.sequence);

  await expect(objectForm.getGeneralField(F.sequenceOwnedBy).locator('input')).toHaveValue(owner);
}

// ------------------------------------------------------- matview owner / rename

/** Roles are cluster-wide, so run them in `default` (the only database the editor picker lists). */
export async function runSql(page: Page, sql: string): Promise<void> {
  const sqlEditor = new SqlEditorPage(page);

  await sqlEditor.open();
  await sqlEditor.selectContext('default', 'public');
  await sqlEditor.typeAndRun(sql);
  await sqlEditor.expectQuerySucceeded(sql.slice(0, 12));
}

async function openEditMatView(page: Page, matViewName: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);

  await objectForm.closeAllWorkspaceTabs();
  await tree.runTreeAction(matViewName, 'Edit materialized view');
  await objectForm.ensureWorkspaceTab('Edit materialized view');
  await expect(objectForm.getTab(T.materializedView)).toBeVisible({ timeout: 30000 });
  await objectForm.waitForReady();

  return objectForm;
}

export async function changeMatViewOwner(page: Page, matViewName: string, role: string): Promise<void> {
  const objectForm = await openEditMatView(page, matViewName);

  await objectForm.fillGeneralField(F.matViewOwner, role);
  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`ALTER MATERIALIZED VIEW [\\s\\S]*"${matViewName}" OWNER TO "${role}"`));
  await expect(objectForm.previewModal).not.toContainText(/DROP MATERIALIZED VIEW/);
  await objectForm.confirmExecute();
}

export async function expectMatViewOwner(page: Page, matViewName: string, role: string): Promise<void> {
  const objectForm = await openEditMatView(page, matViewName);

  await expect(objectForm.getGeneralField(F.matViewOwner).locator('input')).toHaveValue(role);
}

export async function renameMatView(page: Page, matViewName: string, newName: string): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openEditMatView(page, matViewName);

  await objectForm.fillGeneralField(F.matViewName, newName);
  await objectForm.save();
  await objectForm.assertPreviewContains(new RegExp(`ALTER MATERIALIZED VIEW [\\s\\S]*"${matViewName}" RENAME TO "${newName}"`));
  await expect(objectForm.previewModal).not.toContainText(/DROP MATERIALIZED VIEW/);
  await objectForm.confirmExecute();

  await tree.waitForTreeLoad();
  await expect(tree.getTreeNode(newName)).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------- cleanup

export async function cleanupPgCoreSchema(page: Page, names: PgCoreNames): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);

  // Dropping the database removes every object created inside it.
  // A leftover tree search (from expectNodeVisible) would keep showing the dropped database.
  await tree.clearTreeFilter();
  await tree.expandPath([names.connectionName]);
  await expect(tree.getTreeNode(names.databaseName)).toBeVisible({ timeout: 15000 });
  // Collapse first: the tree reloads expanded children after the drop and would fail on the missing database.
  const databaseNode = tree.getTreeNode(names.databaseName);
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
