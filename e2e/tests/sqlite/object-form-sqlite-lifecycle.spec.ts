import { test, type BrowserContext, type Page } from "@playwright/test";
import { sqliteLifecycleNames } from "../../fixtures/sqliteObjectFormLifecycle";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupSqliteLifecycle,
  createPostsTable,
  createUsersTable,
  createView,
  editUsersTableAddColumn,
  editViewQuery,
  setupSqliteConnection,
} from "../../helpers/objectFormSqliteLifecycle";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form SQLite lifecycle", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof sqliteLifecycleNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = sqliteLifecycleNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupSqliteLifecycle(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] sqlite lifecycle cleanup after failure:",
            cleanupErr,
          );
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect to SQLite", async () => {
    await setupSqliteConnection(page, names.connectionName, names.dbPath);
  });

  test("Create users table with columns and primary key", async () => {
    await createUsersTable(page, names.connectionName, names.usersTable);
  });

  test("Create posts table with foreign key", async () => {
    await createPostsTable(
      page,
      names.connectionName,
      names.postsTable,
      names.usersTable,
      names.fkName,
    );
  });

  test("Create view", async () => {
    await createView(
      page,
      names.connectionName,
      names.viewName,
      names.postsTable,
    );
  });

  test("Edit users table — add column", async () => {
    await editUsersTableAddColumn(page, names.usersTable);
  });

  test("Edit view — change query", async () => {
    await editViewQuery(page, names.viewName, names.postsTable);
  });

  test("Drop objects and connection", async () => {
    await cleanupSqliteLifecycle(page, names);
    cleanedUp = true;
  });
});
