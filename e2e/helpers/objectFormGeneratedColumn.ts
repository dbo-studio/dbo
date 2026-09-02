import { expect, test, type Page } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";
import {
  ConnectionPage,
  ObjectFormPage,
  ObjectTreePage,
  SqlEditorPage,
} from "../pages";

const T = { columns: "table_columns" } as const;

function treePath(engine: DbEngine, connectionName: string): string[] {
  if (engine === "postgresql") return [connectionName, "default", "public"];
  if (engine === "mysql") return [connectionName, "default"];
  return [connectionName];
}

function seedSql(tableName: string): string {
  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INTEGER PRIMARY KEY,
  amount INTEGER NOT NULL
);
  `.trim();
}

async function openEditTable(
  page: Page,
  tableName: string,
): Promise<ObjectFormPage> {
  const tree = new ObjectTreePage(page);
  const objectForm = new ObjectFormPage(page);
  await tree.runTreeAction(tableName, "Edit table");
  await objectForm.waitForReady();
  await objectForm.ensureWorkspaceTab(tableName, "Edit table");
  await objectForm.waitForReady();
  return objectForm;
}

export function defineGeneratedColumnTests(engine: DbEngine): void {
  const label =
    engine === "postgresql" ? "PostgreSQL" : engine === "mysql" ? "MySQL" : "SQLite";

  test.describe(`Object Form ${label} generated column`, () => {
    test("Add generated column on edit", async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `e2e-gen-col-${suffix}`;
      const tableName = `gen_base_${suffix}`;
      const genCol = `double_amount`;
      const path = treePath(engine, connectionName);

      let sqliteDbPath: string | undefined;
      if (engine === "sqlite") {
        sqliteDbPath = `/tmp/dbo-e2e-gen-${suffix}.db`;
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
          await sqlEditor.typeAndRun(seedSql(tableName));

          await tree.expandPath(path);
          await tree.refreshExpandNode("Tables");
          await expect(tree.getTreeNode(tableName)).toBeVisible({
            timeout: 15000,
          });

          const objectForm = await openEditTable(page, tableName);
          await objectForm.selectTab(T.columns);

          if (engine === "postgresql") {
            const rowIndex = await objectForm.addArrayRow("column_name");
            await objectForm.fillArrayCell(rowIndex, "column_name", genCol);
            await objectForm.selectArrayCellOption(
              rowIndex,
              "data_type",
              "integer",
            );
            await objectForm.toggleArrayCheckbox(
              rowIndex,
              "is_generated",
              true,
            );
            await objectForm.fillArrayCell(
              rowIndex,
              "column_default",
              "amount * 2",
            );
            await objectForm.save();
            await objectForm.assertPreviewContains(
              /ADD COLUMN[\s\S]*GENERATED ALWAYS AS[\s\S]*STORED/i,
            );
            await objectForm.assertPreviewContains(genCol);
            await objectForm.assertPreviewContains("amount * 2");
          } else {
            const rowIndex = await objectForm.addArrayRow("name");
            await objectForm.fillArrayCell(rowIndex, "name", genCol);
            await objectForm.selectArrayCellOption(rowIndex, "type", "INTEGER");
            await objectForm.selectArrayCellOption(
              rowIndex,
              "column_kind",
              "Generated Virtual",
            );
            await objectForm.fillArrayCell(
              rowIndex,
              "dflt_value",
              "amount * 2",
            );
            await objectForm.save();
            await objectForm.assertPreviewContains(
              /CREATE TABLE[\s\S]*GENERATED ALWAYS AS[\s\S]*VIRTUAL[\s\S]*INSERT INTO/i,
            );
            await objectForm.assertPreviewContains(genCol);
            await objectForm.assertPreviewContains("amount * 2");
          }

          await objectForm.confirmExecute();
          await expect(tree.getTreeNode(tableName)).toBeVisible({
            timeout: 15000,
          });

          await sqlEditor.open();
          await sqlEditor.typeAndRun(`DROP TABLE IF EXISTS ${tableName};`);
        } finally {
          if (sqliteDbPath) removeSqliteDbFile(sqliteDbPath);
        }
      });
    });
  });
}
