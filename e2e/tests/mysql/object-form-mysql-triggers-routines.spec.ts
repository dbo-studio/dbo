import { test, type BrowserContext, type Page } from "@playwright/test";
import { mysqlCoreSchemaNames, MYSQL_CORE_ERRORS as E } from "../../fixtures/mysqlCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addTrigger,
  addTriggerWithoutBodyRejected,
  cleanupMysqlCoreSchema,
  createFunction,
  createFunctionRejected,
  createProcedure,
  createProcedureWithOutParameter,
  dropRoutine,
  dropTrigger,
  editFunctionBody,
  editTriggerBody,
  expectFunctionLoaded,
  expectNoTriggers,
  expectOutParameterLoaded,
  expectProcedureLoaded,
  expectTriggerLoaded,
  setupMysqlCoreSchema,
} from "../../helpers/objectFormMysqlCoreSchema";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form MySQL triggers and routines", () => {
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
          console.warn("[e2e] mysql triggers/routines cleanup after failure:", cleanupErr);
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

  test("Trigger without a body is rejected", async () => {
    await test.step("save is refused with a clear message", async () => {
      await addTriggerWithoutBodyRejected(page, names.usersTable, `${names.triggerName}_bad`, E.triggerBodyRequired);
    });
    await test.step("reopen: nothing was created", async () => {
      await expectNoTriggers(page, names.usersTable);
    });
  });

  test("Add trigger on table and load it back", async () => {
    await test.step("add BEFORE INSERT trigger", async () => {
      await addTrigger(page, names.usersTable, names.triggerName);
    });
    await test.step("reopen: trigger is loaded from information_schema", async () => {
      await expectTriggerLoaded(page, names.usersTable, names.triggerName, /LOWER/);
    });
  });

  test("Edit trigger body drops and recreates", async () => {
    await test.step("change body to UPPER", async () => {
      await editTriggerBody(page, names.usersTable);
    });
    await test.step("reopen: new body is stored", async () => {
      await expectTriggerLoaded(page, names.usersTable, names.triggerName, /UPPER/);
    });
  });

  test("Drop trigger", async () => {
    await test.step("delete the trigger row", async () => {
      await dropTrigger(page, names.usersTable);
    });
    await test.step("reopen: no triggers left", async () => {
      await expectNoTriggers(page, names.usersTable);
    });
  });

  test("Create, edit and drop function", async () => {
    await test.step("create deterministic function a + 1", async () => {
      await createFunction(page, names, names.functionName);
    });
    await test.step("reopen: signature is loaded", async () => {
      await expectFunctionLoaded(page, names.functionName);
    });
    await test.step("edit body (drop + create)", async () => {
      await editFunctionBody(page, names.functionName);
    });
    await test.step("drop function via tree", async () => {
      await dropRoutine(page, names.functionName, "Drop function");
    });
  });

  test("Function with an unsafe parameter list is rejected", async () => {
    await createFunctionRejected(page, names, `${names.functionName}_bad`, E.unsafeParameters);
  });

  test("Procedure with IN and OUT parameters round-trips", async () => {
    await test.step("create procedure (IN a INT, OUT b INT)", async () => {
      await createProcedureWithOutParameter(page, names, `${names.procedureName}_out`);
    });
    await test.step("reopen: both parameters are loaded with their modes", async () => {
      await expectOutParameterLoaded(page, `${names.procedureName}_out`);
    });
  });

  test("Create and drop procedure", async () => {
    await test.step("create procedure with IN parameter", async () => {
      await createProcedure(page, names, names.procedureName);
    });
    await test.step("reopen: parameters are loaded", async () => {
      await expectProcedureLoaded(page, names.procedureName);
    });
    await test.step("drop procedure via tree", async () => {
      await dropRoutine(page, names.procedureName, "Drop procedure");
    });
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupMysqlCoreSchema(page, names);
    cleanedUp = true;
  });
});
