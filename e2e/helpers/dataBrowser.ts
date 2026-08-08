import type { Page } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
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
}

export async function setupDataBrowserTable(
  page: Page,
  connectionName: string,
  tableName: string,
): Promise<DataBrowserSeed> {
  const connectionPage = new ConnectionPage(page);
  const sqlEditor = new SqlEditorPage(page);
  const dataBrowser = new DataBrowserPage(page);
  const dataGrid = new DataGridPage(page);
  const config = getDbConfig("postgresql", connectionName);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await connectionPage.setupConnection(config);
  await sqlEditor.open();
  await sqlEditor.selectContext("default", "public");
  await sqlEditor.typeAndRun(
    `
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
    `.trim(),
  );

  return {
    connectionName,
    tableName,
    treePath: [connectionName, "default", "public"],
    sqlEditor,
    dataBrowser,
    dataGrid,
  };
}

export async function dropDataBrowserTable(
  page: Page,
  connectionName: string,
  tableName: string,
): Promise<void> {
  const tree = new ObjectTreePage(page);
  await tree.expandPath([connectionName, "default", "public"]);
  await tree.refreshExpandNode("Tables");
  await tree.dropObject(tableName, "Drop table").catch(() => undefined);
}
