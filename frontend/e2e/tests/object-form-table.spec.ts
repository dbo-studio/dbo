import { test } from '@playwright/test';
import { CREATE_TABLE_SCENARIOS, EDIT_TABLE_SCENARIOS } from '../fixtures/objectFormScenarios';
import { createTableViaObjectForm, editTableAddColumn, setupConnectionForEngine } from '../helpers/objectFormTable';

for (const scenario of CREATE_TABLE_SCENARIOS) {
  test.describe(`Object Form [${scenario.engine}]`, () => {
    test('Create table via Object Form', async ({ page }) => {
      const connectionName = `object-form-${scenario.engine}-${Date.now()}`;
      const tableName = `e2e_obj_table_${Date.now()}`;
      const connectionPage = await setupConnectionForEngine(page, scenario.engine, connectionName);

      await test.step('Create table', async () => {
        await createTableViaObjectForm(page, connectionName, scenario, tableName);
      });

      await test.step('Cleanup', async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });
}

for (const scenario of EDIT_TABLE_SCENARIOS) {
  test.describe(`Object Form edit [${scenario.engine}]`, () => {
    test('Add column via Edit table', async ({ page }) => {
      const createScenario = CREATE_TABLE_SCENARIOS.find((item) => item.engine === scenario.engine);
      if (!createScenario) {
        throw new Error(`Missing create scenario for ${scenario.engine}`);
      }

      const connectionName = `object-form-edit-${scenario.engine}-${Date.now()}`;
      const tableName = `e2e_obj_edit_${Date.now()}`;
      const newColumnName = 'notes';
      const connectionPage = await setupConnectionForEngine(page, scenario.engine, connectionName);

      await test.step('Create base table', async () => {
        await createTableViaObjectForm(page, connectionName, createScenario, tableName);
      });

      await test.step('Add column', async () => {
        await editTableAddColumn(page, scenario, tableName, newColumnName);
      });

      await test.step('Cleanup', async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });
}
