import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  cleanupDataBrowserSeed,
  dropDataBrowserTable,
  setupDataBrowserTable,
} from "./dataBrowser";
import { withConnectionCleanup } from "./safeCleanup";

/**
 * Same depth as PostgreSQL data-browser for every shipped engine.
 */
export function defineDataBrowserTests(engine: DbEngine): void {
  const label =
    engine === "postgresql"
      ? "PostgreSQL"
      : engine === "mysql"
        ? "MySQL"
        : "SQLite";

  test.describe(`Data browser ${label}`, () => {
    async function withSeed(
      page: Page,
      testInfo: TestInfo,
      titleSlug: string,
      body: (
        seed: Awaited<ReturnType<typeof setupDataBrowserTable>>,
      ) => Promise<void>,
    ): Promise<void> {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `data-browser-${titleSlug}-${suffix}`;
      const tableName = `e2e_data_browser_${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        const seed = await setupDataBrowserTable(
          page,
          connectionName,
          tableName,
          engine,
        );
        try {
          await body(seed);
        } finally {
          await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
        }
      });
    }

    test("Open table from tree shows rows", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "open", async (seed) => {
        await test.step("Open table from object tree", async () => {
          await seed.dataBrowser.openTableFromTree(
            seed.treePath,
            seed.tableName,
          );
          await seed.dataGrid.waitForData("Alpha");
          await seed.dataGrid.expectCellVisible("Hotel");
        });
      });
    });

    test("Filter by name updates grid", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "filter", async (seed) => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, seed.tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Filter by name", async () => {
          await seed.dataBrowser.openFiltersPanel();
          await seed.dataBrowser.addFilter("name", "=", "Charlie");
          await seed.dataGrid.waitForData("Charlie");
          await seed.dataGrid.expectCellVisible("Charlie");
          await seed.dataGrid.expectCellHidden("Alpha");
          await seed.dataGrid.expectCellHidden("Hotel");
        });
      });
    });

    test("Sort DESC changes row order", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "sort", async (seed) => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, seed.tableName);
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
      });
    });

    test("Pagination page and limit", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "page", async (seed) => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, seed.tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Change page limit and go next", async () => {
          await seed.dataGrid.setPageLimit(5);
          await seed.dataGrid.waitForData();
          await expect(
            page.getByRole("button", { name: /next page/i }),
          ).toBeEnabled({ timeout: 10000 });
          await seed.dataGrid.goToNextPage();
          await seed.dataGrid.waitForData();
          await seed.dataGrid.expectCellVisible("Foxtrot");
          await seed.dataGrid.expectCellHidden("Alpha");
        });
      });
    });

    test("Toggle column visibility", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "cols", async (seed) => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, seed.tableName);
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
      });
    });

    test("Inline Query filters rows", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "inline", async (seed) => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, seed.tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Run inline condition", async () => {
          await seed.dataBrowser.runInlineQuery("name = 'Charlie'");
          await seed.dataGrid.waitForData("Charlie");
          await seed.dataGrid.expectCellVisible("Charlie");
          await seed.dataGrid.expectCellHidden("Alpha");
        });
      });
    });

    test("Query Preview and Open editor", async ({ page }, testInfo) => {
      await withSeed(page, testInfo, "preview", async (seed) => {
        await seed.dataBrowser.openTableFromTree(seed.treePath, seed.tableName);
        await seed.dataGrid.waitForData("Alpha");
        await seed.dataGrid.refreshQuery();
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Open query preview", async () => {
          await seed.dataBrowser.queryPreviewButton.click();
          const previewOpenEditor = page
            .locator('[aria-label="Open editor"]')
            .last();
          await expect(previewOpenEditor).toBeVisible({ timeout: 10000 });
          await expect(previewOpenEditor).toBeEnabled({ timeout: 15000 });
        });

        await test.step("Open editor from preview", async () => {
          await page.locator('[aria-label="Open editor"]').last().click();
          await expect(
            page.getByRole("button", { name: "Run query" }),
          ).toBeVisible({ timeout: 15000 });
        });
      });
    });
  });
}
