import { expect, test, type Page } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";
import { ConnectionPage, ObjectFormPage, ObjectTreePage, SqlEditorPage } from "../pages";

const F = {
  fkName: "constraint_name",
  fkSourceColumns: "ref_columns",
  fkTargetTable: "target_table",
  fkTargetColumns: "target_columns",
} as const;

const T = { foreignKeys: "table_foreign_keys" } as const;

function treePath(engine: DbEngine, connectionName: string): string[] {
  if (engine === "postgresql") return [connectionName, "default", "public"];
  if (engine === "mysql") return [connectionName, "default"];
  return [connectionName];
}

function seedSql(
  engine: DbEngine,
  parentTable: string,
  childTable: string,
): string {
  if (engine === "postgresql") {
    return `
DROP TABLE IF EXISTS ${childTable};
DROP TABLE IF EXISTS ${parentTable};
CREATE TABLE ${parentTable} (
  id INT NOT NULL,
  org_id INT NOT NULL,
  PRIMARY KEY (id, org_id)
);
CREATE TABLE ${childTable} (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  org_id INT NOT NULL
);
    `.trim();
  }
  if (engine === "mysql") {
    return `
DROP TABLE IF EXISTS ${childTable};
DROP TABLE IF EXISTS ${parentTable};
CREATE TABLE ${parentTable} (
  id INT NOT NULL,
  org_id INT NOT NULL,
  PRIMARY KEY (id, org_id)
);
CREATE TABLE ${childTable} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  org_id INT NOT NULL
);
    `.trim();
  }
  return `
DROP TABLE IF EXISTS ${childTable};
DROP TABLE IF EXISTS ${parentTable};
CREATE TABLE ${parentTable} (
  id INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  PRIMARY KEY (id, org_id)
);
CREATE TABLE ${childTable} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  org_id INTEGER NOT NULL
);
  `.trim();
}

async function openEditTable(page: Page, tableName: string): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);
  await tree.runTreeAction(tableName, "Edit table");
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, "Edit table");
  await objectForm.waitForReady();
  return objectForm;
}

/**
 * Add multi-column FK on edit — same operation depth for every shipped engine.
 */
export function defineMultiColumnFkTests(engine: DbEngine): void {
  const label =
    engine === "postgresql"
      ? "PostgreSQL"
      : engine === "mysql"
        ? "MySQL"
        : "SQLite";

  test.describe(`Object Form ${label} multi-column FK`, () => {
    test("Add multi-column foreign key on edit", async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `e2e-mcfk-${suffix}`;
      const parentTable = `mcfk_parent_${suffix}`;
      const childTable = `mcfk_child_${suffix}`;
      const fkName = `fk_mcfk_${suffix}`;
      const path = treePath(engine, connectionName);

      let sqliteDbPath: string | undefined;
      if (engine === "sqlite") {
        sqliteDbPath = `/tmp/dbo-e2e-mcfk-${suffix}.db`;
        ensureSqliteDbFile(sqliteDbPath);
      }

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          const connectionPage = new ConnectionPage(page);
          const sqlEditor = new SqlEditorPage(page);
          const tree = new ObjectTreePage(page);

          await connectionPage.goto();
          await connectionPage.waitForReady();
          await connectionPage.setupConnection(
            getDbConfig(engine, connectionName, sqliteDbPath),
          );
          await sqlEditor.open();
          if (engine === "postgresql") {
            await sqlEditor.selectContext("default", "public");
          } else if (engine === "mysql") {
            await sqlEditor.selectContext("default");
          }
          await sqlEditor.typeAndRun(seedSql(engine, parentTable, childTable));

          await tree.expandPath(path);
          await tree.refreshExpandNode("Tables");

          const objectForm = await openEditTable(page, childTable);
          await objectForm.selectTab(T.foreignKeys);
          const existingRows = await page
            .getByTestId(/^object-form-delete-row-/)
            .count();
          await objectForm.addRow();
          const row = existingRows;
          await objectForm.fillArrayCell(row, F.fkName, fkName);
          await objectForm.selectArrayCellOption(row, F.fkTargetTable, parentTable);
          await objectForm.selectMultiSelectOptions(row, F.fkSourceColumns, [
            "user_id",
            "org_id",
          ]);
          await objectForm.selectMultiSelectOptions(row, F.fkTargetColumns, [
            "id",
            "org_id",
          ]);
          await objectForm.save();

          if (engine === "sqlite") {
            await objectForm.assertPreviewContains(
              /FOREIGN KEY[\s\S]*user_id[\s\S]*org_id|FOREIGN KEY[\s\S]*"user_id"[\s\S]*"org_id"/i,
            );
          } else {
            await objectForm.assertPreviewContains(/FOREIGN KEY/i);
            await objectForm.assertPreviewContains(/user_id/i);
            await objectForm.assertPreviewContains(/org_id/i);
          }
          await objectForm.assertPreviewContains(parentTable);
          await objectForm.confirmExecute();

          await expect(tree.getTreeNode(childTable)).toBeVisible({
            timeout: 15000,
          });

          await sqlEditor.open();
          await sqlEditor.typeAndRun(
            `DROP TABLE IF EXISTS ${childTable};\nDROP TABLE IF EXISTS ${parentTable};`,
          );
        } finally {
          if (sqliteDbPath) removeSqliteDbFile(sqliteDbPath);
        }
      });
    });
  });
}
