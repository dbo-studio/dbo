import { test, type BrowserContext, type Page } from "@playwright/test";
import { postgresExtendedNames } from "../fixtures/postgresObjectFormLifecycle";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  cleanupExtended,
  createDatabase,
  createMaterializedView,
  createSchema,
  createTableInSchema,
  createViewInSchema,
  dropSchemaViaTree,
  editDatabaseComment,
  editViewQuery,
  renameSchema,
  setupPostgresConnection,
} from "../helpers/objectFormPostgresExtended";
import { safeDeleteConnection } from "../helpers/safeCleanup";

test.describe.configure({ mode: "serial" });

test.describe("Object Form PostgreSQL schema and matview", () => {
  let context: BrowserContext;
  let page: Page;
  let names: ReturnType<typeof postgresExtendedNames>;
  let cleanedUp = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001",
    });
    page = await context.newPage();
    names = postgresExtendedNames(uniqueTestSuffix(testInfo));
  });

  test.afterAll(async () => {
    try {
      if (!cleanedUp && names && page && !page.isClosed()) {
        try {
          await cleanupExtended(page, names);
          cleanedUp = true;
        } catch (cleanupErr) {
          console.warn(
            "[e2e] postgres extended cleanup after failure:",
            cleanupErr,
          );
          await safeDeleteConnection(page, names.connectionName);
        }
      }
    } finally {
      await context?.close().catch(() => undefined);
    }
  });

  test("Connect to PostgreSQL", async () => {
    await setupPostgresConnection(page, names.connectionName);
  });

  test("Create database", async () => {
    await createDatabase(page, names.connectionName, names.databaseName);
  });

  test("Create schema", async () => {
    await createSchema(
      page,
      names.connectionName,
      names.databaseName,
      names.schemaName,
    );
  });

  test("Create table in schema", async () => {
    await createTableInSchema(
      page,
      names.connectionName,
      names.databaseName,
      names.schemaName,
      names.tableName,
    );
  });

  test("Create materialized view", async () => {
    await createMaterializedView(
      page,
      names.connectionName,
      names.databaseName,
      names.schemaName,
      names.matViewName,
      names.tableName,
    );
  });

  test("Create view for edit step", async () => {
    await createViewInSchema(
      page,
      names.connectionName,
      names.databaseName,
      names.schemaName,
      names.viewName,
      names.tableName,
    );
  });

  test("Edit database — add comment", async () => {
    await editDatabaseComment(
      page,
      names.databaseName,
      "e2e extended test database",
    );
  });

  test("Rename schema", async () => {
    await renameSchema(page, names.schemaName, names.renamedSchemaName);
  });

  test("Edit view — change query", async () => {
    await editViewQuery(
      page,
      names.connectionName,
      names.databaseName,
      names.renamedSchemaName,
      names.viewName,
      names.tableName,
    );
  });

  test("Drop schema via tree", async () => {
    await dropSchemaViaTree(
      page,
      names.connectionName,
      names.databaseName,
      names.renamedSchemaName,
    );
  });

  test("Cleanup — drop database and connection", async () => {
    await cleanupExtended(page, names);
    cleanedUp = true;
  });
});
