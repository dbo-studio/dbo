import { test, type BrowserContext, type Page } from "@playwright/test";
import {
  postgresCoreSchemaNames,
  PG_CORE_ERRORS as E,
  PG_CORE_PREVIEW as P,
  PG_CORE_TABS as T,
} from "../../fixtures/postgresCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  addCheck,
  addColumnAndFailingCheck,
  addCheckRejected,
  addColumn,
  addIndex,
  addIndexes,
  addIndexRejected,
  changeIndexMethod,
  cleanupPgCoreSchema,
  dropFirstRowOfTab,
  dropRowsOfTab,
  editCheckExpression,
  expectCheckLoaded,
  expectIndexLoaded,
  expectIndexRows,
  expectIndexWhereLoaded,
  expectNoColumn,
  refreshCatalogCache,
  expectTabEmpty,
  renameIndex,
  type IndexSpec,
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

  test("Partial index with WHERE round-trips", async () => {
    await test.step("add non-unique index with a WHERE predicate", async () => {
      await addIndex(page, names.usersTable, names.indexName, {
        unique: false,
        column: "email",
        where: "email IS NOT NULL",
      });
    });
    await test.step("reopen: predicate is loaded from the catalog", async () => {
      await expectIndexWhereLoaded(page, names.usersTable, /email IS NOT NULL/);
    });
    await test.step("drop the partial index", async () => {
      await dropFirstRowOfTab(page, names.usersTable, T.indexes, P.dropIndex);
    });
  });

  test("Index with an unsafe WHERE is rejected, not silently skipped", async () => {
    await test.step("save is refused with a clear message", async () => {
      await addIndexRejected(
        page,
        names.usersTable,
        `${names.indexName}_bad`,
        "email IS NOT NULL; DROP TABLE x",
        E.unsafeWhere,
      );
    });
    await test.step("reopen: nothing was created", async () => {
      await expectTabEmpty(page, names.usersTable, T.indexes, "name");
    });
  });

  test("Check with a statement separator is rejected", async () => {
    await test.step("save is refused with a clear message", async () => {
      await addCheckRejected(
        page,
        names.usersTable,
        `${names.checkName}_bad`,
        "length(email) > 3; DROP TABLE x",
        E.unsafeCheck,
      );
    });
    await test.step("reopen: nothing was created", async () => {
      await expectTabEmpty(page, names.usersTable, T.checks, "name");
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

  test("GIN, GiST, BRIN and multi-column unique indexes round-trip", async () => {
    // Sorted by name: that is the order the catalog returns them in.
    const specs: IndexSpec[] = [
      { name: `${names.indexName}_a_gin`, method: "gin", columns: ["doc"] },
      { name: `${names.indexName}_b_gist`, method: "gist", columns: ["doc"] },
      { name: `${names.indexName}_c_brin`, method: "brin", columns: ["email"] },
      { name: `${names.indexName}_d_multi`, method: "btree", columns: ["id", "email"], unique: true },
    ];

    await test.step("add a tsvector column for GIN and GiST", async () => {
      await addColumn(page, names.usersTable, "doc", "tsvector");
    });
    await test.step("add the four indexes in one save", async () => {
      await addIndexes(page, names.usersTable, specs);
    });
    await test.step("reopen: method, columns and uniqueness are loaded", async () => {
      await expectIndexRows(page, names.usersTable, specs);
    });
    await test.step("rename the BRIN index in place (no recreate)", async () => {
      await renameIndex(page, names.usersTable, 2, `${names.indexName}_c_brin`, `${names.indexName}_c_brin2`);
    });
    await test.step("reopen: renamed index keeps its method", async () => {
      await expectIndexRows(page, names.usersTable, [
        specs[0],
        specs[1],
        { ...specs[2], name: `${names.indexName}_c_brin2` },
        specs[3],
      ]);
    });
    await test.step("drop all four", async () => {
      await dropRowsOfTab(page, names.usersTable, T.indexes, [0, 1, 2, 3], P.dropIndex);
    });
    await test.step("reopen: no indexes left", async () => {
      await expectTabEmpty(page, names.usersTable, T.indexes, "name");
    });
  });

  test("A failing change rolls back the whole table edit", async () => {
    await test.step("add a column and a check on a missing column in one save", async () => {
      await addColumnAndFailingCheck(page, names.usersTable, "atomic_col");
    });
    await test.step("clear the metadata cache with a harmless successful edit", async () => {
      await refreshCatalogCache(page, names.usersTable);
    });
    await test.step("reopen: the column from the same save was rolled back too", async () => {
      await expectNoColumn(page, names.usersTable, "atomic_col");
    });
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupPgCoreSchema(page, names);
    cleanedUp = true;
  });
});
