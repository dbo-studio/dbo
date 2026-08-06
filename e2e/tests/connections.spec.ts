import net from "node:net";
import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { API_DB_TIMEOUT, apiRoute, pendingResponse } from "../helpers/network";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../pages";

async function canReachHost(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

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
          // Edit form clears password; Test uses only what the user types (no secret reuse).
          await connectionPage.passwordInput.fill(config.password);
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

  test("Ping success returns diagnostics payload", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-diag-ok-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);
    const reachable = await canReachHost(config.host, Number(config.port));

    test.skip(
      !reachable,
      `Sample Postgres not reachable at ${config.host}:${config.port}. Run: docker compose -f docker-compose.dev.yml up -d sample-pgsql`,
    );

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step("Open PostgreSQL form and fill connection details", async () => {
      await connectionPage.openNewConnectionModal();
      await connectionPage.selectConnectionType("PostgreSQL");
      await connectionPage.fillConnectionForm(config);
    });

    await test.step("Test connection and verify diagnostics fields in response", async () => {
      const responsePromise = pendingResponse(page, apiRoute.connectionsPing, API_DB_TIMEOUT);
      await connectionPage.testConnectionButton.click();
      const response = await responsePromise;

      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        data?: {
          latencyMs?: number;
          serverVersion?: string;
          sslNegotiated?: boolean;
          sslMode?: string;
        };
      };

      expect(body.data?.latencyMs).toBeDefined();
      expect(typeof body.data?.latencyMs).toBe("number");
      expect((body.data?.latencyMs ?? -1) >= 0).toBeTruthy();
      expect(body.data?.serverVersion).toBeTruthy();
    });

    await test.step("Close form without creating a connection", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("heading", { name: "New connection" })).toBeHidden();
    });
  });

  test("Ping failure returns actionable network category", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-diag-fail-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step("Open PostgreSQL form and use unreachable port", async () => {
      await connectionPage.openNewConnectionModal();
      await connectionPage.selectConnectionType("PostgreSQL");
      await connectionPage.fillConnectionForm({
        ...config,
        port: "1",
      });
    });

    await test.step("Test connection and verify actionable error category", async () => {
      const responsePromise = pendingResponse(page, apiRoute.connectionsPing, API_DB_TIMEOUT);
      await connectionPage.testConnectionButton.click();
      const response = await responsePromise;

      expect(response.status()).toBe(400);

      const body = (await response.json()) as {
        code?: number;
        message?: string;
        data?: {
          category?: string;
          suggestion?: string;
          latencyMs?: number;
        };
      };

      expect(body.code).toBe(400);
      expect(body.data?.category).toBe("network");
      expect(body.data?.suggestion).toContain("Check host, port");
      expect(typeof body.data?.latencyMs).toBe("number");
    });

    await test.step("Close form", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("heading", { name: "New connection" })).toBeHidden();
    });
  });
});
