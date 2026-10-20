import { test, type BrowserContext, type Page } from "@playwright/test";
import {
  postgresCoreSchemaNames,
  PG_CORE_ERRORS as E,
  PG_CORE_PREVIEW as P,
  PG_CORE_TABS as T,
} from "../../fixtures/postgresCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addEnumColumn,
  addEnumValue,
  addTableSequence,
  cleanupPgCoreSchema,
  createEnumType,
  createSequence,
  createSequenceRejected,
  dropEnumType,
  dropFirstRowOfTab,
  dropSequence,
  editEnumValuesRejected,
  editSequenceIncrement,
  expectDoubleClickOpensEdit,
  expectEnumValues,
  expectSequenceIncrement,
  expectTabEmpty,
  expectTableSequenceLoaded,
  setupPgCoreSchema,
} from "../../helpers/objectFormPostgresCoreSchema";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL sequences and enum types", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof postgresCoreSchemaNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = postgresCoreSchemaNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupPgCoreSchema(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn("[e2e] postgres sequences/types cleanup after failure:", cleanupErr);
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect and create users table", async () => {
    await setupPgCoreSchema(page, names);
  });

  test("Create standalone sequence and edit it", async () => {
    await test.step("create sequence (start 10, increment 5)", async () => {
      await createSequence(page, names, names.sequenceName);
    });
    await test.step("double-click opens the edit form with stored values", async () => {
      await expectDoubleClickOpensEdit(page, names.sequenceName, T.sequence, "name", names.sequenceName);
    });
    await test.step("change increment to 7", async () => {
      await editSequenceIncrement(page, names.sequenceName);
    });
    await test.step("reopen: increment is 7", async () => {
      await expectSequenceIncrement(page, names.sequenceName, "7");
    });
  });

  test("Sequence with a non-numeric increment is rejected", async () => {
    await createSequenceRejected(page, names, `${names.sequenceName}_bad`, E.badSequenceNumber);
  });

  test("Drop standalone sequence via tree", async () => {
    await dropSequence(page, names.sequenceName);
  });

  test("Add table-owned sequence from the table design page", async () => {
    await test.step("add sequence owned by users.id", async () => {
      await addTableSequence(page, names.usersTable, names.tableSequenceName);
    });
    await test.step("reopen: sequence is loaded with its owner column", async () => {
      await expectTableSequenceLoaded(page, names.usersTable, names.tableSequenceName);
    });
  });

  test("Drop table-owned sequence from the table design page", async () => {
    await test.step("delete the sequence row", async () => {
      await dropFirstRowOfTab(page, names.usersTable, T.tableSequences, P.dropSequence);
    });
    await test.step("reopen: no sequences left", async () => {
      await expectTabEmpty(page, names.usersTable, T.tableSequences, "name");
    });
  });

  test("Create enum type and append a value", async () => {
    await test.step("create enum (sad, ok)", async () => {
      await createEnumType(page, names, names.enumName);
    });
    await test.step("double-click opens the edit form with stored values", async () => {
      await expectDoubleClickOpensEdit(page, names.enumName, T.type, "name", names.enumName);
    });
    await test.step("append happy", async () => {
      await addEnumValue(page, names.enumName);
    });
    await test.step("reopen: values keep their order", async () => {
      await expectEnumValues(page, names.enumName, "sad, ok, happy");
    });
  });

  test("Removing or reordering enum values is rejected", async () => {
    await test.step("removing a label is refused", async () => {
      await editEnumValuesRejected(page, names.enumName, "sad, happy", E.enumRemoval);
    });
    await test.step("reordering labels is refused", async () => {
      await editEnumValuesRejected(page, names.enumName, "ok, sad, happy", E.enumRemoval);
    });
    await test.step("reopen: values are unchanged", async () => {
      await expectEnumValues(page, names.enumName, "sad, ok, happy");
    });
  });

  test("Use enum type on a table column", async () => {
    await addEnumColumn(page, names.usersTable, names.enumName);
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupPgCoreSchema(page, names);
    cleanedUp = true;
  });
});
