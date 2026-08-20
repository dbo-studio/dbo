import { expect, type Page } from "@playwright/test";
import { getDbConfig, type DbEngine } from "../fixtures/dbConfigs";
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

export type FkAutocompleteEngine = DbEngine;

export interface FkAutocompleteSeed {
  connectionName: string;
  categoriesTable: string;
  productsTable: string;
  treePath: string[];
  sqlEditor: SqlEditorPage;
  dataBrowser: DataBrowserPage;
  dataGrid: DataGridPage;
  sqlitePath?: string;
}

export function fkAutocompleteTables(suffix: string, engine: FkAutocompleteEngine): {
  categoriesTable: string;
  productsTable: string;
} {
  const tag = engine === "postgresql" ? "" : `_${engine}`;
  return {
    categoriesTable: `e2e_fk_cats${tag}_${suffix}`,
    productsTable: `e2e_fk_prods${tag}_${suffix}`,
  };
}

export function fkCompositeTables(suffix: string): {
  parentsTable: string;
  childrenTable: string;
} {
  return {
    parentsTable: `e2e_fk_comp_p_${suffix}`,
    childrenTable: `e2e_fk_comp_c_${suffix}`,
  };
}

function setupSql(
  engine: FkAutocompleteEngine,
  categoriesTable: string,
  productsTable: string,
  suffix: string,
): string {
  if (engine === "mysql") {
    return `
DROP TABLE IF EXISTS ${productsTable};
DROP TABLE IF EXISTS ${categoriesTable};
CREATE TABLE ${categoriesTable} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
CREATE TABLE ${productsTable} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INT NOT NULL,
  CONSTRAINT fk_cat_${suffix} FOREIGN KEY (category_id) REFERENCES ${categoriesTable}(id)
);
INSERT INTO ${categoriesTable} (name) VALUES ('Electronics'), ('Books'), ('Clothing');
INSERT INTO ${productsTable} (name, category_id) VALUES
  ('Laptop', 1),
  ('Novel', 2);
    `.trim();
  }

  if (engine === "sqlite") {
    return `
DROP TABLE IF EXISTS ${productsTable};
DROP TABLE IF EXISTS ${categoriesTable};
CREATE TABLE ${categoriesTable} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE ${productsTable} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES ${categoriesTable}(id)
);
INSERT INTO ${categoriesTable} (name) VALUES ('Electronics'), ('Books'), ('Clothing');
INSERT INTO ${productsTable} (name, category_id) VALUES
  ('Laptop', 1),
  ('Novel', 2);
    `.trim();
  }

  return `
DROP TABLE IF EXISTS ${productsTable};
DROP TABLE IF EXISTS ${categoriesTable};
CREATE TABLE ${categoriesTable} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
CREATE TABLE ${productsTable} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INT NOT NULL REFERENCES ${categoriesTable}(id)
);
INSERT INTO ${categoriesTable} (name) VALUES ('Electronics'), ('Books'), ('Clothing');
INSERT INTO ${productsTable} (name, category_id) VALUES
  ('Laptop', 1),
  ('Novel', 2);
  `.trim();
}

function dropSql(categoriesTable: string, productsTable: string): string {
  return `
DROP TABLE IF EXISTS ${productsTable};
DROP TABLE IF EXISTS ${categoriesTable};
  `.trim();
}

export async function setupFkAutocompleteTables(
  page: Page,
  engine: FkAutocompleteEngine,
  connectionName: string,
  categoriesTable: string,
  productsTable: string,
  suffix: string,
  sqlitePath?: string,
): Promise<FkAutocompleteSeed> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataBrowser = new DataBrowserPage(page);
  const dataGrid = new DataGridPage(page);
  const config = getDbConfig(engine, connectionName, sqlitePath);

  if (engine === "sqlite" && sqlitePath) {
    ensureSqliteDbFile(sqlitePath);
  }

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(config);
  await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
  await sqlEditor.open();

  let treePath: string[];
  if (engine === "postgresql") {
    await sqlEditor.selectContext("default", "public");
    treePath = [connectionName, "default", "public"];
  } else if (engine === "mysql") {
    await sqlEditor.selectContext("default");
    treePath = [connectionName, "default"];
  } else {
    treePath = [connectionName];
  }

  await sqlEditor.typeAndRun(
    setupSql(engine, categoriesTable, productsTable, suffix),
  );

  return {
    connectionName,
    categoriesTable,
    productsTable,
    treePath,
    sqlEditor,
    dataBrowser,
    dataGrid,
    sqlitePath,
  };
}

export async function dropFkAutocompleteTables(
  seed: FkAutocompleteSeed,
): Promise<void> {
  await seed.sqlEditor.open();
  if (seed.treePath.length >= 3) {
    await seed.sqlEditor.selectContext("default", "public");
  } else if (seed.treePath.length === 2) {
    await seed.sqlEditor.selectContext("default");
  }
  await seed.sqlEditor.typeAndRun(
    dropSql(seed.categoriesTable, seed.productsTable),
  );
  if (seed.sqlitePath) {
    removeSqliteDbFile(seed.sqlitePath);
  }
}

export interface FkCompositeSeed {
  connectionName: string;
  parentsTable: string;
  childrenTable: string;
  treePath: string[];
  sqlEditor: SqlEditorPage;
  dataBrowser: DataBrowserPage;
  dataGrid: DataGridPage;
  sqlitePath: string;
}

export async function setupFkCompositeSqliteTables(
  page: Page,
  connectionName: string,
  parentsTable: string,
  childrenTable: string,
  sqlitePath: string,
): Promise<FkCompositeSeed> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataBrowser = new DataBrowserPage(page);
  const dataGrid = new DataGridPage(page);
  const config = getDbConfig("sqlite", connectionName, sqlitePath);

  ensureSqliteDbFile(sqlitePath);
  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(config);
  await expect(connectionPage.getConnectionItem(connectionName)).toBeVisible();
  await sqlEditor.open();

  const sql = `
DROP TABLE IF EXISTS ${childrenTable};
DROP TABLE IF EXISTS ${parentsTable};
CREATE TABLE ${parentsTable} (
  tenant_id TEXT NOT NULL,
  id INTEGER NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (tenant_id, id)
);
CREATE TABLE ${childrenTable} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  parent_id INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, parent_id) REFERENCES ${parentsTable}(tenant_id, id)
);
INSERT INTO ${parentsTable} (tenant_id, id, title) VALUES
  ('t1', 1, 'Alpha'),
  ('t1', 2, 'Beta');
INSERT INTO ${childrenTable} (name, tenant_id, parent_id) VALUES
  ('ChildA', 't1', 1);
  `.trim();

  await sqlEditor.typeAndRun(sql);

  return {
    connectionName,
    parentsTable,
    childrenTable,
    treePath: [connectionName],
    sqlEditor,
    dataBrowser,
    dataGrid,
    sqlitePath,
  };
}

export async function dropFkCompositeSqliteTables(
  seed: FkCompositeSeed,
): Promise<void> {
  await seed.sqlEditor.open();
  await seed.sqlEditor.typeAndRun(
    `
DROP TABLE IF EXISTS ${seed.childrenTable};
DROP TABLE IF EXISTS ${seed.parentsTable};
    `.trim(),
  );
  removeSqliteDbFile(seed.sqlitePath);
}
