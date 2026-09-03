import { expect, type Page } from "@playwright/test";
import {
  mysqlTypedCellsDropSql,
  mysqlTypedCellsSetupSql,
  postgresTypedCellsDropSql,
  postgresTypedCellsSetupSql,
} from "../fixtures/dataGridTypedCells";
import { getDbConfig } from "../fixtures/dbConfigs";
import { ConnectionPage, DataGridPage, SqlEditorPage } from "../pages";

export type TypedCellsEngine = "mysql" | "postgresql";

export interface TypedCellsPages {
  connectionPage: ConnectionPage;
  sqlEditor: SqlEditorPage;
  dataGrid: DataGridPage;
}

export function typedCellsEnumType(suffix: string): string {
  return `e2e_qtypes_status_${suffix}`;
}

export async function setupTypedTable(
  page: Page,
  engine: TypedCellsEngine,
  connectionName: string,
  tableName: string,
  enumType?: string,
): Promise<TypedCellsPages> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataGrid = new DataGridPage(page);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(getDbConfig(engine, connectionName));
  await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
  await sqlEditor.open();

  if (engine === "mysql") {
    await sqlEditor.selectContext("default");
    await sqlEditor.typeAndRun(mysqlTypedCellsSetupSql(tableName));
  } else {
    if (!enumType) {
      throw new Error("enumType is required for PostgreSQL typed-cells setup");
    }
    await sqlEditor.selectContext("default", "public");
    await sqlEditor.typeAndRun(postgresTypedCellsSetupSql(tableName, enumType));
  }

  return { connectionPage, sqlEditor, dataGrid };
}

export async function loadTypedTableGrid(
  sqlEditor: SqlEditorPage,
  dataGrid: DataGridPage,
  engine: TypedCellsEngine,
  tableName: string,
): Promise<void> {
  const orderBy = engine === "mysql" ? "id" : "name";
  await sqlEditor.typeAndRun(`SELECT * FROM ${tableName} ORDER BY ${orderBy};`);
  await dataGrid.waitForData("Aurora");
}

export async function dropTypedTable(
  sqlEditor: SqlEditorPage,
  engine: TypedCellsEngine,
  tableName: string,
  enumType?: string,
): Promise<void> {
  if (engine === "mysql") {
    await sqlEditor.typeAndRun(mysqlTypedCellsDropSql(tableName));
    return;
  }
  if (!enumType) {
    throw new Error("enumType is required for PostgreSQL typed-cells cleanup");
  }
  await sqlEditor.typeAndRun(postgresTypedCellsDropSql(tableName, enumType));
}

export async function cleanupTypedTableOnFailure(
  sqlEditor: SqlEditorPage,
  engine: TypedCellsEngine,
  tableName: string,
  enumType?: string,
): Promise<void> {
  try {
    await dropTypedTable(sqlEditor, engine, tableName, enumType);
  } catch (cleanupErr) {
    console.warn(`[e2e] ${engine} typed-cells cleanup:`, cleanupErr);
  }
}
