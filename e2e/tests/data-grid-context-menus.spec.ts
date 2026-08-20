import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  dropDataBrowserTable,
  setupContextMenuTable,
} from "../helpers/dataGridContextMenus";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { SafeModePage } from "../pages";

/**
 * Data grid context menus — full Must coverage for empty / cell / header / Safe Mode.
 */
test.describe("Data grid context menus", () => {
  test("Empty area Add row and Refresh", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-empty-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");
        const before = await seed.dataGrid.grid.locator("tbody tr").count();

        await test.step("Add row from empty-area menu", async () => {
          await seed.dataGrid.openEmptyAreaContextMenu();
          await seed.dataGrid.expectContextMenuItems([/add row/i, /^refresh$/i]);
          await expect(seed.dataGrid.contextMenuItem(/open fields/i)).toHaveCount(0);
          await seed.dataGrid.clickContextMenuItem(/add row/i);
          await expect(seed.dataGrid.grid.locator("tbody tr")).toHaveCount(before + 1, {
            timeout: 10000,
          });
          await seed.dataGrid.expectUnsavedRowCount(1);
        });

        await test.step("Refresh from empty-area menu discards unsaved", async () => {
          await seed.dataGrid.openEmptyAreaContextMenu();
          await seed.dataGrid.clickContextMenuItem(/^refresh$/i);
          await seed.dataGrid.waitForData("Alpha");
          await seed.dataGrid.expectUnsavedRowCount(0);
          await expect(seed.dataGrid.grid.locator("tbody tr")).toHaveCount(before, {
            timeout: 15000,
          });
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Cell Open Fields Quick Look and clipboard copy", async ({
    page,
    context,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-copy-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Open Fields", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextMenuItem(/open fields/i);
          await expect(page.getByRole("tab", { name: /^fields$/i })).toBeVisible({
            timeout: 10000,
          });
          await expect(page.getByTestId("db-field")).toBeVisible({ timeout: 10000 });
        });

        await test.step("Quick Look", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextMenuItem(/quick look/i);
          await expect(seed.dataGrid.quickLookTitle()).toBeVisible({ timeout: 5000 });
          await seed.dataGrid.closeQuickLook();
        });

        await test.step("Copy cell", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextSubmenuItem(/^copy$/i, /copy cell/i);
          await seed.dataGrid.expectCopiedToast();
          expect(await seed.dataGrid.readClipboard()).toBe("Alpha");
        });

        await test.step("Copy row TSV", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextSubmenuItem(/^copy$/i, /copy row \(tsv\)/i);
          await seed.dataGrid.expectCopiedToast();
          const tsv = await seed.dataGrid.readClipboard();
          expect(tsv.split("\t").length).toBeGreaterThanOrEqual(3);
          expect(tsv).toContain("Alpha");
        });

        await test.step("Copy row CSV", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextSubmenuItem(/^copy$/i, /copy row \(csv\)/i);
          await seed.dataGrid.expectCopiedToast();
          const csv = await seed.dataGrid.readClipboard();
          expect(csv).toContain(",");
          expect(csv).toContain("Alpha");
        });

        await test.step("Copy column name", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextSubmenuItem(/^copy$/i, /copy column name/i);
          await seed.dataGrid.expectCopiedToast();
          expect(await seed.dataGrid.readClipboard()).toBe("name");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Cell set null empty default Duplicate and Delete", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-edit-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("keep");

        await test.step("Set null on note", async () => {
          await seed.dataGrid.openCellContextMenu("keep");
          await seed.dataGrid.clickContextMenuItem(/set null/i);
          await expect(seed.dataGrid.saveButton).toBeEnabled({ timeout: 5000 });
          await expect(seed.dataGrid.grid.getByText("NULL").first()).toBeVisible({
            timeout: 5000,
          });
        });

        await test.step("Discard then Set empty on Bravo note", async () => {
          await seed.dataGrid.discardChanges();
          await seed.dataGrid.waitForData("keep");
          await seed.dataGrid.openCellContextMenu("keep");
          await seed.dataGrid.clickContextMenuItem(/set empty/i);
          await expect(seed.dataGrid.saveButton).toBeEnabled({ timeout: 5000 });
        });

        await test.step("Discard then Set default", async () => {
          await seed.dataGrid.discardChanges();
          await seed.dataGrid.waitForData("keep");
          await seed.dataGrid.openCellContextMenu("keep");
          await seed.dataGrid.clickContextMenuItem(/set default/i);
          await expect(seed.dataGrid.saveButton).toBeEnabled({ timeout: 5000 });
          await expect(seed.dataGrid.grid.getByText("@DEFAULT").first()).toBeVisible({
            timeout: 5000,
          });
        });

        await test.step("Duplicate row", async () => {
          await seed.dataGrid.discardChanges();
          await seed.dataGrid.waitForData("Alpha");
          const before = await seed.dataGrid.grid.locator("tbody tr").count();
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextMenuItem(/duplicate row/i);
          await expect(seed.dataGrid.grid.locator("tbody tr")).toHaveCount(before + 1, {
            timeout: 10000,
          });
          await seed.dataGrid.expectUnsavedRowCount(1);
        });

        await test.step("Delete row", async () => {
          await seed.dataGrid.discardChanges();
          await seed.dataGrid.waitForData("Bravo");
          await seed.dataGrid.selectRowByCellText("Bravo");
          await seed.dataGrid.openCellContextMenu("Bravo");
          await seed.dataGrid.clickContextMenuItem(/delete row/i);
          await seed.dataGrid.expectRemovedRowVisible();
          await expect(seed.dataGrid.saveButton).toBeEnabled({ timeout: 5000 });
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Cell filter equals not-equals and IS NULL", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-filter-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Filter = Charlie", async () => {
          await seed.dataGrid.openCellContextMenu("Charlie");
          await seed.dataGrid.clickContextSubmenuItem(/^filter$/i, /filter = value/i);
          await seed.dataGrid.waitForData("Charlie");
          await seed.dataGrid.expectCellVisible("Charlie");
          await seed.dataGrid.expectCellHidden("Alpha");
          await seed.dataGrid.expectCellHidden("Hotel");
        });

        await test.step("Clear then Filter ≠ Alpha", async () => {
          await seed.dataBrowser.clearFilters();
          await seed.dataGrid.waitForData("Alpha");
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextSubmenuItem(/^filter$/i, /filter ≠ value/i);
          await seed.dataGrid.waitForData("Bravo");
          await seed.dataGrid.expectCellHidden("Alpha");
          await seed.dataGrid.expectCellVisible("Bravo");
        });

        await test.step("Clear then Filter IS NULL on note", async () => {
          await seed.dataBrowser.clearFilters();
          await seed.dataGrid.waitForData("Alpha");
          const nullCell = seed.dataGrid.grid.getByText("NULL", { exact: true }).first();
          await expect(nullCell).toBeVisible({ timeout: 15000 });
          await nullCell.click({ delay: 40 });
          await nullCell.click({ button: "right" });
          await expect(seed.dataGrid.contextMenuItem(/open fields/i)).toBeVisible({
            timeout: 5000,
          });
          await seed.dataGrid.clickContextSubmenuItem(/^filter$/i, /filter is null/i);
          await seed.dataGrid.waitForData("Alpha");
          await seed.dataGrid.expectCellVisible("Alpha");
          await seed.dataGrid.expectCellHidden("Bravo");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Cell and header sort and header hide copy", async ({ page, context }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-sort-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Sort descending from cell menu", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextMenuItem(/sort descending/i);
          await seed.dataGrid.waitForData("Hotel");
          const firstName = seed.dataGrid.grid.locator("tbody tr").first().getByText("Hotel");
          await expect(firstName).toBeVisible({ timeout: 15000 });
        });

        await test.step("Sort ascending from header menu", async () => {
          await seed.dataGrid.openHeaderContextMenu("name");
          await seed.dataGrid.clickContextMenuItem(/sort ascending/i);
          await seed.dataGrid.waitForData("Alpha");
          await expect(
            seed.dataGrid.grid.locator("tbody tr").first().getByText("Alpha"),
          ).toBeVisible({ timeout: 15000 });
        });

        await test.step("Copy column name from header", async () => {
          await seed.dataGrid.openHeaderContextMenu("score");
          await seed.dataGrid.clickContextMenuItem(/copy column name/i);
          await seed.dataGrid.expectCopiedToast();
          expect(await seed.dataGrid.readClipboard()).toBe("score");
        });

        await test.step("Hide column from header", async () => {
          await seed.dataGrid.expectHeaderColumnVisible("score", true);
          await seed.dataGrid.openHeaderContextMenu("score");
          await seed.dataGrid.clickContextMenuItem(/hide column/i);
          await seed.dataGrid.expectHeaderColumnVisible("score", false);
          await seed.dataGrid.expectCellVisible("Alpha");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });

  test("Safe Mode disables destructive menu items", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-safe-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;
    const safeMode = new SafeModePage(page);
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Enable Safe Mode 2", async () => {
          await safeMode.selectMode("safe_write");
        });

        await test.step("Destructive cell items are disabled", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.expectContextMenuItemDisabled(/duplicate row/i);
          await seed.dataGrid.expectContextMenuItemDisabled(/delete row/i);
          await seed.dataGrid.expectContextMenuItemDisabled(/set null/i);
          await seed.dataGrid.expectContextMenuItemDisabled(/add row/i);
        });

        await test.step("Restore Silent for cleanup", async () => {
          await seed.dataGrid.closeContextMenu();
          await safeMode.selectSilentWithPassword(config.password!);
        });
      } finally {
        try {
          await safeMode.selectSilentWithPassword(config.password!);
        } catch {
          /* best-effort */
        }
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });
});
