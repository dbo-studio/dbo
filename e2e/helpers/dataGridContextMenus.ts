import type { Page } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import {
  ConnectionPage,
  DataBrowserPage,
  DataGridPage,
  ObjectTreePage,
  SqlEditorPage,
} from "../pages";
import type { DataBrowserSeed } from "./dataBrowser";
import { dropDataBrowserTable } from "./dataBrowser";

/** Same as data-browser seed plus nullable `note` for IS NULL filter coverage. */
export async function setupContextMenuTable(
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

export { dropDataBrowserTable };
