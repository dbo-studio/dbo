import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  dropDataBrowserTable,
  setupDataBrowserTable,
} from "../helpers/dataBrowser";
import { withConnectionCleanup } from "../helpers/safeCleanup";

/**
 * Data browser — open table, filter/sort/pagination, ActionBar (PostgreSQL).
 */
test.describe("Data browser PostgreSQL", () => {
  test("Open table from tree shows rows", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-open-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await test.step("Open table from object tree", async () => {
          await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
          await seed.dataGrid.waitForData("Alpha");
          await seed.dataGrid.expectCellVisible("Hotel");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Filter by name updates grid", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-filter-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Filter by name", async () => {
          await seed.dataBrowser.openFiltersPanel();
          await seed.dataBrowser.addFilter("name", "=", "Charlie");
          await seed.dataGrid.waitForData("Charlie");
          await seed.dataGrid.expectCellVisible("Charlie");
          await seed.dataGrid.expectCellHidden("Alpha");
          await seed.dataGrid.expectCellHidden("Hotel");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Sort DESC changes row order", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-sort-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Sort score DESC", async () => {
          await seed.dataBrowser.openSortsPanel();
          await seed.dataBrowser.addSort("score", "DESC");
          await seed.dataGrid.waitForData("Hotel");
          await expect(
            seed.dataGrid.grid.getByText("Hotel").first(),
          ).toBeVisible();
          await seed.dataGrid.expectCellVisible("Alpha");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Pagination page and limit", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-page-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Change page limit and go next", async () => {
          await seed.dataGrid.setPageLimit(5);
          await seed.dataGrid.waitForData();
          await expect(
            page.getByRole("button", { name: /next page/i }),
          ).toBeEnabled({ timeout: 10000 });
          await seed.dataGrid.goToNextPage();
          await seed.dataGrid.waitForData();
          // Default ASC by id: page 1 Alpha–Echo, page 2 Foxtrot–Hotel
          await seed.dataGrid.expectCellVisible("Foxtrot");
          await seed.dataGrid.expectCellHidden("Alpha");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Toggle column visibility", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-cols-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Charlie");

        await test.step("Hide name column", async () => {
          await seed.dataBrowser.toggleColumnVisibility("name");
          await seed.dataGrid.expectCellHidden("Charlie");
          await seed.dataGrid.expectCellVisible("30");
        });

        await test.step("Show name column again", async () => {
          await seed.dataBrowser.toggleColumnVisibility("name");
          await seed.dataGrid.expectCellVisible("Charlie");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Inline Query filters rows", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-inline-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Run inline condition", async () => {
          await seed.dataBrowser.runInlineQuery("name = 'Charlie'");
          await seed.dataGrid.waitForData("Charlie");
          await seed.dataGrid.expectCellVisible("Charlie");
          await seed.dataGrid.expectCellHidden("Alpha");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Query Preview and Open editor", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `data-browser-preview-${suffix}`;
    const tableName = `e2e_data_browser_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");
        // Ensure Data tab query string is populated for preview Open editor.
        await seed.dataGrid.refreshQuery();
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Open query preview", async () => {
          await seed.dataBrowser.queryPreviewButton.click();
          // Preview panel control uses aria-label; header sql uses tooltip only.
          const previewOpenEditor = page.locator('[aria-label="Open editor"]').last();
          await expect(previewOpenEditor).toBeVisible({ timeout: 10000 });
          await expect(previewOpenEditor).toBeEnabled({ timeout: 15000 });
        });

        await test.step("Open editor from preview", async () => {
          await page.locator('[aria-label="Open editor"]').last().click();
          await expect(
            page.getByRole("heading", { name: /SQL Query/i }),
          ).toBeVisible({ timeout: 15000 });
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });
});
