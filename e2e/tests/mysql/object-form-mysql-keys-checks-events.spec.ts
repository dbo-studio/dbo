import { test, type BrowserContext, type Page } from "@playwright/test";
import { mysqlCoreSchemaNames } from "../../fixtures/mysqlCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addCheck,
  addCheckWithBadExpressionRejected,
  addUniqueKey,
  cleanupMysqlCoreSchema,
  createEvent,
  createEventRejected,
  dropEvent,
  editEventBody,
  expectEventLoaded,
  rescheduleAndRenameEvent,
  dropCheck,
  dropUniqueKey,
  editCheckExpression,
  editCheckRejectedByDb,
  expectCheckLoaded,
  expectNoChecks,
  expectOnlyPrimaryKey,
  expectUniqueKeyLoaded,
  renameUniqueKey,
  setupMysqlCoreSchema,
} from "../../helpers/objectFormMysqlCoreSchema";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form MySQL unique keys, checks and events", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof mysqlCoreSchemaNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = mysqlCoreSchemaNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupMysqlCoreSchema(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn("[e2e] mysql keys/checks cleanup after failure:", cleanupErr);
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect and create users table", async () => {
    await setupMysqlCoreSchema(page, names);
  });

  test("UNIQUE key round-trips through the Keys tab", async () => {
    await addUniqueKey(page, names.usersTable, "uq_email");
    await expectUniqueKeyLoaded(page, names.usersTable, "uq_email");
  });

  test("Rename the UNIQUE key", async () => {
    await renameUniqueKey(page, names.usersTable, "uq_email", "uq_email_renamed");
    await expectUniqueKeyLoaded(page, names.usersTable, "uq_email_renamed");
  });

  test("Drop the UNIQUE key", async () => {
    await dropUniqueKey(page, names.usersTable);
    await expectOnlyPrimaryKey(page, names.usersTable);
  });

  test("Check with a multi-statement expression is rejected", async () => {
    await addCheckWithBadExpressionRejected(page, names.usersTable);
  });

  test("Add a check and load it back", async () => {
    await addCheck(page, names.usersTable, "chk_email");
    await expectCheckLoaded(page, names.usersTable, "chk_email", /char_length\(.*email.*\)\s*>\s*3/i);
  });

  test("Edit the check expression", async () => {
    await editCheckExpression(page, names.usersTable, "CHAR_LENGTH(email) > 5");
    await expectCheckLoaded(page, names.usersTable, "chk_email", /char_length\(.*email.*\)\s*>\s*5/i);
  });

  test("A check edit MySQL rejects keeps the original check", async () => {
    await editCheckRejectedByDb(page, names.usersTable);
    await expectCheckLoaded(page, names.usersTable, "chk_email", /char_length\(.*email.*\)\s*>\s*5/i);
  });

  test("Drop the check", async () => {
    await dropCheck(page, names.usersTable);
    await expectNoChecks(page, names.usersTable);
  });

  test("Event with a bad schedule or no body is rejected", async () => {
    await createEventRejected(page, names, "NEVER", "SELECT 1", /schedule must start with EVERY or AT/i);
    await createEventRejected(page, names, "EVERY 1 DAY", "", /body is required/i);
  });

  test("Create an event and load it back", async () => {
    await createEvent(page, names, names.eventName);
    await expectEventLoaded(page, names.eventName, /EVERY 1 DAY/i, /LOWER\(email\)/i);
  });

  test("Edit only the event body", async () => {
    await editEventBody(page, names.eventName);
  });

  test("Reschedule and rename the event", async () => {
    await rescheduleAndRenameEvent(page, names.eventName, names.renamedEventName);
    await expectEventLoaded(page, names.renamedEventName, /EVERY 2 DAY/i, /UPPER\(email\)/i);
  });

  test("Drop the event", async () => {
    await dropEvent(page, names.renamedEventName);
  });

  test("Cleanup", async () => {
    await cleanupMysqlCoreSchema(page, names);
    cleanedUp = true;
  });
});
