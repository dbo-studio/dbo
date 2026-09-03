import { expect, test } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  cleanupDataBrowserSeed,
  dropDataBrowserTable,
  setupContextMenuTable,
} from "./dataGridContextMenus";
import { withConnectionCleanup } from "./safeCleanup";
import { SafeModePage } from "../pages";

/**
 * Same data-grid context menu depth for every shipped engine.
 */
export function defineDataGridContextMenuTests(engine: DbEngine): void {
  const label =
    engine === "postgresql"
      ? "PostgreSQL"
      : engine === "mysql"
        ? "MySQL"
        : "SQLite";

  test.describe(`Data grid context menus ${label}`, () => {
  test("Empty area Add row and Refresh", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-empty-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
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
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
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
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
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
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
      }
    });
  });

  test("Cell set null empty default Duplicate and Delete", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-edit-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
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
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
      }
    });
  });

  test("Cell filter equals value", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-feq-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Filter = Charlie from cell menu", async () => {
          await seed.dataGrid.openCellContextMenu("Charlie");
          await seed.dataGrid.clickContextSubmenuItem(/^filter$/i, /filter = value/i);
          await seed.dataGrid.waitForData("Charlie");
          await seed.dataGrid.expectCellVisible("Charlie");
          await seed.dataGrid.expectCellHidden("Alpha");
          await seed.dataGrid.expectCellHidden("Hotel");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
      }
    });
  });

  test("Cell filter not-equals value", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-fneq-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Filter ≠ Alpha from cell menu", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.clickContextSubmenuItem(/^filter$/i, /filter ≠ value/i);
          await seed.dataGrid.waitForData("Bravo");
          await seed.dataGrid.expectCellHidden("Alpha");
          await seed.dataGrid.expectCellVisible("Bravo");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
      }
    });
  });

  test("Cell filter IS NULL", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-fnul-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Filter IS NULL on note cell", async () => {
          const nullCell = seed.dataGrid.grid.getByText("NULL", { exact: true }).first();
          await expect(nullCell).toBeVisible({ timeout: 15000 });
          await nullCell.click({ delay: 40 });
          await nullCell.click({ button: "right" });
          await expect(seed.dataGrid.contextMenuItem(/open fields/i)).toBeVisible({
            timeout: 5000,
          });
          await seed.dataGrid.clickContextSubmenuItem(/^filter$/i, /^filter is null$/i);
          await seed.dataGrid.waitForData("Alpha");
          await seed.dataGrid.expectCellVisible("Alpha");
          await seed.dataGrid.expectCellHidden("Bravo");
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
      }
    });
  });

  test("Cell and header sort and header hide copy", async ({ page, context }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-sort-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
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
        await dropDataBrowserTable(page, connectionName, tableName, engine);
          await cleanupDataBrowserSeed(seed);
      }
    });
  });

  test("Safe Mode disables destructive menu items", async ({ page }, testInfo) => {
    test.skip(engine === "sqlite", "Safe Mode is not available on SQLite");
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `grid-ctx-safe-${suffix}`;
    const tableName = `e2e_grid_ctx_${suffix}`;
    const safeMode = new SafeModePage(page);

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName, engine);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Enable Safe Mode 2", async () => {
          await safeMode.selectMode("safe_write");
          await seed.dataGrid.waitForData("Alpha");
        });

        await test.step("Destructive cell items are disabled", async () => {
          await seed.dataGrid.openCellContextMenu("Alpha");
          await seed.dataGrid.expectContextMenuItemDisabledByTestId("duplicate-row");
          await seed.dataGrid.expectContextMenuItemDisabledByTestId("delete-row");
          await seed.dataGrid.expectContextMenuItemDisabledByTestId("set-null");
          await seed.dataGrid.expectContextMenuItemDisabledByTestId("add-row");
          await seed.dataGrid.closeContextMenu();
        });
      } finally {
        // Connection is deleted by withConnectionCleanup — no need to restore Silent.
        await dropDataBrowserTable(page, connectionName, tableName, engine).catch(
          () => undefined,
        );
        await cleanupDataBrowserSeed(seed);
      }
    });
  });
  });
}
