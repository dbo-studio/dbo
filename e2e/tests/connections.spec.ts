import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../pages";

/**
 * Connection Management Scenario
 *
 * Tests the full connection lifecycle using Page Object Model.
 */
test.describe("Connection Management", () => {
  const testPrefix = "conn-test";

  test("Create and delete a connection", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create a new connection", async () => {
        await connectionPage.createConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Activate connection", async () => {
        await connectionPage.activateConnection(connectionName);
        await expect(
          connectionPage.getConnectionHeading(connectionName),
        ).toBeVisible();
      });

      await test.step("Delete the connection", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Edit connection", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-edit-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);
    const editedName = `${connectionName}-edited`;

    await withConnectionCleanup(page, editedName, async () => {
      await withConnectionCleanup(page, connectionName, async () => {
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step("Create connection", async () => {
          await connectionPage.createConnection(config);
        });

        await test.step("Open edit dialog", async () => {
          await connectionPage.editConnection(connectionName);
          await expect(connectionPage.nameInput).toHaveValue(connectionName);
        });

        await test.step("Update connection name", async () => {
          await connectionPage.nameInput.fill(editedName);
          await connectionPage.testConnection();
          await connectionPage.submitConnection();
          await expect(
            connectionPage.getConnectionItem(editedName),
          ).toBeVisible();
        });

        await test.step("Cleanup", async () => {
          await connectionPage.deleteConnection(editedName);
        });
      });
    });
  });

  test("Refresh connection", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-refresh-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create and activate connection", async () => {
        await connectionPage.createConnection(config);
        await connectionPage.activateConnection(connectionName);
      });

      await test.step("Refresh connection via context menu", async () => {
        await connectionPage.refreshConnection(connectionName);
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Connection context menu options", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-menu-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create connection", async () => {
        await connectionPage.createConnection(config);
      });

      await test.step("Verify context menu options", async () => {
        await connectionPage.openContextMenu(connectionName);

        const menu = page.getByRole("menu");
        await expect(
          menu.getByRole("menuitem", { name: "Edit" }),
        ).toBeVisible();
        await expect(
          menu.getByRole("menuitem", { name: "Delete" }),
        ).toBeVisible();
        await expect(
          menu.getByRole("menuitem", { name: "Refresh" }),
        ).toBeVisible();

        await connectionPage.closeContextMenu();
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Create schema via SQL query", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);

    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `${testPrefix}-schema-${suffix}`;
    const schemaName = `e2e_schema_${suffix}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Open SQL editor", async () => {
        await sqlEditor.open();
      });

      await test.step("Create schema via SQL", async () => {
        await sqlEditor.typeAndRun(
          `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
        );
      });

      await test.step("Verify query result", async () => {
        await sqlEditor.expectQuerySucceeded(
          `CREATE SCHEMA IF NOT EXISTS ${schemaName}`,
        );
      });

      await test.step("Drop schema", async () => {
        await sqlEditor.typeAndRun(
          `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`,
        );
        await sqlEditor.expectQuerySucceeded("DROP SCHEMA IF");
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });
});
