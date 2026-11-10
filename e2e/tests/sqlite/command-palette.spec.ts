import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  cleanupDataBrowserSeed,
  dropDataBrowserTable,
  setupDataBrowserTable,
} from "../../helpers/dataBrowser";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("Command palette SQLite", () => {
  test("opens with Alt+K, filters, runs commands and finds objects", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `palette-${suffix}`;
    const tableName = `e2e_palette_${suffix}`;
    const palette = page.getByTestId("command-palette");
    const input = page.getByTestId("command-palette-input");
    const tabs = page.locator(
      '[data-testid^="workspace-tab-"]:not([data-testid^="workspace-tab-icon-"])',
    );

    await withConnectionCleanup(page, connectionName, async () => {
      const seed = await setupDataBrowserTable(
        page,
        connectionName,
        tableName,
        "sqlite",
      );
      try {
        await test.step("Alt+K opens the palette with the input focused; Escape closes it", async () => {
          await page.keyboard.press("Alt+K");
          await expect(palette).toBeVisible();
          await expect(input).toBeFocused();
          await expect(page.getByRole("option").first()).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(palette).toBeHidden();
        });

        await test.step("Alt+K toggles it", async () => {
          await page.keyboard.press("Alt+K");
          await expect(palette).toBeVisible();
          await page.keyboard.press("Alt+K");
          await expect(palette).toBeHidden();
        });

        await test.step("Typing filters commands; no match shows the empty state", async () => {
          await page.keyboard.press("Alt+K");
          await input.fill("backup");
          await expect(
            page.getByRole("option", { name: /backup/i }).first(),
          ).toBeVisible();
          await expect(
            page.getByRole("option", { name: /Open settings/i }),
          ).toHaveCount(0);

          await input.fill("zzzz-no-such-command");
          await expect(page.getByRole("option")).toHaveCount(0);
          await expect(palette).toContainText("Nothing matches.");
        });

        await test.step("Arrow keys move the selection and Enter runs it", async () => {
          await input.fill("");
          const options = page.getByRole("option");
          await expect(options.first()).toHaveAttribute(
            "aria-selected",
            "true",
          );
          await page.keyboard.press("ArrowDown");
          await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
          await expect(options.first()).toHaveAttribute(
            "aria-selected",
            "false",
          );
          await page.keyboard.press("ArrowUp");
          await expect(options.first()).toHaveAttribute(
            "aria-selected",
            "true",
          );
        });

        await test.step("New SQL editor opens an editor tab and closes the palette", async () => {
          const before = await tabs.count();
          await input.fill("New SQL editor");
          await page.keyboard.press("Enter");
          await expect(palette).toBeHidden();
          await expect(tabs).toHaveCount(before + 1);
        });

        await test.step("Open settings runs by click", async () => {
          await page.keyboard.press("Alt+K");
          await input.fill("Open settings");
          await page.getByRole("option", { name: /Open settings/i }).click();
          await expect(palette).toBeHidden();
          await expect(
            tabs.filter({ hasText: "Settings" }).first(),
          ).toBeVisible();
        });

        await test.step("Object search finds the table and opens its data tab", async () => {
          await page.keyboard.press("Alt+K");
          await input.fill(tableName);
          const result = page.getByRole("option", { name: tableName });
          await expect(result).toBeVisible({ timeout: 15000 });
          await result.click();
          await expect(palette).toBeHidden();
          await expect(
            tabs.filter({ hasText: tableName }).first(),
          ).toBeVisible();
        });
      } finally {
        await dropDataBrowserTable(page, connectionName, tableName, "sqlite");
        await cleanupDataBrowserSeed(seed);
      }
    });
  });
});
