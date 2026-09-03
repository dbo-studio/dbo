import { test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SidebarPage, SqlEditorPage } from "../../pages";

/**
 * Saved Queries & History Scenario
 *
 * Tests saved queries and history functionality using Page Object Model.
 */
test.describe("Saved Queries & History", () => {
  const testPrefix = "history-test";

  test("Query appears in history after execution", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-hist-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Open SQL editor and run query", async () => {
        await sqlEditor.open();
        await sqlEditor.selectContext("default", "public");
        await sqlEditor.typeAndRun("SELECT current_timestamp AS test_time;");
      });

      await test.step("Verify query in History", async () => {
        await sidebar.switchTo("History");
        await sidebar.expectItemVisible("SELECT current_timestamp AS test_time");
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Save and manage saved queries", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-saved-${uniqueTestSuffix(testInfo)}`;
    const uniqueMarker = `E2E_${uniqueTestSuffix(testInfo)}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS test_marker;`;
    // Backend names unnamed saved queries from the first 20 chars of the SQL.
    const savedQueryLabel = uniqueQuery.slice(0, 20);
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Open SQL editor and type query", async () => {
        await sqlEditor.open();
        await sqlEditor.typeQuery(uniqueQuery);
      });

      await test.step("Save the query", async () => {
        await sqlEditor.saveQuery();
      });

      await test.step("Verify query in Saved Queries tab", async () => {
        await sidebar.switchTo("Queries");
        await sidebar.expectItemVisible(savedQueryLabel);
      });

      await test.step("Delete saved query", async () => {
        await sidebar.deleteItemFromContextMenu(savedQueryLabel);
        await sidebar.expectItemHidden(savedQueryLabel);
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Run query from saved queries", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-run-${uniqueTestSuffix(testInfo)}`;
    const uniqueMarker = `RUN_TEST_${uniqueTestSuffix(testInfo)}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS marker;`;
    const savedQueryLabel = uniqueQuery.slice(0, 20);
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Save a query", async () => {
        await sqlEditor.open();
        await sqlEditor.typeQuery(uniqueQuery);
        await sqlEditor.saveQuery();
      });

      await test.step("Run saved query from context menu", async () => {
        await sidebar.switchTo("Queries");
        await sidebar.runItemFromContextMenu(savedQueryLabel);
        await sqlEditor.expectEditorContains(uniqueMarker);
      });

      await test.step("Cleanup saved query", async () => {
        await sidebar.switchTo("Queries");
        await sidebar.deleteItemFromContextMenu(savedQueryLabel);
      });

      await test.step("Cleanup connection", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Run query from history", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-histrun-${uniqueTestSuffix(testInfo)}`;
    const uniqueMarker = `HIST_${uniqueTestSuffix(testInfo)}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS history_test;`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Run a query to add to history", async () => {
        await sqlEditor.open();
        await sqlEditor.typeAndRun(uniqueQuery);
      });

      await test.step("Run query from History", async () => {
        await sidebar.switchTo("History");
        await sidebar.runItemFromContextMenu(uniqueMarker);
        await sqlEditor.expectEditorContains(uniqueMarker);
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Copy query from history", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const sidebar = new SidebarPage(page);

    const connectionName = `${testPrefix}-copy-${uniqueTestSuffix(testInfo)}`;
    const uniqueMarker = `COPY_${uniqueTestSuffix(testInfo)}`;
    const uniqueQuery = `SELECT '${uniqueMarker}' AS copy_test;`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Run a query", async () => {
        await sqlEditor.open();
        await sqlEditor.typeAndRun(uniqueQuery);
      });

      await test.step("Copy query from History", async () => {
        await sidebar.switchTo("History");
        await sidebar.copyItemFromContextMenu(uniqueMarker);
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });
});
