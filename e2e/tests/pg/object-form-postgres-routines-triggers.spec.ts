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
  addTriggers,
  cleanupPgCoreSchema,
  changeFunctionSignature,
  changeFunctionWithBadBody,
  createFunctionRejected,
  createFunctionWith,
  createIntegerFunction,
  createProcedure,
  createTriggerFunction,
  dropFirstRowOfTab,
  dropRoutine,
  dropRowsOfTab,
  editFunctionBody,
  editProcedureBody,
  expectFunctionForm,
  expectFunctionSignature,
  expectRoutineNode,
  expectTabEmpty,
  expectTriggerLoaded,
  expectTriggerRows,
  renameTriggerWithComment,
  type TriggerSpec,
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

  test("Trigger timings, events and orientations round-trip", async () => {
    // Sorted by name: that is the order the catalog returns them in.
    const specs: TriggerSpec[] = [
      { name: `${names.triggerName}_a`, timing: "AFTER", events: ["INSERT", "UPDATE", "DELETE"], orientation: "STATEMENT" },
      { name: `${names.triggerName}_b`, timing: "AFTER", events: ["TRUNCATE"], orientation: "STATEMENT" },
      { name: `${names.triggerName}_c`, timing: "BEFORE", events: ["UPDATE"], orientation: "ROW" },
      { name: `${names.triggerName}_d`, timing: "BEFORE", events: ["DELETE"], orientation: "ROW" },
    ];

    await test.step("add AFTER multi-event, AFTER TRUNCATE, BEFORE UPDATE and BEFORE DELETE triggers", async () => {
      await addTriggers(page, names.usersTable, names.triggerFunction, specs);
    });
    await test.step("reopen: timing, every event and orientation are loaded", async () => {
      await expectTriggerRows(page, names.usersTable, names.triggerFunction, specs);
    });
  });

  test("Rename and comment a trigger in place", async () => {
    const renamed = `${names.triggerName}_a_renamed`;

    await test.step("rename + comment: no DROP TRIGGER in the preview", async () => {
      await renameTriggerWithComment(page, names.usersTable, 0, `${names.triggerName}_a`, renamed, "audit trigger");
    });
    await test.step("reopen: new name and comment are loaded", async () => {
      await expectTriggerRows(page, names.usersTable, names.triggerFunction, [
        { name: renamed, timing: "AFTER", events: ["INSERT", "UPDATE", "DELETE"], orientation: "STATEMENT" },
      ]);
    });
  });

  test("Drop all triggers at once", async () => {
    await test.step("delete the four trigger rows", async () => {
      await dropRowsOfTab(page, names.usersTable, T.triggers, [0, 1, 2, 3], P.dropTrigger);
    });
    await test.step("reopen: no triggers left", async () => {
      await expectTabEmpty(page, names.usersTable, T.triggers, "name");
    });
  });

  test("Drop trigger function via tree", async () => {
    await dropRoutine(page, `${names.triggerFunction}()`, "Drop function");
  });

  test("Changing a function's parameters drops and recreates it", async () => {
    await test.step("create function f(a integer)", async () => {
      await createIntegerFunction(page, names, names.signatureFunction);
    });
    await test.step("add parameter b: preview is DROP + CREATE", async () => {
      await changeFunctionSignature(page, names.signatureFunction);
    });
    await test.step("reopen: new signature and body are stored", async () => {
      await expectFunctionSignature(page, `${names.signatureFunction}(a integer, b integer)`, "a integer, b integer");
    });
    await test.step("drop the function via tree", async () => {
      await dropRoutine(page, `${names.signatureFunction}(a integer, b integer)`, "Drop function");
    });
  });

  test("A failed function edit rolls back and keeps the original", async () => {
    const node = `${names.rollbackFunction}(a integer)`;

    await test.step("create function f(a integer)", async () => {
      await createFunctionWith(page, names, names.rollbackFunction, {
        parameters: "a integer", returns: "integer", body: "BEGIN RETURN a; END;",
      });
    });
    await test.step("signature change with an invalid body is rejected by PostgreSQL", async () => {
      await changeFunctionWithBadBody(page, node);
    });
    await test.step("the original function still exists with its old signature", async () => {
      await expectRoutineNode(page, names, node, true);
      await expectFunctionForm(page, node, "a integer", "integer");
    });
    await test.step("drop it via tree", async () => {
      await dropRoutine(page, node, "Drop function");
    });
  });

  test("Dropping one overload leaves the other", async () => {
    const intNode = `${names.overloadFunction}(a integer)`;
    const textNode = `${names.overloadFunction}(a text)`;

    await test.step("create f(a integer) and f(a text)", async () => {
      await createFunctionWith(page, names, names.overloadFunction, {
        parameters: "a integer", returns: "integer", body: "BEGIN RETURN a; END;",
      });
      await createFunctionWith(page, names, names.overloadFunction, {
        parameters: "a text", returns: "text", body: "BEGIN RETURN a; END;",
      });
    });
    await test.step("each overload opens its own definition", async () => {
      await expectFunctionForm(page, textNode, "a text", "text");
      await expectFunctionForm(page, intNode, "a integer", "integer");
    });
    await test.step("drop the text overload", async () => {
      await dropRoutine(page, textNode, "Drop function");
    });
    await test.step("the integer overload is untouched", async () => {
      await expectRoutineNode(page, names, intNode, true);
      await expectFunctionForm(page, intNode, "a integer", "integer");
    });
    await test.step("drop the integer overload", async () => {
      await dropRoutine(page, intNode, "Drop function");
    });
  });

  test("Create, edit and drop procedure", async () => {
    await test.step("create procedure", async () => {
      await createProcedure(page, names, names.procedureName);
    });
    await test.step("edit body: preview is CREATE OR REPLACE", async () => {
      await editProcedureBody(page, `${names.procedureName}()`);
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
