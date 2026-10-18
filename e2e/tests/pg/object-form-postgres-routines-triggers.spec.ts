import { test, type BrowserContext, type Page } from "@playwright/test";
import {
  postgresCoreSchemaNames,
  PG_CORE_ERRORS as E,
  PG_CORE_PREVIEW as P,
  PG_CORE_TABS as T,
} from "../../fixtures/postgresCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addTrigger,
  addTriggerRejected,
  cleanupPgCoreSchema,
  createFunctionRejected,
  createProcedure,
  createTriggerFunction,
  dropFirstRowOfTab,
  dropRoutine,
  editFunctionBody,
  expectTabEmpty,
  expectTriggerLoaded,
  setupPgCoreSchema,
} from "../../helpers/objectFormPostgresCoreSchema";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL routines and triggers", () => {
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
          console.warn("[e2e] postgres routines/triggers cleanup after failure:", cleanupErr);
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

  test("Create trigger function", async () => {
    await createTriggerFunction(page, names, names.triggerFunction);
  });

  test("Function with an unsafe parameter list is rejected", async () => {
    await createFunctionRejected(
      page,
      names,
      `${names.triggerFunction}_bad`,
      "a integer; DROP TABLE x",
      E.unsafeParameters,
    );
  });

  test("Trigger with an unsafe WHEN is rejected", async () => {
    await test.step("save is refused with a clear message", async () => {
      await addTriggerRejected(
        page,
        names.usersTable,
        `${names.triggerName}_bad`,
        names.triggerFunction,
        "NEW.email IS NOT NULL; DROP TABLE x",
        E.unsafeTriggerWhen,
      );
    });
    await test.step("reopen: nothing was created", async () => {
      await expectTabEmpty(page, names.usersTable, T.triggers, "name");
    });
  });

  test("Add trigger on table and load it back", async () => {
    await test.step("add BEFORE INSERT row trigger", async () => {
      await addTrigger(page, names.usersTable, names.triggerName, names.triggerFunction);
    });
    await test.step("reopen: trigger is loaded from the catalog", async () => {
      await expectTriggerLoaded(page, names.usersTable, names.triggerName, names.triggerFunction);
    });
  });

  test("Edit function body keeps the signature", async () => {
    await editFunctionBody(page, names.triggerFunction);
  });

  test("Drop trigger", async () => {
    await test.step("delete the trigger row", async () => {
      await dropFirstRowOfTab(page, names.usersTable, T.triggers, P.dropTrigger);
    });
    await test.step("reopen: no triggers left", async () => {
      await expectTabEmpty(page, names.usersTable, T.triggers, "name");
    });
  });

  test("Drop trigger function via tree", async () => {
    await dropRoutine(page, `${names.triggerFunction}()`, "Drop function");
  });

  test("Create and drop procedure", async () => {
    await test.step("create procedure", async () => {
      await createProcedure(page, names, names.procedureName);
    });
    await test.step("drop procedure via tree", async () => {
      await dropRoutine(page, `${names.procedureName}()`, "Drop procedure");
    });
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupPgCoreSchema(page, names);
    cleanedUp = true;
  });
});
