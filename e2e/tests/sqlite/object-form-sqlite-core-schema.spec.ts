import { test, type BrowserContext, type Page } from "@playwright/test";
import { sqliteCoreSchemaNames } from "../../fixtures/sqliteCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addCheck,
  addCheckWithBadExpressionRejected,
  addIndex,
  addTrigger,
  addTriggerWithoutBodyRejected,
  cleanupSqliteCoreSchema,
  dropCheck,
  dropIndex,
  dropTrigger,
  editCheckExpression,
  editTriggerBody,
  expectCheckLoaded,
  expectIndexLoaded,
  expectNoChecks,
  expectNoIndexes,
  expectNoTriggers,
  expectTriggerLoaded,
  makeIndexUnique,
} from "../../helpers/objectFormSqliteCoreSchema";
import {
  createUsersTable,
  removeSqliteDbFile,
  setupSqliteConnection,
} from "../../helpers/objectFormSqliteLifecycle";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("Object Form SQLite indexes, triggers and checks", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof sqliteCoreSchemaNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = sqliteCoreSchemaNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupSqliteCoreSchema(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn("[e2e] sqlite core schema cleanup after failure:", cleanupErr);
          await safeDeleteConnection(page, names.connectionName);
          removeSqliteDbFile(names.dbPath);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect and create users table", async () => {
    await setupSqliteConnection(page, names.connectionName, names.dbPath);
    await createUsersTable(page, names.connectionName, names.usersTable);
  });

  test("Add an index in place and load it back", async () => {
    await addIndex(page, names.usersTable, names.indexName);
    await expectIndexLoaded(page, names.usersTable, names.indexName, false);
  });

  test("Make the index unique", async () => {
    await makeIndexUnique(page, names.usersTable);
    await expectIndexLoaded(page, names.usersTable, names.indexName, true);
  });

  test("Trigger without a body is rejected", async () => {
    await addTriggerWithoutBodyRejected(page, names.usersTable);
  });

  test("Add a trigger in place and load it back", async () => {
    await addTrigger(page, names.usersTable, names.triggerName);
    await expectTriggerLoaded(page, names.usersTable, names.triggerName, /lower\(NEW\.email\)/i);
  });

  test("Edit the trigger body", async () => {
    await editTriggerBody(page, names.usersTable);
    await expectTriggerLoaded(page, names.usersTable, names.triggerName, /upper\(NEW\.email\)/i);
  });

  test("Check with a multi-statement expression is rejected", async () => {
    await addCheckWithBadExpressionRejected(page, names.usersTable);
  });

  test("Add a check; the table is recreated and keeps the index and trigger", async () => {
    await addCheck(page, names.usersTable, names.checkName);
    await expectCheckLoaded(page, names.usersTable, names.checkName, "length(email) > 3");
    await expectIndexLoaded(page, names.usersTable, names.indexName, true);
    await expectTriggerLoaded(page, names.usersTable, names.triggerName, /upper\(NEW\.email\)/i);
  });

  test("Edit the check expression", async () => {
    await editCheckExpression(page, names.usersTable, "length(email) > 5");
    await expectCheckLoaded(page, names.usersTable, names.checkName, "length(email) > 5");
  });

  test("Drop the check; the index and trigger survive again", async () => {
    await dropCheck(page, names.usersTable);
    await expectNoChecks(page, names.usersTable);
    await expectIndexLoaded(page, names.usersTable, names.indexName, true);
    await expectTriggerLoaded(page, names.usersTable, names.triggerName, /upper\(NEW\.email\)/i);
  });

  test("Drop the trigger", async () => {
    await dropTrigger(page, names.usersTable);
    await expectNoTriggers(page, names.usersTable);
  });

  test("Drop the index", async () => {
    await dropIndex(page, names.usersTable);
    await expectNoIndexes(page, names.usersTable);
  });

  test("Cleanup", async () => {
    await cleanupSqliteCoreSchema(page, names);
    cleanedUp = true;
  });
});
