import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupDataBrowserSeed,
  dropDataBrowserTable,
  setupDataBrowserTable,
} from "../../helpers/dataBrowser";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { MobileShellPage, SqlEditorPage } from "../../pages";

test.describe("Mobile shell SQLite", () => {
  test("Browse to a table, edit a row as cards and run a query", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `mobile-shell-${suffix}`;
    const tableName = `e2e_mobile_${suffix}`;
    const mobile = new MobileShellPage(page);
    const editor = new SqlEditorPage(page);

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(page, connectionName, tableName, "sqlite");
      try {
        await test.step("Switch to phone viewport", async () => {
          await mobile.switchToMobile();
          await expect(mobile.desktopOnlyControls).toHaveCount(0);
        });

        await test.step("Pull down on the explorer to reload the tree", async () => {
          await mobile.selectConnection(connectionName);
          await mobile.openTab("explore");
          const reload = page.waitForRequest((req) => req.url().includes("/api/tree"));
          await mobile.pullDown(mobile.treeList);
          await reload;
        });

        await test.step("Open table through connect and explore tabs", async () => {
          await mobile.openTable(connectionName, tableName);
          await expect(mobile.rowCard("Alpha")).toBeVisible({ timeout: 15000 });
        });

        await test.step("Edit a row in the sheet and save", async () => {
          await mobile.editRowField("Alpha", "name", "Alpha mobile");
          await expect(page.getByText("1 unsaved changes")).toBeVisible();
          await mobile.saveButton.click();
          await expect(mobile.rowCard("Alpha mobile")).toBeVisible({ timeout: 15000 });
          await expect(page.getByText("unsaved changes")).toBeHidden();
        });

        await test.step("Run a query in a new editor and see results", async () => {
          await mobile.openEditor();
          await editor.focus();
          await mobile.sqlKey("SELECT").click();
          await expect(editor.editor).toContainText("SELECT");
          await editor.typeQuery(`SELECT name FROM ${tableName} WHERE name = 'Alpha mobile'`);
          await editor.runQuery();
          await expect(page.getByText("Alpha mobile").first()).toBeVisible({ timeout: 15000 });
          await expect(mobile.desktopOnlyControls).toHaveCount(0);
        });

        await test.step("Plus opens another editor even when the current one is empty", async () => {
          const before = Number(await mobile.tabCount.innerText());
          await mobile.newEditorButton.click();
          await expect(mobile.tabCount).toHaveText(String(before + 1));
          await mobile.newEditorButton.click();
          await expect(mobile.tabCount).toHaveText(String(before + 2));
        });
      } finally {
        // Cleanup helpers drive the desktop UI.
        await mobile.switchToDesktop().catch(() => undefined);
        await dropDataBrowserTable(page, connectionName, tableName, "sqlite");
        await cleanupDataBrowserSeed(seed);
      }
    });
  });
});
