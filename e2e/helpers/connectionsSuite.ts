import net from "node:net";
import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { API_DB_TIMEOUT, apiRoute, pendingResponse } from "./network";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "./objectFormSqliteLifecycle";
import { withConnectionCleanup } from "./safeCleanup";
import { ConnectionPage, SqlEditorPage } from "../pages";

async function canReachHost(
  host: string,
  port: number,
  timeoutMs = 1500,
): Promise<boolean> {
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

function engineLabel(engine: DbEngine): string {
  if (engine === "postgresql") return "PostgreSQL";
  if (engine === "mysql") return "MySQL";
  return "SQLite";
}

function connectionType(engine: DbEngine): "PostgreSQL" | "MySQL" | "SQLite" {
  return engineLabel(engine) as "PostgreSQL" | "MySQL" | "SQLite";
}

/**
 * Same connection CRUD depth as PostgreSQL for every shipped engine.
 */
export function defineConnectionsTests(engine: DbEngine): void {
  const label = engineLabel(engine);
  const testPrefix = `conn-${engine === "postgresql" ? "pg" : engine}`;

  test.describe(`Connection Management ${label}`, () => {
    test("Create and delete a connection", async ({ page }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const connectionName = `${testPrefix}-${uniqueTestSuffix(testInfo)}`;
      const sqlitePath =
        engine === "sqlite"
          ? `/tmp/dbo-e2e-conn-${uniqueTestSuffix(testInfo)}.db`
          : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Create a new connection", async () => {
            await connectionPage.createConnection(config);
            await expect(
              connectionPage.getConnectionItem(connectionName),
            ).toBeVisible();
          });

          await test.step("Activate connection", async () => {
            await connectionPage.activateConnection(
              connectionName,
              config.password || "secret",
            );
            await connectionPage.expectConnectionActive(connectionName);
          });

          await test.step("Delete the connection", async () => {
            await connectionPage.deleteConnection(connectionName);
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    test("Edit connection", async ({ page }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-edit-${suffix}`;
      const editedName = `${connectionName}-edited`;
      const sqlitePath =
        engine === "sqlite" ? `/tmp/dbo-e2e-conn-edit-${suffix}.db` : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, editedName, async () => {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
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
              if (engine !== "sqlite") {
                await connectionPage.passwordInput.fill(config.password);
              }
              await connectionPage.testConnection();
              await connectionPage.submitConnection();
              await expect(
                connectionPage.getConnectionItem(editedName),
              ).toBeVisible();
            });

            await test.step("Cleanup", async () => {
              await connectionPage.deleteConnection(editedName);
            });
          } finally {
            if (sqlitePath) removeSqliteDbFile(sqlitePath);
          }
        });
      });
    });

    test("Duplicate connection prefills create form", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-dup-src-${suffix}`;
      const duplicatedName = `${testPrefix}-dup-new-${suffix}`;
      const sqlitePath =
        engine === "sqlite" ? `/tmp/dbo-e2e-conn-dup-${suffix}.db` : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, duplicatedName, async () => {
        await withConnectionCleanup(page, connectionName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Create source connection", async () => {
              await connectionPage.createConnection(config);
            });

            await test.step("Open duplicate form from context menu", async () => {
              await connectionPage.duplicateConnection(connectionName);
              await expect(connectionPage.nameInput).toHaveValue(connectionName);
              if (engine === "sqlite") {
                await expect(page.locator('input[name="path"]')).toHaveValue(
                  config.host,
                );
              } else {
                await expect(connectionPage.hostInput).toHaveValue(config.host);
                await expect(connectionPage.portInput).toHaveValue(config.port);
                await expect(connectionPage.usernameInput).toHaveValue(
                  config.username,
                );
              }
            });

            await test.step("Create duplicated connection with new name", async () => {
              await connectionPage.nameInput.fill(duplicatedName);
              if (engine !== "sqlite") {
                await connectionPage.passwordInput.fill(config.password);
              }
              await connectionPage.submitConnection();
              await expect(
                connectionPage.getConnectionItem(duplicatedName),
              ).toBeVisible();
            });

            await test.step("Cleanup", async () => {
              await connectionPage.deleteConnection(duplicatedName);
              await connectionPage.deleteConnection(connectionName);
            });
          } finally {
            if (sqlitePath) removeSqliteDbFile(sqlitePath);
          }
        });
      });
    });

    test("Reorder connections by vertical drag", async ({ page }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const firstName = `${testPrefix}-sort-a-${suffix}`;
      const secondName = `${testPrefix}-sort-b-${suffix}`;
      const sqlitePathA =
        engine === "sqlite" ? `/tmp/dbo-e2e-conn-sa-${suffix}.db` : undefined;
      const sqlitePathB =
        engine === "sqlite" ? `/tmp/dbo-e2e-conn-sb-${suffix}.db` : undefined;
      if (sqlitePathA) ensureSqliteDbFile(sqlitePathA);
      if (sqlitePathB) ensureSqliteDbFile(sqlitePathB);
      const firstConfig = getDbConfig(engine, firstName, sqlitePathA);
      const secondConfig = getDbConfig(engine, secondName, sqlitePathB);

      await withConnectionCleanup(page, secondName, async () => {
        await withConnectionCleanup(page, firstName, async () => {
          try {
            await connectionPage.goto();
            await connectionPage.waitForReady();

            await test.step("Create two connections", async () => {
              await connectionPage.createConnection(firstConfig);
              await connectionPage.createConnection(secondConfig);
            });

            await test.step("Drag second connection above the first", async () => {
              const before = connectionPage.getConnectionItems();
              await expect(before).toHaveCount(2);
              await expect(before.nth(0)).toHaveAttribute(
                "data-testid",
                `connection-item-${firstName}`,
              );
              await expect(before.nth(1)).toHaveAttribute(
                "data-testid",
                `connection-item-${secondName}`,
              );

              await connectionPage.reorderConnection(secondName, firstName);

              const after = connectionPage.getConnectionItems();
              await expect(after.nth(0)).toHaveAttribute(
                "data-testid",
                `connection-item-${secondName}`,
              );
              await expect(after.nth(1)).toHaveAttribute(
                "data-testid",
                `connection-item-${firstName}`,
              );
            });

            await test.step("Cleanup", async () => {
              await connectionPage.deleteConnection(secondName);
              await connectionPage.deleteConnection(firstName);
            });
          } finally {
            if (sqlitePathA) removeSqliteDbFile(sqlitePathA);
            if (sqlitePathB) removeSqliteDbFile(sqlitePathB);
          }
        });
      });
    });

    test("Refresh connection", async ({ page }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-refresh-${suffix}`;
      const sqlitePath =
        engine === "sqlite"
          ? `/tmp/dbo-e2e-conn-refresh-${suffix}.db`
          : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
          await connectionPage.goto();
          await connectionPage.waitForReady();

          await test.step("Create and activate connection", async () => {
            await connectionPage.createConnection(config);
            await connectionPage.activateConnection(
              connectionName,
              config.password || "secret",
            );
          });

          await test.step("Refresh connection via context menu", async () => {
            await connectionPage.refreshConnection(connectionName);
          });

          await test.step("Cleanup", async () => {
            await connectionPage.deleteConnection(connectionName);
          });
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    test("Connection context menu options", async ({ page }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-menu-${suffix}`;
      const sqlitePath =
        engine === "sqlite" ? `/tmp/dbo-e2e-conn-menu-${suffix}.db` : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      await withConnectionCleanup(page, connectionName, async () => {
        try {
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
              menu.getByRole("menuitem", { name: "Duplicate" }),
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
        } finally {
          if (sqlitePath) removeSqliteDbFile(sqlitePath);
        }
      });
    });

    if (engine === "postgresql") {
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
    }

    test("Ping success returns diagnostics payload", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-diag-ok-${suffix}`;
      const sqlitePath =
        engine === "sqlite"
          ? `/tmp/dbo-e2e-conn-ping-ok-${suffix}.db`
          : undefined;
      if (sqlitePath) ensureSqliteDbFile(sqlitePath);
      const config = getDbConfig(engine, connectionName, sqlitePath);

      if (engine !== "sqlite") {
        const reachable = await canReachHost(
          config.host,
          Number(config.port),
        );
        test.skip(
          !reachable,
          `Sample ${label} not reachable at ${config.host}:${config.port}`,
        );
      }

      try {
        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step(`Open ${label} form and fill connection details`, async () => {
          await connectionPage.openNewConnectionModal();
          await connectionPage.selectConnectionType(connectionType(engine));
          await connectionPage.fillConnectionForm(config);
        });

        await test.step("Test connection and verify diagnostics fields in response", async () => {
          const responsePromise = pendingResponse(
            page,
            apiRoute.connectionsPing,
            API_DB_TIMEOUT,
          );
          await connectionPage.testConnectionButton.click();
          const response = await responsePromise;

          expect(response.status()).toBe(200);

          const body = (await response.json()) as {
            data?: {
              latencyMs?: number;
              serverVersion?: string;
            };
          };

          expect(body.data?.latencyMs).toBeDefined();
          expect(typeof body.data?.latencyMs).toBe("number");
          expect((body.data?.latencyMs ?? -1) >= 0).toBeTruthy();
          expect(body.data?.serverVersion).toBeTruthy();
        });

        await test.step("Close form without creating a connection", async () => {
          await page.getByRole("button", { name: "Cancel" }).click();
          await expect(
            page.getByRole("heading", { name: "New connection" }),
          ).toBeHidden();
        });
      } finally {
        if (sqlitePath) removeSqliteDbFile(sqlitePath);
      }
    });

    test("Ping failure returns actionable network category", async ({
      page,
    }, testInfo) => {
      const connectionPage = new ConnectionPage(page);
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `${testPrefix}-diag-fail-${suffix}`;

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step(`Open ${label} form with bad endpoint`, async () => {
        await connectionPage.openNewConnectionModal();
        await connectionPage.selectConnectionType(connectionType(engine));
        if (engine === "sqlite") {
          await connectionPage.fillConnectionForm(
            getDbConfig(
              engine,
              connectionName,
              `/tmp/dbo-e2e-missing-${suffix}-no-such.db`,
            ),
          );
        } else {
          const config = getDbConfig(engine, connectionName);
          await connectionPage.fillConnectionForm({
            ...config,
            port: "1",
          });
        }
      });

      await test.step("Test connection and verify actionable error category", async () => {
        const responsePromise = pendingResponse(
          page,
          apiRoute.connectionsPing,
          API_DB_TIMEOUT,
        );
        await connectionPage.testConnectionButton.click();
        const response = await responsePromise;

        expect(response.status()).toBe(400);

        const body = (await response.json()) as {
          code?: number;
          data?: {
            category?: string;
            suggestion?: string;
            latencyMs?: number;
          };
        };

        expect(body.code).toBe(400);
        expect(body.data?.category).toBeTruthy();
        expect(typeof body.data?.latencyMs).toBe("number");
      });

      await test.step("Close form", async () => {
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(
          page.getByRole("heading", { name: "New connection" }),
        ).toBeHidden();
      });
    });
  });
}
