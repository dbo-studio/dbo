import { expect, type Page } from "@playwright/test";
import {
  MYSQL_LIFECYCLE_FIELDS as F,
  MYSQL_LIFECYCLE_PREVIEW as P,
  MYSQL_LIFECYCLE_TABS as T,
} from "../fixtures/mysqlObjectFormLifecycle";
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from "../pages";

async function openEditTable(page: Page, tableName: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);
  await tree.runTreeAction(tableName, "Edit table");
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, "Edit table");
  await objectForm.waitForReady();
  return objectForm;
}

export async function editTableSetNotNull(
  page: Page,
  tableName: string,
  columnRowIndex: number,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
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
  defaultValue: string,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
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
  comment: string,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.columns);
  await objectForm.fillArrayCell(columnRowIndex, F.columnComment, comment);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.commentOnColumn);
  await objectForm.confirmExecute();
}

export async function editTableDropForeignKey(
  page: Page,
  tableName: string,
  fkRowIndex = 0,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.foreignKeys);
  await objectForm.deleteArrayRow(fkRowIndex);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropForeignKey);
  await objectForm.confirmExecute();
}

export async function editTableAddForeignKey(
  page: Page,
  tableName: string,
  usersTable: string,
  fkName: string,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.foreignKeys);
  const existingRows = await page.getByTestId(/^object-form-delete-row-/).count();
  await objectForm.addRow();
  const fkRowIndex = existingRows;
  await objectForm.fillArrayCell(fkRowIndex, F.fkName, fkName);
  await objectForm.selectArrayCellOption(fkRowIndex, F.fkTargetTable, usersTable);
  await objectForm.selectMultiSelectOptions(fkRowIndex, F.fkSourceColumns, [
    "user_id",
  ]);
  await objectForm.selectMultiSelectOptions(fkRowIndex, F.fkTargetColumns, [
    "id",
  ]);
  await objectForm.selectArrayCellOption(fkRowIndex, F.fkOnUpdate, "CASCADE");
  await objectForm.selectArrayCellOption(fkRowIndex, F.fkOnDelete, "CASCADE");
  await objectForm.save();
  await objectForm.assertPreviewContains(P.addForeignKey);
  await objectForm.assertPreviewContains(usersTable);
  await objectForm.confirmExecute();
}

export async function editTableEditForeignKey(
  page: Page,
  tableName: string,
  opts: {
    fkRowIndex?: number;
    newFkName: string;
    onUpdate?: string;
    onDelete?: string;
  },
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  const fkRowIndex = opts.fkRowIndex ?? 0;
  await objectForm.selectTab(T.foreignKeys);
  await objectForm.fillArrayCell(fkRowIndex, F.fkName, opts.newFkName);
  if (opts.onUpdate) {
    await objectForm.selectArrayCellOption(
      fkRowIndex,
      F.fkOnUpdate,
      opts.onUpdate,
    );
  }
  if (opts.onDelete) {
    await objectForm.selectArrayCellOption(
      fkRowIndex,
      F.fkOnDelete,
      opts.onDelete,
    );
  }
  await objectForm.save();
  await objectForm.assertPreviewContains(P.editForeignKey);
  await objectForm.assertPreviewContains(opts.newFkName);
  if (opts.onDelete) {
    await objectForm.assertPreviewContains(opts.onDelete);
  }
  await objectForm.confirmExecute();
}

export async function editTableDropColumn(
  page: Page,
  tableName: string,
  columnRowIndex: number,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.columns);
  await objectForm.deleteArrayRow(columnRowIndex);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropColumn);
  await objectForm.confirmExecute();
}

export async function editTableRename(
  page: Page,
  tableName: string,
  renamedTableName: string,
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const objectForm = await openEditTable(page, tableName);
  await objectForm.fillGeneralField(F.tableName, renamedTableName);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.renameTable);
  await objectForm.confirmExecute();
  await expect(tree.getTreeNode(renamedTableName)).toBeVisible({
    timeout: 15000,
  });
}

export async function editTableComment(
  page: Page,
  tableName: string,
  comment: string,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.fillGeneralField(F.tableComment, comment);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.commentOnTable);
  await objectForm.confirmExecute();
}

export async function editTableChangeColumnType(
  page: Page,
  tableName: string,
  columnRowIndex: number,
  dataType: string,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.columns);
  await objectForm.selectArrayCellOption(
    columnRowIndex,
    F.columnType,
    dataType,
  );
  await objectForm.save();
  await objectForm.assertPreviewContains(P.modifyColumn);
  await objectForm.confirmExecute();
}

export async function editTableAddUniqueKey(
  page: Page,
  tableName: string,
  constraintName: string,
  columns: string[],
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.keys);
  const existingRows = await page.getByTestId(/^object-form-delete-row-/).count();
  await objectForm.addRow();
  const newRowIndex = existingRows;
  await objectForm.fillArrayCell(newRowIndex, F.keyName, constraintName);
  await objectForm.selectMultiSelectOptions(newRowIndex, F.keyColumns, columns);
  await objectForm.selectArrayCellOption(newRowIndex, F.keyType, "UNIQUE");
  await objectForm.save();
  await objectForm.assertPreviewContains(P.addUnique);
  await objectForm.confirmExecute();
}

export async function editTableDropKey(
  page: Page,
  tableName: string,
  keyRowIndex: number,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.keys);
  await objectForm.deleteArrayRow(keyRowIndex);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropKey);
  await objectForm.confirmExecute();
}

export async function editTableDropIndex(
  page: Page,
  tableName: string,
  indexRowIndex = 0,
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);
  await objectForm.deleteArrayRow(indexRowIndex);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.dropIndex);
  await objectForm.confirmExecute();
}

export async function editTableAddIndex(
  page: Page,
  tableName: string,
  indexName: string,
  columns: string[],
): Promise<void> {
  const objectForm = await openEditTable(page, tableName);
  await objectForm.selectTab(T.indexes);
  const existingRows = await page.getByTestId(/^object-form-delete-row-/).count();
  await objectForm.addRow();
  const rowIndex = existingRows;
  await objectForm.fillArrayCell(rowIndex, F.indexName, indexName);
  await objectForm.selectMultiSelectOptions(rowIndex, F.indexColumns, columns);
  await objectForm.save();
  await objectForm.assertPreviewContains(P.createIndex);
  await objectForm.assertPreviewContains(indexName);
  await objectForm.confirmExecute();
}

export async function cleanupMysqlEditTable(
  page: Page,
  names: {
    connectionName: string;
    databaseName: string;
    usersTable: string;
    postsTable: string;
  },
): Promise<ConnectionPage> {
  const tree = new ObjectTreePage(page);
  const connectionPage = new ConnectionPage(page);
  const renamedUsersTable = `${names.usersTable}_renamed`;

  await tree.expandPath([names.connectionName, names.databaseName]);
  await tree.dropObject(names.postsTable, "Drop table").catch(() => undefined);
  await tree.dropObject(renamedUsersTable, "Drop table").catch(() => undefined);
  await tree.dropObject(names.usersTable, "Drop table").catch(() => undefined);
  await tree.expandNode(names.connectionName);
  await tree.dropObject(names.databaseName, "Drop database").catch(() => undefined);
  await connectionPage.deleteConnection(names.connectionName);

  return connectionPage;
}
