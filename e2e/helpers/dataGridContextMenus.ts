import type { Page } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import {
  cleanupDataBrowserSeed,
  dataBrowserTreePath,
  dropDataBrowserTable,
  type DataBrowserSeed,
} from "./dataBrowser";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import {
  ConnectionPage,
  DataBrowserPage,
  DataGridPage,
  SqlEditorPage,
} from "../pages";

function contextMenuSeedSql(engine: DbEngine, tableName: string): string {
  if (engine === "postgresql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  score INT NOT NULL,
  note VARCHAR(100)
);
INSERT INTO ${tableName} (name, score, note) VALUES
  ('Alpha', 10, NULL),
  ('Bravo', 20, 'keep'),
  ('Charlie', 30, 'keep'),
  ('Delta', 40, 'keep'),
  ('Echo', 50, 'keep'),
  ('Foxtrot', 60, 'keep'),
  ('Golf', 70, 'keep'),
  ('Hotel', 80, 'keep');
    `.trim();
  }
  if (engine === "mysql") {
    return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  score INT NOT NULL,
  note VARCHAR(100) NULL
);
INSERT INTO ${tableName} (name, score, note) VALUES
  ('Alpha', 10, NULL),
  ('Bravo', 20, 'keep'),
  ('Charlie', 30, 'keep'),
  ('Delta', 40, 'keep'),
  ('Echo', 50, 'keep'),
  ('Foxtrot', 60, 'keep'),
  ('Golf', 70, 'keep'),
  ('Hotel', 80, 'keep');
    `.trim();
  }
  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  note TEXT
);
INSERT INTO ${tableName} (name, score, note) VALUES
  ('Alpha', 10, NULL),
  ('Bravo', 20, 'keep'),
  ('Charlie', 30, 'keep'),
  ('Delta', 40, 'keep'),
  ('Echo', 50, 'keep'),
  ('Foxtrot', 60, 'keep'),
  ('Golf', 70, 'keep'),
  ('Hotel', 80, 'keep');
  `.trim();
}

/** Same as data-browser seed plus nullable `note` for IS NULL filter coverage. */
export async function setupContextMenuTable(
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
    sqliteDbPath = `/tmp/dbo-e2e-grid-ctx-${connectionName}.db`;
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
  await sqlEditor.typeAndRun(contextMenuSeedSql(engine, tableName));

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

export { dropDataBrowserTable, cleanupDataBrowserSeed };
