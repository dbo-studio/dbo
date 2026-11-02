import { test, type BrowserContext, type Page } from "@playwright/test";
import { mysqlCoreSchemaNames, MYSQL_CORE_ERRORS as E } from "../../fixtures/mysqlCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addTrigger,
  addTriggers,
  addTriggerWithoutBodyRejected,
  cleanupMysqlCoreSchema,
  createFunction,
  createFunctionRejected,
  createProcedure,
  createProcedureWithOutParameter,
  dropRoutine,
  dropTrigger,
  dropTriggerRows,
  editFunctionBodyRejectedByDb,
  editTriggerBodyRejectedByDb,
  expectFunctionBody,
  editFunctionBody,
  editTriggerBody,
  expectFunctionLoaded,
  expectNoTriggers,
  expectOutParameterLoaded,
  expectProcedureLoaded,
  expectTriggerLoaded,
  expectTriggerRows,
  retargetTrigger,
  type MysqlTriggerSpec,
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

  test("AFTER and UPDATE/DELETE triggers round-trip and retarget", async () => {
    // Sorted by name: that is the order information_schema returns them in.
    const specs: MysqlTriggerSpec[] = [
      { name: `${names.triggerName}_a`, timing: "AFTER", event: "UPDATE", body: "SET @e2e_a = 1" },
      { name: `${names.triggerName}_b`, timing: "AFTER", event: "DELETE", body: "SET @e2e_b = 1" },
      { name: `${names.triggerName}_c`, timing: "BEFORE", event: "UPDATE", body: "SET @e2e_c = 1" },
    ];

    await test.step("add AFTER UPDATE, AFTER DELETE and BEFORE UPDATE triggers", async () => {
      await addTriggers(page, names.usersTable, specs);
    });
    await test.step("reopen: timing, event and body are loaded", async () => {
      await expectTriggerRows(page, names.usersTable, specs);
    });
    await test.step("retarget the second trigger to AFTER INSERT (drop + create)", async () => {
      await retargetTrigger(page, names.usersTable, 1, specs[1].name, { timing: "AFTER", event: "INSERT" });
    });
    await test.step("reopen: the new timing and event are stored", async () => {
      await expectTriggerRows(page, names.usersTable, [specs[0], { ...specs[1], event: "INSERT" }, specs[2]]);
    });
    await test.step("drop all three at once", async () => {
      await dropTriggerRows(page, names.usersTable, [0, 1, 2]);
    });
    await test.step("reopen: no triggers left", async () => {
      await expectNoTriggers(page, names.usersTable);
    });
  });

  test("A trigger edit MySQL rejects keeps the original trigger", async () => {
    await test.step("add a trigger", async () => {
      await addTrigger(page, names.usersTable, `${names.triggerName}_keep`);
    });
    await test.step("edit to a body on a missing column: rejected before anything is dropped", async () => {
      await editTriggerBodyRejectedByDb(page, names.usersTable);
    });
    await test.step("reopen: the original trigger and body are still there", async () => {
      await expectTriggerLoaded(page, names.usersTable, `${names.triggerName}_keep`, /LOWER/);
    });
    await test.step("drop it", async () => {
      await dropTrigger(page, names.usersTable);
    });
  });

  test("A function edit MySQL rejects keeps the original function", async () => {
    const name = `${names.functionName}_keep`;

    await test.step("create function", async () => {
      await createFunction(page, names, name);
    });
    await test.step("edit to a body with a syntax error: rejected before anything is dropped", async () => {
      await editFunctionBodyRejectedByDb(page, name);
    });
    await test.step("reopen: the original function and body are still there", async () => {
      await expectFunctionBody(page, name, /a\s*\+\s*1/);
    });
    await test.step("drop it", async () => {
      await dropRoutine(page, name, "Drop function");
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
