import { test, type BrowserContext, type Page } from "@playwright/test";
import { sqliteLifecycleNames } from "../fixtures/sqliteObjectFormLifecycle";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  cleanupSqliteEditTable,
  editTableAddUniqueKey,
  editTableDropColumn,
  editTableDropForeignKey,
  editTableDropKey,
  editTableRename,
  editTableSetDefault,
  editTableSetNotNull,
} from "../helpers/objectFormSqliteEdit";
import {
  createPostsTable,
  createUsersTable,
  editUsersTableAddColumn,
  removeSqliteDbFile,
  setupSqliteConnection,
} from "../helpers/objectFormSqliteLifecycle";
import { safeDeleteConnection } from "../helpers/safeCleanup";

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("Object Form SQLite edit table", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof sqliteLifecycleNames>;
  let renamedUsersTable: string;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = sqliteLifecycleNames(uniqueTestSuffix(testInfo));
    renamedUsersTable = `${names.usersTable}_renamed`;
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupSqliteEditTable(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] sqlite edit-table cleanup after failure:",
            cleanupErr,
          );
          await safeDeleteConnection(page, names.connectionName);
          removeSqliteDbFile(names.dbPath);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect and create base tables", async () => {
    await setupSqliteConnection(page, names.connectionName, names.dbPath);
    await createUsersTable(page, names.connectionName, names.usersTable);
    await createPostsTable(
      page,
      names.connectionName,
      names.postsTable,
      names.usersTable,
      names.fkName,
    );
    await editUsersTableAddColumn(page, names.usersTable);
  });

  test("Set NOT NULL on email column", async () => {
    await editTableSetNotNull(page, names.usersTable, 1);
  });

  test("Set default on email column", async () => {
    await editTableSetDefault(page, names.usersTable, 1, "'unknown'");
  });

  test("Drop foreign key on posts table", async () => {
    await editTableDropForeignKey(page, names.postsTable);
  });

  test("Drop notes column on users table", async () => {
    await editTableDropColumn(page, names.usersTable, 2);
  });

  test("Rename users table", async () => {
    await editTableRename(page, names.usersTable, renamedUsersTable);
  });

  test("Add UNIQUE key on email column", async () => {
    await editTableAddUniqueKey(
      page,
      renamedUsersTable,
      "uniq_users_email",
      ["email"],
    );
  });

  test("Drop UNIQUE key on email column", async () => {
    await editTableDropKey(page, renamedUsersTable, 1);
  });

  test("Cleanup", async () => {
    await cleanupSqliteEditTable(page, names);
    cleanedUp = true;
  });
});
