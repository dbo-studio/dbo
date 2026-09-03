import { test, type BrowserContext, type Page } from "@playwright/test";
import { mysqlLifecycleNames } from "../../fixtures/mysqlObjectFormLifecycle";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupMysqlLifecycle,
  createDatabase,
  createPostsTable,
  createUsersTable,
  createView,
  editUsersTableAddColumn,
  editViewQuery,
  setupMysqlConnection,
} from "../../helpers/objectFormMysqlLifecycle";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form MySQL lifecycle", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof mysqlLifecycleNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = mysqlLifecycleNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupMysqlLifecycle(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] mysql lifecycle cleanup after failure:",
            cleanupErr,
          );
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect to MySQL", async () => {
    await setupMysqlConnection(page, names.connectionName);
  });

  test("Create isolated database", async () => {
    await createDatabase(page, names.connectionName, names.databaseName);
  });

  test("Create users table with columns and primary key", async () => {
    await createUsersTable(
      page,
      names.connectionName,
      names.databaseName,
      names.usersTable,
    );
  });

  test("Create posts table with foreign key and index", async () => {
    await createPostsTable(
      page,
      names.connectionName,
      names.databaseName,
      names.postsTable,
      names.usersTable,
      { fkName: names.fkName, indexName: names.indexName },
    );
  });

  test("Create view", async () => {
    await createView(
      page,
      names.connectionName,
      names.databaseName,
      names.viewName,
      names.postsTable,
      names.usersTable,
    );
  });

  test("Edit users table — add column", async () => {
    await editUsersTableAddColumn(page, names.usersTable);
  });

  test("Edit view — change query", async () => {
    await editViewQuery(page, names.viewName, names.postsTable);
  });

  test("Drop objects and connection", async () => {
    await cleanupMysqlLifecycle(page, names);
    cleanedUp = true;
  });
});
