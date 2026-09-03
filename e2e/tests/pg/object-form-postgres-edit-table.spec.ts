import { test, type BrowserContext, type Page } from "@playwright/test";
import { postgresLifecycleNames } from "../../fixtures/postgresObjectFormLifecycle";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  createDatabase,
  createPostsTable,
  createUsersTable,
  editUsersTableAddColumn,
  setupPostgresConnection,
} from "../../helpers/objectFormPostgresLifecycle";
import {
  cleanupPostgresEditTable,
  editTableAddForeignKey,
  editTableAddUniqueKey,
  editTableChangeColumnType,
  editTableComment,
  editTableDropColumn,
  editTableDropForeignKey,
  editTableDropKey,
  editTableEditForeignKey,
  editTableRename,
  editTableSetColumnComment,
  editTableSetDefault,
  editTableSetNotNull,
} from "../../helpers/objectFormPostgresExtended";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL edit table", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof postgresLifecycleNames>;
  let renamedUsersTable: string;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = postgresLifecycleNames(uniqueTestSuffix(testInfo));
    renamedUsersTable = `${names.usersTable}_renamed`;
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupPostgresEditTable(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] postgres edit-table cleanup after failure:",
            cleanupErr,
          );
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect and create base tables", async () => {
    await setupPostgresConnection(page, names.connectionName);
    await createDatabase(page, names.connectionName, names.databaseName);
    await createUsersTable(
      page,
      names.connectionName,
      names.databaseName,
      names.usersTable,
    );
    await createPostsTable(
      page,
      names.connectionName,
      names.databaseName,
      names.postsTable,
      names.usersTable,
    );
    await editUsersTableAddColumn(page, names.usersTable);
  });

  test("Set NOT NULL on email column", async () => {
    await editTableSetNotNull(page, names.usersTable, 1);
  });

  test("Set default on email column", async () => {
    await editTableSetDefault(page, names.usersTable, 1, "'unknown'");
  });

  test("Set comment on email column", async () => {
    await editTableSetColumnComment(
      page,
      names.usersTable,
      1,
      "user email address",
    );
  });

  test("Drop foreign key on posts table", async () => {
    await editTableDropForeignKey(page, names.postsTable);
  });

  test("Add foreign key on posts table (CASCADE)", async () => {
    await editTableAddForeignKey(
      page,
      names.postsTable,
      names.usersTable,
      `fk_posts_user_readd`,
    );
  });

  test("Edit foreign key rename + DEFERRABLE", async () => {
    await editTableEditForeignKey(page, names.postsTable, {
      newFkName: `fk_posts_user_edited`,
    });
  });

  test("Drop notes column on users table", async () => {
    await editTableDropColumn(page, names.usersTable, 2);
  });

  test("Rename users table", async () => {
    await editTableRename(page, names.usersTable, renamedUsersTable);
  });

  test("Set comment on users table", async () => {
    await editTableComment(page, renamedUsersTable, "application users");
  });

  test("Change email column type", async () => {
    await editTableChangeColumnType(
      page,
      renamedUsersTable,
      1,
      "character varying",
    );
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

  test("Cleanup — drop tables, database, and connection", async () => {
    await cleanupPostgresEditTable(page, names);
    cleanedUp = true;
  });
});
