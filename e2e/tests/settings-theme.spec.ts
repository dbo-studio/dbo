import { expect, test } from "@playwright/test";
import { getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage, SettingsPage } from "../pages";

/**
 * Settings & Theme Scenario
 *
 * Tests settings and theme functionality using Page Object Model.
 */
test.describe("Settings & Theme", () => {
  const testPrefix = "settings-test";

  test("Change theme and verify persistence", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    const connectionName = `${testPrefix}-theme-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Open settings and go to Appearance", async () => {
        await settingsPage.open();
        await settingsPage.navigateTo("Appearance");
        await settingsPage.expectPanelVisible("Application theme");
      });

      await test.step("Switch to Light theme", async () => {
        await settingsPage.selectLightTheme();
      });

      await test.step("Close settings", async () => {
        await settingsPage.close();
      });

      await test.step("Verify theme persists after refresh", async () => {
        await page.reload();
        await connectionPage.waitForReady();

        await settingsPage.open();
        await settingsPage.navigateTo("Appearance");
        await settingsPage.expectPanelVisible("Light");
        await settingsPage.expectPanelVisible("Dark");
      });

      await test.step("Switch to Dark theme", async () => {
        await settingsPage.selectDarkTheme();
        await settingsPage.close();
      });

      await test.step("Verify dark theme after refresh", async () => {
        await page.reload();
        await connectionPage.waitForReady();

        await settingsPage.open();
        await settingsPage.navigateTo("Appearance");
        await settingsPage.expectPanelVisible("Dark");
        await settingsPage.close();
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Navigate through all settings panels", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    const connectionName = `${testPrefix}-panels-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Open settings", async () => {
        await settingsPage.open();
      });

      await test.step("Check General panel", async () => {
        await settingsPage.navigateTo("General");
        await settingsPage.expectPanelVisible("Debug mode");
        await settingsPage.expectPanelVisible("Check for updates");
      });

      await test.step("Check Appearance panel", async () => {
        await settingsPage.navigateTo("Appearance");
        await settingsPage.expectPanelVisible("Application theme");
        await settingsPage.expectPanelVisible("Application font");
        await settingsPage.expectPanelVisible("Editor theme");
      });

      await test.step("Check Shortcuts panel", async () => {
        await settingsPage.navigateTo("Shortcuts");
        await settingsPage.expectPanelVisible("Run");
        await settingsPage.expectPanelVisible("New tab");
      });

      await test.step("Check AI panel", async () => {
        await settingsPage.navigateTo("AI");
        await expect(
          page.getByRole("tab", { name: "Providers" }),
        ).toBeVisible();
      });

      await test.step("Check About panel", async () => {
        await settingsPage.navigateTo("About");
        await settingsPage.expectPanelVisible("Version");
      });

      await test.step("Close settings", async () => {
        await settingsPage.close();
        await settingsPage.expectModalClosed();
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Toggle sidebar visibility", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);

    const connectionName = `${testPrefix}-sidebar-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Setup connection", async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step("Toggle left sidebar", async () => {
        const itemsTab = settingsPage.leftSidebarTab();
        const wasVisible = await itemsTab.isVisible().catch(() => false);

        await settingsPage.toggleLeftSidebar();

        if (wasVisible) {
          await expect(itemsTab).toBeHidden({ timeout: 10000 });
        } else {
          await expect(itemsTab).toBeVisible({ timeout: 10000 });
        }

        await settingsPage.toggleLeftSidebar();
        if (wasVisible) {
          await expect(itemsTab).toBeVisible({ timeout: 10000 });
        } else {
          await expect(itemsTab).toBeHidden({ timeout: 10000 });
        }
      });

      await test.step("Toggle right sidebar", async () => {
        const assistantTab = settingsPage.rightSidebarTab();
        const wasVisible = await assistantTab.isVisible().catch(() => false);

        await settingsPage.toggleRightSidebar();

        if (wasVisible) {
          await expect(assistantTab).toBeHidden({ timeout: 10000 });
        } else {
          await expect(assistantTab).toBeVisible({ timeout: 10000 });
        }

        await settingsPage.toggleRightSidebar();
        if (wasVisible) {
          await expect(assistantTab).toBeVisible({ timeout: 10000 });
        } else {
          await expect(assistantTab).toBeHidden({ timeout: 10000 });
        }
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });
});
