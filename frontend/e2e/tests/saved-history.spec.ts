import { test } from '@playwright/test';
import { ConnectionPage, SidebarPage, SqlEditorPage } from '../pages';

/**
 * Saved Queries & History Scenario
 *
 * Tests saved queries and history functionality using Page Object Model.
 */
test.describe('Saved Queries & History', () => {
  const testPrefix = 'history-test';

  test('Query appears in history after execution', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-hist-${Date.now()}`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Open SQL editor and run query', async () => {
      await sqlEditor.open();
      await sqlEditor.typeAndRun('SELECT current_timestamp AS test_time;');
    });

    await test.step('Verify query in History', async () => {
      await sidebar.switchTo('History');
      await sidebar.expectItemVisible('SELECT current_timestamp');
    });

    await test.step('Cleanup', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });

  test('Save and manage saved queries', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-saved-${Date.now()}`;
    const uniqueMarker = `E2E_${Date.now()}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS test_marker;`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Open SQL editor and type query', async () => {
      await sqlEditor.open();
      await sqlEditor.typeQuery(uniqueQuery);
    });

    await test.step('Save the query', async () => {
      await sqlEditor.saveQuery();
    });

    await test.step('Verify query in Saved Queries tab', async () => {
      await sidebar.switchTo('Queries');
      await sidebar.expectItemVisible(uniqueMarker);
    });

    await test.step('Delete saved query', async () => {
      await sidebar.deleteItemFromContextMenu(uniqueMarker);
      await sidebar.expectItemHidden(uniqueMarker);
    });

    await test.step('Cleanup', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });

  test('Run query from saved queries', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-run-${Date.now()}`;
    const uniqueMarker = `RUN_TEST_${Date.now()}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS marker;`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Save a query', async () => {
      await sqlEditor.open();
      await sqlEditor.typeQuery(uniqueQuery);
      await sqlEditor.saveQuery();
    });

    await test.step('Run saved query from context menu', async () => {
      await sidebar.switchTo('Queries');
      await sidebar.runItemFromContextMenu(uniqueMarker);
      await sqlEditor.expectEditorContains(uniqueMarker);
    });

    await test.step('Cleanup saved query', async () => {
      await sidebar.switchTo('Queries');
      await sidebar.deleteItemFromContextMenu(uniqueMarker);
    });

    await test.step('Cleanup connection', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });

  test('Run query from history', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-histrun-${Date.now()}`;
    const uniqueMarker = `HIST_${Date.now()}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS history_test;`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Run a query to add to history', async () => {
      await sqlEditor.open();
      await sqlEditor.typeAndRun(uniqueQuery);
    });

    await test.step('Run query from History', async () => {
      await sidebar.switchTo('History');
      await sidebar.runItemFromContextMenu(uniqueMarker);
      await sqlEditor.expectEditorContains(uniqueMarker);
    });

    await test.step('Cleanup', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });

  test('Copy query from history', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-copy-${Date.now()}`;
    const uniqueMarker = `COPY_${Date.now()}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS copy_test;`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step('Setup connection', async () => {
      await connectionPage.setupConnection(config);
    });

    await test.step('Run a query', async () => {
      await sqlEditor.open();
      await sqlEditor.typeAndRun(uniqueQuery);
    });

    await test.step('Copy query from History', async () => {
      await sidebar.switchTo('History');
      await sidebar.copyItemFromContextMenu(uniqueMarker);
    });

    await test.step('Cleanup', async () => {
      await connectionPage.deleteConnection(connectionName);
    });
  });
});
