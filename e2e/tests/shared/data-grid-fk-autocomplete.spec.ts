import { test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  dropFkAutocompleteTables,
  dropFkCompositeSqliteTables,
  fkAutocompleteTables,
  fkCompositeTables,
  setupFkAutocompleteTables,
  setupFkCompositeSqliteTables,
  type FkAutocompleteEngine,
} from "../../helpers/dataGridFkAutocomplete";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

async function runFkAutocompleteFlow(
  page: import("@playwright/test").Page,
  testInfo: import("@playwright/test").TestInfo,
  engine: FkAutocompleteEngine,
): Promise<void> {
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `fk-ac-${engine}-${suffix}`;
  const { categoriesTable, productsTable } = fkAutocompleteTables(suffix, engine);
  const sqlitePath =
    engine === "sqlite" ? `/tmp/dbo-e2e-fk-ac-${suffix}.db` : undefined;

  await withConnectionCleanup(page, connectionName, async () => {
    const seed = await setupFkAutocompleteTables(
      page,
      engine,
      connectionName,
      categoriesTable,
      productsTable,
      suffix,
      sqlitePath,
    );

    try {
      await test.step("Open products table from tree", async () => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, productsTable);
        await seed.dataGrid.waitForData("Laptop");
      });

      await test.step("FK badge is visible on category_id", async () => {
        await seed.dataGrid.expectForeignKeyBadge(
          new RegExp(`${categoriesTable}\\(id\\)`, "i"),
        );
      });

      await test.step("NOT NULL FK has no NULL option", async () => {
        await seed.dataGrid.expectFkMenuHasNoNullOption("Laptop", "1");
      });

      await test.step("Pick FK value via autocomplete and save", async () => {
        await seed.dataGrid.pickFkOption("Laptop", "1", /Books/i);
        await seed.dataGrid.saveChanges();
        await seed.dataGrid.refreshQuery();
        await seed.dataGrid.waitForData("Laptop");
        await seed.dataGrid.expectCellVisible("2");
      });

      await test.step("Paste raw FK key still works", async () => {
        await seed.dataGrid.pasteFkRawKey("Laptop", "2", "3");
        await seed.dataGrid.saveChanges();
        await seed.dataGrid.refreshQuery();
        await seed.dataGrid.waitForData("Laptop");
        await seed.dataGrid.expectCellVisible("3");
      });
    } finally {
      await dropFkAutocompleteTables(seed);
    }
  });
}

test.describe("Data grid FK autocomplete", () => {
  test("PostgreSQL single-column FK picker", async ({ page }, testInfo) => {
    await runFkAutocompleteFlow(page, testInfo, "postgresql");
  });

  test("MySQL single-column FK picker", async ({ page }, testInfo) => {
    await runFkAutocompleteFlow(page, testInfo, "mysql");
  });

  test("SQLite single-column FK picker", async ({ page }, testInfo) => {
    await runFkAutocompleteFlow(page, testInfo, "sqlite");
  });

  test("SQLite composite FK picker fills all local columns", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `fk-comp-sqlite-${suffix}`;
    const { parentsTable, childrenTable } = fkCompositeTables(suffix);
    const sqlitePath = `/tmp/dbo-e2e-fk-comp-${suffix}.db`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupFkCompositeSqliteTables(
        page,
        connectionName,
        parentsTable,
        childrenTable,
        sqlitePath,
      );

      try {
        await test.step("Open children table from tree", async () => {
          await seed.dataBrowser.openTableFromTree(seed.treePath, childrenTable);
          await seed.dataGrid.waitForData("ChildA");
        });

        await test.step("Composite FK badge visible", async () => {
          await seed.dataGrid.expectForeignKeyBadge(
            new RegExp(`${parentsTable}\\(tenant_id,\\s*id\\)`, "i"),
          );
        });

        await test.step("Pick parent row and fill both FK columns", async () => {
          await seed.dataGrid.pickCompositeFkOption("ChildA", /Beta/i);
          await seed.dataGrid.saveChanges();
          await seed.dataGrid.refreshQuery();
          await seed.dataGrid.waitForData("ChildA");
          await seed.dataGrid.expectCellVisible("t1");
          await seed.dataGrid.expectCellVisible("2");
        });
      } finally {
        await dropFkCompositeSqliteTables(seed);
      }
    });
  });
});
