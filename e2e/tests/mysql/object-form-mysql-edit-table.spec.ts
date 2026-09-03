import { test, type BrowserContext, type Page } from "@playwright/test";
import { mysqlLifecycleNames } from "../../fixtures/mysqlObjectFormLifecycle";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupMysqlEditTable,
  editTableAddForeignKey,
  editTableAddIndex,
  editTableAddUniqueKey,
  editTableChangeColumnType,
  editTableComment,
  editTableDropColumn,
  editTableDropForeignKey,
  editTableDropIndex,
  editTableDropKey,
  editTableEditForeignKey,
  editTableRename,
  editTableSetColumnComment,
  editTableSetDefault,
  editTableSetNotNull,
} from "../../helpers/objectFormMysqlEdit";
import {
  createDatabase,
  createPostsTable,
  createUsersTable,
  editUsersTableAddColumn,
  setupMysqlConnection,
} from "../../helpers/objectFormMysqlLifecycle";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial", timeout: 300_000 });

test.describe("Object Form MySQL edit table", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof mysqlLifecycleNames>;
  let renamedUsersTable: string;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = mysqlLifecycleNames(uniqueTestSuffix(testInfo));
    renamedUsersTable = `${names.usersTable}_renamed`;
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupMysqlEditTable(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] mysql edit-table cleanup after failure:",
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
    await setupMysqlConnection(page, names.connectionName);
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
      { fkName: names.fkName, indexName: names.indexName },
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
      `${names.fkName}_readd`,
    );
  });

  test("Edit foreign key rename + ON DELETE SET NULL", async () => {
    await editTableEditForeignKey(page, names.postsTable, {
      newFkName: `${names.fkName}_edited`,
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  });

  test("Drop index on posts table", async () => {
    // MySQL refuses DROP INDEX when the index backs an FK.
    await editTableDropForeignKey(page, names.postsTable);
    await editTableDropIndex(page, names.postsTable, 0);
  });

  test("Add index on posts table", async () => {
    await editTableAddIndex(
      page,
      names.postsTable,
      `${names.indexName}_readd`,
      ["user_id"],
    );
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
    await editTableChangeColumnType(page, renamedUsersTable, 1, "CHAR");
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
    await cleanupMysqlEditTable(page, names);
    cleanedUp = true;
  });
});
