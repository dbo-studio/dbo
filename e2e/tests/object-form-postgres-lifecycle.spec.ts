import { test } from "@playwright/test";
import { postgresLifecycleNames } from "../fixtures/postgresObjectFormLifecycle";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  cleanupPostgresLifecycle,
  createDatabase,
  createPostsTable,
  createUsersTable,
  createView,
  editUsersTableAddColumn,
  setupPostgresConnection,
} from "../helpers/objectFormPostgresLifecycle";
import { withConnectionCleanup } from "../helpers/safeCleanup";

test.describe("Object Form PostgreSQL lifecycle", () => {
  test("Full create → edit → drop lifecycle", async ({ page }, testInfo) => {
    const names = postgresLifecycleNames(uniqueTestSuffix(testInfo));

    await withConnectionCleanup(page, names.connectionName, async () => {
      try {
        await test.step("Connect to PostgreSQL", async () => {
          await setupPostgresConnection(page, names.connectionName);
        });

        await test.step("Create database", async () => {
          await createDatabase(page, names.connectionName, names.databaseName);
        });

        await test.step("Create users table with primary key column", async () => {
          await createUsersTable(
            page,
            names.connectionName,
            names.databaseName,
            names.usersTable,
          );
        });

        await test.step("Create posts table with foreign key", async () => {
          await createPostsTable(
            page,
            names.connectionName,
            names.databaseName,
            names.postsTable,
            names.usersTable,
          );
        });

        await test.step("Create view", async () => {
          await createView(
            page,
            names.connectionName,
            names.databaseName,
            names.viewName,
            names.postsTable,
          );
        });

        await test.step("Edit users table — add column", async () => {
          await editUsersTableAddColumn(page, names.usersTable);
        });

        await test.step("Cleanup — drop all objects and connection", async () => {
          await cleanupPostgresLifecycle(page, names);
        });
      } catch (err) {
        try {
          await cleanupPostgresLifecycle(page, names);
        } catch (cleanupErr) {
          console.warn(
            "[e2e] postgres lifecycle cleanup after failure:",
            cleanupErr,
          );
        }
        throw err;
      }
    });
  });
});
