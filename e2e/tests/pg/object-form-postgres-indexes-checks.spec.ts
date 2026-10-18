import { test, type BrowserContext, type Page } from "@playwright/test";
import { postgresCoreSchemaNames, PG_CORE_PREVIEW as P, PG_CORE_TABS as T } from "../../fixtures/postgresCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addCheck,
  addIndex,
  changeIndexMethod,
  cleanupPgCoreSchema,
  dropFirstRowOfTab,
  editCheckExpression,
  expectCheckLoaded,
  expectIndexLoaded,
  expectTabEmpty,
  setupPgCoreSchema,
} from "../../helpers/objectFormPostgresCoreSchema";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL indexes and checks", () => {
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
          console.warn("[e2e] postgres indexes/checks cleanup after failure:", cleanupErr);
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

  test("Create unique btree index and load it back", async () => {
    await test.step("add unique index on email", async () => {
      await addIndex(page, names.usersTable, names.indexName, { unique: true, column: "email" });
    });
    await test.step("reopen: index is loaded from the catalog", async () => {
      await expectIndexLoaded(page, names.usersTable, names.indexName, { unique: true, method: "btree" });
    });
  });

  test("Change index method recreates the index", async () => {
    await test.step("switch method to hash (non-unique)", async () => {
      await changeIndexMethod(page, names.usersTable, "hash");
    });
    await test.step("reopen: method is hash", async () => {
      await expectIndexLoaded(page, names.usersTable, names.indexName, { unique: false, method: "hash" });
    });
  });

  test("Drop index", async () => {
    await test.step("delete the index row", async () => {
      await dropFirstRowOfTab(page, names.usersTable, T.indexes, P.dropIndex);
    });
    await test.step("reopen: no indexes left", async () => {
      await expectTabEmpty(page, names.usersTable, T.indexes, "name");
    });
  });

  test("Add check constraint and load it back", async () => {
    await test.step("add check on email length", async () => {
      await addCheck(page, names.usersTable, names.checkName);
    });
    await test.step("reopen: check is loaded", async () => {
      await expectCheckLoaded(page, names.usersTable, names.checkName);
    });
  });

  test("Edit check expression recreates the constraint", async () => {
    await test.step("change expression", async () => {
      await editCheckExpression(page, names.usersTable, names.checkName);
    });
  });

  test("Drop check constraint", async () => {
    await test.step("delete the check row", async () => {
      await dropFirstRowOfTab(page, names.usersTable, T.checks, P.dropConstraint);
    });
    await test.step("reopen: no checks left", async () => {
      await expectTabEmpty(page, names.usersTable, T.checks, "name");
    });
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupPgCoreSchema(page, names);
    cleanedUp = true;
  });
});
