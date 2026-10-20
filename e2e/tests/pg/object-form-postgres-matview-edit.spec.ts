import { test, type BrowserContext, type Page } from "@playwright/test";
import { postgresCoreSchemaNames } from "../../fixtures/postgresCoreSchema";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupPgCoreSchema,
  createMatView,
  dropMatView,
  editMatViewComment,
  editMatViewQuery,
  expectMatViewComment,
  refreshMatView,
  setupPgCoreSchema,
} from "../../helpers/objectFormPostgresCoreSchema";
import { safeDeleteConnection } from "../../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL materialized view edit and refresh", () => {
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
          console.warn("[e2e] postgres matview edit cleanup after failure:", cleanupErr);
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect, create users table and materialized view", async () => {
    await setupPgCoreSchema(page, names);
    await createMatView(page, names, names.matViewName);
  });

  test("Edit comment alters in place", async () => {
    await test.step("set comment", async () => {
      await editMatViewComment(page, names.matViewName);
    });
    await test.step("reopen: comment is loaded", async () => {
      await expectMatViewComment(page, names.matViewName, "edited by e2e");
    });
  });

  test("Edit query drops and recreates the view", async () => {
    await test.step("change query", async () => {
      await editMatViewQuery(page, names.matViewName, `SELECT id, email FROM public.${names.usersTable}`);
    });
    await test.step("reopen: comment survived the recreate", async () => {
      await expectMatViewComment(page, names.matViewName, "edited by e2e");
    });
  });

  test("Refresh with and without data", async () => {
    await test.step("REFRESH ... WITH DATA", async () => {
      await refreshMatView(page, names.matViewName, "Refresh materialized view");
    });
    await test.step("REFRESH ... WITH NO DATA", async () => {
      await refreshMatView(page, names.matViewName, "Refresh materialized view (no data)");
    });
    await test.step("refresh with data again", async () => {
      await refreshMatView(page, names.matViewName, "Refresh materialized view");
    });
  });

  test("Drop materialized view via tree", async () => {
    await dropMatView(page, names.matViewName);
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupPgCoreSchema(page, names);
    cleanedUp = true;
  });
});
