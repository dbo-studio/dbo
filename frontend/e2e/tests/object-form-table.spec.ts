import { expect, test } from '@playwright/test';
import { getDbConfig } from '../fixtures/dbConfigs';
import { ConnectionPage, ObjectFormPage, ObjectTreePage } from '../pages';

/**
 * Object Form — table lifecycle (PostgreSQL)
 */
test.describe('Object Form [postgresql]', () => {
  const testPrefix = 'object-form-pg';

  test('Create table via Object Form', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const tree = new ObjectTreePage(page);
    const objectForm = new ObjectFormPage(page);

    const connectionName = `${testPrefix}-${Date.now()}`;
    const tableName = `e2e_obj_table_${Date.now()}`;
    const config = getDbConfig('postgresql', connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Open Create table form', async () => {
      await tree.expandPath([connectionName, 'default', 'public']);
      await tree.runTreeAction('Tables', 'Create table');
      await objectForm.waitForReady();
      await expect(objectForm.getTab('table')).toBeVisible();
    });

    await test.step('Fill table name', async () => {
      await objectForm.fillArrayCell(0, 'relname', tableName);
    });

    await test.step('Add column', async () => {
      await objectForm.selectTab('table_columns');
      await objectForm.addRow();
      await objectForm.fillArrayCell(0, 'column_name', 'id');
      await objectForm.selectArrayCellOption(0, 'data_type', 'integer');
    });

    await test.step('Preview and execute', async () => {
      await objectForm.save();
      await objectForm.assertPreviewContains(/CREATE TABLE/i);
      await objectForm.assertPreviewContains(tableName);
      await objectForm.confirmExecute();
    });

    await test.step('Verify table exists in tree', async () => {
      await tree.expandNode('Tables');
      await expect(tree.getTreeNode(tableName)).toBeVisible({ timeout: 15000 });
    });

    await test.step('Cleanup', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });
});
