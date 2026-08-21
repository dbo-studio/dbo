import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  dropDataBrowserTable,
  setupContextMenuTable,
} from "../helpers/dataGridContextMenus";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../pages";

/**
 * Keyboard shortcuts K0 — cheatsheet + grid chord tooltips (web = Alt).
 * Prefer UI/testid over flaky chord-driven flows for assertions.
 */
test.describe("Keyboard shortcuts", () => {
  test("Shortcuts cheatsheet lists core chords and filters", async ({
    page,
  }) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.dismissNewConnectionModalIfOpen();

    await test.step("Open Settings → Shortcuts", async () => {
      await settingsPage.open();
      await settingsPage.navigateTo("Shortcuts");
      await settingsPage.expectShortcutsCheatsheet();
    });

    await test.step("Filter shortcuts by Save", async () => {
      await settingsPage.filterShortcuts("save");
      await expect(page.getByText("Save", { exact: true })).toBeVisible();
      await expect(page.getByText("New tab", { exact: true })).toBeHidden();
    });

    await test.step("Clear filter restores groups", async () => {
      await settingsPage.filterShortcuts("");
      await expect(page.getByText("Editor", { exact: true })).toBeVisible();
      await expect(page.getByText("New tab", { exact: true })).toBeVisible();
    });

    await settingsPage.close();
  });

  test("Alt+/ opens Shortcuts cheatsheet", async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.dismissNewConnectionModalIfOpen();

    await test.step("Open via keyboard shortcut", async () => {
      await settingsPage.openShortcutsViaKeyboard();
      await settingsPage.expectShortcutsCheatsheet();
    });

    await settingsPage.close();
  });

  test("Grid Save and Refresh tooltips show chords", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `kb-shortcuts-${suffix}`;
    const tableName = `e2e_kb_sc_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupContextMenuTable(page, connectionName, tableName);
      try {
        await seed.dataBrowser.openTableFromTree(seed.treePath, tableName);
        await seed.dataGrid.waitForData("Alpha");

        await test.step("Refresh tooltip includes R chord", async () => {
          await expect(seed.dataGrid.refreshButton).toBeVisible({
            timeout: 10000,
          });
          await seed.dataGrid.refreshButton.hover();
          await expect(
            page.getByRole("tooltip").filter({ hasText: /Refresh/i }),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            page.getByRole("tooltip").filter({ hasText: /R/ }),
          ).toBeVisible();
        });

        await test.step("Save tooltip includes S chord when editable", async () => {
          await expect(seed.dataGrid.saveButton).toBeVisible({
            timeout: 10000,
          });
          await seed.dataGrid.saveButton.hover();
          await expect(
            page.getByRole("tooltip").filter({ hasText: /Save/i }),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            page.getByRole("tooltip").filter({ hasText: /S/ }),
          ).toBeVisible();
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName);
      }
    });
  });
});
