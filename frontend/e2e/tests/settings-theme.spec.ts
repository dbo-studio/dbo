import { expect, test } from '@playwright/test';
import { ConnectionPage, SettingsPage, type ConnectionConfig } from '../pages';

/**
 * Settings & Theme Scenario
 * 
 * Tests settings and theme functionality using Page Object Model.
 */
test.describe('Settings & Theme', () => {
    const testPrefix = 'settings-test';

    test('Change theme and verify persistence', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        const connectionName = `${testPrefix}-theme-${Date.now()}`;
        const config: ConnectionConfig = {
            name: connectionName,
            host: 'sample-pgsql',
            port: '5432',
            username: 'default',
            password: 'secret',
            type: 'PostgreSQL'
        };

        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step('Setup connection', async () => {
            await connectionPage.setupConnection(config);
        });

        await test.step('Open settings and go to Appearance', async () => {
            await settingsPage.open();
            await settingsPage.navigateTo('Appearance');
            await settingsPage.expectPanelVisible('Application theme');
        });

        await test.step('Switch to Light theme', async () => {
            await settingsPage.selectLightTheme();
        });

        await test.step('Close settings', async () => {
            await settingsPage.close();
        });

        await test.step('Verify theme persists after refresh', async () => {
            await page.reload();
            await connectionPage.waitForReady();

            await settingsPage.open();
            await settingsPage.navigateTo('Appearance');
            await settingsPage.expectPanelVisible('Light');
            await settingsPage.expectPanelVisible('Dark');
        });

        await test.step('Switch to Dark theme', async () => {
            await settingsPage.selectDarkTheme();
            await settingsPage.close();
        });

        await test.step('Verify dark theme after refresh', async () => {
            await page.reload();
            await connectionPage.waitForReady();

            await settingsPage.open();
            await settingsPage.navigateTo('Appearance');
            await settingsPage.expectPanelVisible('Dark');
            await settingsPage.close();
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });

    test('Navigate through all settings panels', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        const connectionName = `${testPrefix}-panels-${Date.now()}`;
        const config: ConnectionConfig = {
            name: connectionName,
            host: 'sample-pgsql',
            port: '5432',
            username: 'default',
            password: 'secret',
            type: 'PostgreSQL'
        };

        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step('Setup connection', async () => {
            await connectionPage.setupConnection(config);
        });

        await test.step('Open settings', async () => {
            await settingsPage.open();
        });

        await test.step('Check General panel', async () => {
            await settingsPage.navigateTo('General');
            await settingsPage.expectPanelVisible('Debug mode');
            await settingsPage.expectPanelVisible('Check for updates');
        });

        await test.step('Check Appearance panel', async () => {
            await settingsPage.navigateTo('Appearance');
            await settingsPage.expectPanelVisible('Application theme');
            await settingsPage.expectPanelVisible('Application font');
            await settingsPage.expectPanelVisible('Editor theme');
        });

        await test.step('Check Shortcuts panel', async () => {
            await settingsPage.navigateTo('Shortcuts');
            await settingsPage.expectPanelVisible('Shortcuts');
        });

        await test.step('Check AI panel', async () => {
            await settingsPage.navigateTo('AI');
            await expect(page.getByText(/provider/i)).toBeVisible();
        });

        await test.step('Check About panel', async () => {
            await settingsPage.navigateTo('About');
            await settingsPage.expectPanelVisible('Version');
        });

        await test.step('Close settings', async () => {
            await settingsPage.close();
            await settingsPage.expectModalClosed();
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });

    test('Toggle sidebar visibility', async ({ page }) => {
        const connectionPage = new ConnectionPage(page);
        const settingsPage = new SettingsPage(page);

        const connectionName = `${testPrefix}-sidebar-${Date.now()}`;
        const config: ConnectionConfig = {
            name: connectionName,
            host: 'sample-pgsql',
            port: '5432',
            username: 'default',
            password: 'secret',
            type: 'PostgreSQL'
        };

        await connectionPage.goto();
        await connectionPage.waitForReady();

        await test.step('Setup connection', async () => {
            await connectionPage.setupConnection(config);
        });

        await test.step('Toggle left sidebar', async () => {
            const wasVisible = await settingsPage.isLeftSidebarVisible();

            await settingsPage.toggleLeftSidebar();

            if (wasVisible) {
                expect(await settingsPage.isLeftSidebarVisible()).toBe(false);
            } else {
                expect(await settingsPage.isLeftSidebarVisible()).toBe(true);
            }

            // Toggle back
            await settingsPage.toggleLeftSidebar();
        });

        await test.step('Toggle right sidebar', async () => {
            const wasVisible = await settingsPage.isRightSidebarVisible();

            await settingsPage.toggleRightSidebar();

            if (wasVisible) {
                expect(await settingsPage.isRightSidebarVisible()).toBe(false);
            } else {
                expect(await settingsPage.isRightSidebarVisible()).toBe(true);
            }

            // Toggle back
            await settingsPage.toggleRightSidebar();
        });

        await test.step('Cleanup', async () => {
            await connectionPage.deleteConnection(connectionName);
        });
    });
});
