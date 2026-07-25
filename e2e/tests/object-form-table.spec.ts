import { test } from "@playwright/test";
import {
  CREATE_TABLE_SCENARIOS,
  EDIT_TABLE_SCENARIOS,
} from "../fixtures/objectFormScenarios";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  cleanupObjectFormTable,
  createTableViaObjectForm,
  editTableAddColumn,
  setupConnectionForEngine,
  setupObjectFormDatabase,
} from "../helpers/objectFormTable";
import { withConnectionCleanup } from "../helpers/safeCleanup";

for (const scenario of CREATE_TABLE_SCENARIOS) {
  test.describe(`Object Form [${scenario.engine}]`, () => {
    test("Create table via Object Form", async ({ page }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `object-form-${scenario.engine}-${suffix}`;
      const tableName = `e2e_obj_table_${suffix}`;
      const databaseName =
        scenario.engine === "postgresql" || scenario.engine === "mysql"
          ? `e2e_obj_db_${suffix}`
          : undefined;
      const sqlitePath =
        scenario.engine === "sqlite" ? `/tmp/dbo-e2e-${suffix}.db` : undefined;

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await setupConnectionForEngine(
            page,
            scenario.engine,
            connectionName,
            sqlitePath,
          );

          if (databaseName) {
            await setupObjectFormDatabase(
              page,
              scenario.engine,
              connectionName,
              databaseName,
            );
          }

          await test.step("Create table", async () => {
            await createTableViaObjectForm(
              page,
              connectionName,
              scenario,
              tableName,
              databaseName,
            );
          });

          await test.step("Cleanup", async () => {
            await cleanupObjectFormTable(page, connectionName, tableName, {
              databaseName,
              sqlitePath,
              engine: scenario.engine,
            });
          });
        } catch (err) {
          try {
            await cleanupObjectFormTable(page, connectionName, tableName, {
              databaseName,
              sqlitePath,
              engine: scenario.engine,
            });
          } catch (cleanupErr) {
            console.warn(
              "[e2e] object-form-table cleanup after failure:",
              cleanupErr,
            );
          }
          throw err;
        }
      });
    });
  });
}

for (const scenario of EDIT_TABLE_SCENARIOS) {
  test.describe(`Object Form edit [${scenario.engine}]`, () => {
    test("Add column via Edit table", async ({ page }, testInfo) => {
      const createScenario = CREATE_TABLE_SCENARIOS.find(
        (item) => item.engine === scenario.engine,
      );
      if (!createScenario) {
        throw new Error(`Missing create scenario for ${scenario.engine}`);
      }

      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `object-form-edit-${scenario.engine}-${suffix}`;
      const tableName = `e2e_obj_edit_${suffix}`;
      const newColumnName = "notes";
      const databaseName =
        scenario.engine === "postgresql" || scenario.engine === "mysql"
          ? `e2e_obj_db_${suffix}`
          : undefined;
      const sqlitePath =
        scenario.engine === "sqlite" ? `/tmp/dbo-e2e-${suffix}.db` : undefined;

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await setupConnectionForEngine(
            page,
            scenario.engine,
            connectionName,
            sqlitePath,
          );

          if (databaseName) {
            await setupObjectFormDatabase(
              page,
              scenario.engine,
              connectionName,
              databaseName,
            );
          }

          await test.step("Create base table", async () => {
            await createTableViaObjectForm(
              page,
              connectionName,
              createScenario,
              tableName,
              databaseName,
            );
          });

          await test.step("Add column", async () => {
            await editTableAddColumn(page, scenario, tableName, newColumnName);
          });

          await test.step("Cleanup", async () => {
            await cleanupObjectFormTable(page, connectionName, tableName, {
              databaseName,
              sqlitePath,
              engine: scenario.engine,
            });
          });
        } catch (err) {
          try {
            await cleanupObjectFormTable(page, connectionName, tableName, {
              databaseName,
              sqlitePath,
              engine: scenario.engine,
            });
          } catch (cleanupErr) {
            console.warn(
              "[e2e] object-form-edit cleanup after failure:",
              cleanupErr,
            );
          }
          throw err;
        }
      });
    });
  });
}
