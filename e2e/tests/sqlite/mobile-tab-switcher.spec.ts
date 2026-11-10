import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupDataBrowserSeed,
  setupDataBrowserTable,
} from "../../helpers/dataBrowser";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { MobileShellPage } from "../../pages";

test.describe("Mobile tab switcher SQLite", () => {
  test("lists open tabs, switches between them and closes them", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `mobile-tabs-${suffix}`;
    const tableName = `e2e_mtabs_${suffix}`;
    const mobile = new MobileShellPage(page);
    const openTabsButton = page.getByRole("button", {
      name: "Open tabs",
      exact: true,
    });
    // Closed sheets stay in the DOM, so only count the visible one.
    const sheet = page.locator('[data-testid="bottom-sheet"]:visible');
    const rows = sheet.locator('[data-testid^="tab-switcher-row-"]');

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(
        page,
        connectionName,
        tableName,
        "sqlite",
      );
      try {
        await mobile.switchToMobile();
        await mobile.openTable(connectionName, tableName);
        await mobile.openEditor();
        await expect(sheet).toHaveCount(0);

        await test.step("The sheet lists every open tab and matches the badge", async () => {
          await mobile.newEditorButton.click();
          const count = Number(await mobile.tabCount.innerText());
          expect(count).toBeGreaterThanOrEqual(2);
          await openTabsButton.click();
          await expect(rows).toHaveCount(count);
          await expect(sheet.locator('[aria-selected="true"]')).toHaveCount(1);
        });

        await test.step("Picking another tab selects it and closes the sheet", async () => {
          const other = rows
            .locator("xpath=self::*[not(@aria-selected)]")
            .first();
          const otherId = await other.getAttribute("data-testid");
          await other.click();
          await expect(sheet).toHaveCount(0);
          await openTabsButton.click();
          await expect(sheet.getByTestId(otherId ?? "")).toHaveAttribute(
            "aria-selected",
            "true",
          );
        });

        await test.step("Closing a tab removes its row and lowers the badge", async () => {
          const before = await rows.count();
          // Closing the selected tab swaps the screen under the sheet, so close another one.
          await rows
            .locator("xpath=self::*[not(@aria-selected)]")
            .first()
            .getByRole("button", { name: "Close", exact: true })
            .click();
          await expect(rows).toHaveCount(before - 1);
          await rows.first().click();
          await expect(sheet).toHaveCount(0);
          await expect(mobile.tabCount).toHaveText(String(before - 1));
        });
      } finally {
        // The table lives in the throwaway SQLite file, so no DROP is needed.
        await mobile.switchToDesktop().catch(() => undefined);
        await cleanupDataBrowserSeed(seed);
      }
    });
  });
});
