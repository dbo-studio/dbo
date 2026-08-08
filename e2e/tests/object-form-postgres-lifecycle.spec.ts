import { test, type BrowserContext, type Page } from "@playwright/test";
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
import { safeDeleteConnection } from "../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL lifecycle", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof postgresLifecycleNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = postgresLifecycleNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupPostgresLifecycle(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] postgres lifecycle cleanup after failure:",
            cleanupErr,
          );
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect to PostgreSQL", async () => {
    await setupPostgresConnection(page, names.connectionName);
  });

  test("Create database", async () => {
    await createDatabase(page, names.connectionName, names.databaseName);
  });

  test("Create users table with primary key column", async () => {
    await createUsersTable(
      page,
      names.connectionName,
      names.databaseName,
      names.usersTable,
    );
  });

  test("Create posts table with foreign key", async () => {
    await createPostsTable(
      page,
      names.connectionName,
      names.databaseName,
      names.postsTable,
      names.usersTable,
    );
  });

  test("Create view", async () => {
    await createView(
      page,
      names.connectionName,
      names.databaseName,
      names.viewName,
      names.postsTable,
    );
  });

  test("Edit users table — add column", async () => {
    await editUsersTableAddColumn(page, names.usersTable);
  });

  test("Drop objects and connection", async () => {
    await cleanupPostgresLifecycle(page, names);
    cleanedUp = true;
  });
});
