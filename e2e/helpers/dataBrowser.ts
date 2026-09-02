import type { Page } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import {
  ConnectionPage,
  DataBrowserPage,
  DataGridPage,
  ObjectTreePage,
  SqlEditorPage,
} from "../pages";

export interface DataBrowserSeed {
  connectionName: string;
  tableName: string;
  treePath: string[];
  sqlEditor: SqlEditorPage;
  dataBrowser: DataBrowserPage;
  dataGrid: DataGridPage;
  /** Present for SQLite; caller must remove in finally. */
  sqliteDbPath?: string;
}

function createTableSql(engine: DbEngine, tableName: string): string {
  if (engine === "postgresql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  score INT NOT NULL
);
INSERT INTO ${tableName} (name, score) VALUES
  ('Alpha', 10),
  ('Bravo', 20),
  ('Charlie', 30),
  ('Delta', 40),
  ('Echo', 50),
  ('Foxtrot', 60),
  ('Golf', 70),
  ('Hotel', 80);
    `.trim();
  }

  if (engine === "mysql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  score INT NOT NULL
);
INSERT INTO ${tableName} (name, score) VALUES
  ('Alpha', 10),
  ('Bravo', 20),
  ('Charlie', 30),
  ('Delta', 40),
  ('Echo', 50),
  ('Foxtrot', 60),
  ('Golf', 70),
  ('Hotel', 80);
    `.trim();
  }

  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL
);
INSERT INTO ${tableName} (name, score) VALUES
  ('Alpha', 10),
  ('Bravo', 20),
  ('Charlie', 30),
  ('Delta', 40),
  ('Echo', 50),
  ('Foxtrot', 60),
  ('Golf', 70),
  ('Hotel', 80);
  `.trim();
}

export function dataBrowserTreePath(
  engine: DbEngine,
  connectionName: string,
): string[] {
  if (engine === "postgresql") {
    return [connectionName, "default", "public"];
  }
  if (engine === "mysql") {
    return [connectionName, "default"];
  }
  return [connectionName];
}

export async function setupDataBrowserTable(
  page: Page,
  connectionName: string,
  tableName: string,
  engine: DbEngine = "postgresql",
): Promise<DataBrowserSeed> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataBrowser = new DataBrowserPage(page);
  const dataGrid = new DataGridPage(page);

  let sqliteDbPath: string | undefined;
  if (engine === "sqlite") {
    sqliteDbPath = `/tmp/dbo-e2e-data-browser-${connectionName}.db`;
    ensureSqliteDbFile(sqliteDbPath);
  }

  const config = getDbConfig(engine, connectionName, sqliteDbPath);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(config);
  await sqlEditor.open();
  if (engine === "postgresql") {
    await sqlEditor.selectContext("default", "public");
  } else if (engine === "mysql") {
    await sqlEditor.selectContext("default");
  }
  await sqlEditor.typeAndRun(createTableSql(engine, tableName));

  return {
    connectionName,
    tableName,
    treePath: dataBrowserTreePath(engine, connectionName),
    sqlEditor,
    dataBrowser,
    dataGrid,
    sqliteDbPath,
  };
}

export async function dropDataBrowserTable(
  page: Page,
  connectionName: string,
  tableName: string,
  engine: DbEngine = "postgresql",
): Promise<void> {
  const tree = new ObjectTreePage(page);
  const path = dataBrowserTreePath(engine, connectionName);
  await tree.expandPath(path).catch(() => undefined);
  await tree.refreshExpandNode("Tables").catch(() => undefined);
  await tree.dropObject(tableName, "Drop table").catch(() => undefined);
}

export async function cleanupDataBrowserSeed(seed: DataBrowserSeed): Promise<void> {
  if (seed.sqliteDbPath) {
    removeSqliteDbFile(seed.sqliteDbPath);
  }
}
