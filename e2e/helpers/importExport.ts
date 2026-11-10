import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Page } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { createTableSql } from "./ddl";
import { HOST_SQL } from "./hostSql";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import {
  ConnectionPage,
  type ConnectionConfig,
  DataBrowserPage,
  DataGridPage,
  SqlEditorPage,
} from "../pages";

export interface ImportExportSetupNames {
  connectionName: string;
  exportTable?: string;
  importCsvTable?: string;
  importJsonTable?: string;
  importSqlTable?: string;
  roundTripTable?: string;
}

export interface ImportExportTmpPaths {
  exportedCsv: string;
  exportedJson: string;
  exportedSql: string;
  filteredCsv: string;
  handCsv: string;
  handJson: string;
  handSql: string;
  badRowsCsv: string;
}

export interface ImportExportTmpDir {
  tmpDir: string;
  paths: ImportExportTmpPaths;
  cleanup: () => void;
}

export function createImportExportTmpDir(suffix: string): ImportExportTmpDir {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dbo-e2e-ie-"));
  return {
    tmpDir,
    paths: {
      exportedCsv: path.join(tmpDir, `export-${suffix}.csv`),
      exportedJson: path.join(tmpDir, `export-${suffix}.json`),
      exportedSql: path.join(tmpDir, `export-${suffix}.sql`),
      filteredCsv: path.join(tmpDir, `filtered-${suffix}.csv`),
      handCsv: path.join(tmpDir, `hand-${suffix}.csv`),
      handJson: path.join(tmpDir, `hand-${suffix}.json`),
      handSql: path.join(tmpDir, `hand-${suffix}.sql`),
      badRowsCsv: path.join(tmpDir, `bad-rows-${suffix}.csv`),
    },
    cleanup: () => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}

/** @deprecated Prefer treePathForEngine */
export function treePath(
  connectionName: string,
): readonly [string, string, string] {
  return [connectionName, "default", "public"] as const;
}

export function treePathForEngine(
  engine: DbEngine,
  connectionName: string,
): string[] {
  if (engine === "postgresql") {
    return [connectionName, "default", "public"];
  }
  if (engine === "mysql") {
    return [connectionName, "default"];
  }
  if (engine === "sqlite") {
    return [connectionName];
  }
  return [connectionName, HOST_SQL[engine].namespace];
}

export function engineLabel(engine: DbEngine): string {
  if (engine === "mssql" || engine === "clickhouse") return HOST_SQL[engine].label;
  return engine === "postgresql" ? "PostgreSQL" : engine === "mysql" ? "MySQL" : "SQLite";
}

function buildSetupSql(names: ImportExportSetupNames, engine: DbEngine): string {
  const table = (name: string) =>
    engine === "clickhouse"
      ? createTableSql(engine, name, ["id Int32", "name String"], "id")
      : `CREATE TABLE ${name} (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
)`;
  const statements: string[] = [];

  if (names.exportTable) {
    statements.push(
      `DROP TABLE IF EXISTS ${names.exportTable};`,
      `${table(names.exportTable)};`,
      `INSERT INTO ${names.exportTable} (id, name) VALUES
  (1, 'Export One'),
  (2, 'Export Two'),
  (3, 'Export Three');`,
    );
  }

  for (const t of [
    names.importCsvTable,
    names.importJsonTable,
    names.importSqlTable,
    names.roundTripTable,
  ]) {
    if (t) {
      statements.push(
        `DROP TABLE IF EXISTS ${t};`,
        `${table(t)};`,
      );
    }
  }

  return statements.join("\n");
}

export interface ImportExportPages {
  connectionPage: ConnectionPage;
  sqlEditor: SqlEditorPage;
  dataBrowser: DataBrowserPage;
  dataGrid: DataGridPage;
  sqliteDbPath?: string;
}

export async function setupImportExport(
  page: Page,
  names: ImportExportSetupNames,
  engine: DbEngine = "postgresql",
  configOverride: Partial<ConnectionConfig> = {},
): Promise<ImportExportPages> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataBrowser = new DataBrowserPage(page);
  const dataGrid = new DataGridPage(page);

  let sqliteDbPath: string | undefined;
  if (engine === "sqlite") {
    sqliteDbPath = `/tmp/dbo-e2e-ie-${names.connectionName}.db`;
    ensureSqliteDbFile(sqliteDbPath);
  }

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection({
    ...getDbConfig(engine, names.connectionName, sqliteDbPath),
    ...configOverride,
  });
  await sqlEditor.open();
  if (engine === "postgresql") {
    await sqlEditor.selectContext("default", "public");
  } else if (engine === "mysql") {
    await sqlEditor.selectContext("default");
  }
  await sqlEditor.typeAndRun(buildSetupSql(names, engine));

  return { connectionPage, sqlEditor, dataBrowser, dataGrid, sqliteDbPath };
}

/** @deprecated Prefer setupImportExport(..., 'postgresql') */
export async function setupPostgresImportExport(
  page: Page,
  names: ImportExportSetupNames,
): Promise<ImportExportPages> {
  return setupImportExport(page, names, "postgresql");
}

export async function dropTables(
  sqlEditor: SqlEditorPage,
  tableNames: string[],
): Promise<void> {
  if (tableNames.length === 0) {
    return;
  }
  await sqlEditor.open();
  await sqlEditor.typeAndRun(
    tableNames.map((table) => `DROP TABLE IF EXISTS ${table};`).join("\n"),
  );
}

export function cleanupImportExportSqlite(pages: ImportExportPages): void {
  if (pages.sqliteDbPath) {
    removeSqliteDbFile(pages.sqliteDbPath);
  }
}
