import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type SettingsPanel = 'General' | 'Appearance' | 'Shortcuts' | 'AI' | 'About';

/**
 * Page Object for Settings modal
 */
export class SettingsPage extends BasePage {
    readonly settingsButton: Locator;
    readonly modal: Locator;

    // Menu items
    readonly generalMenuItem: Locator;
    readonly appearanceMenuItem: Locator;
    readonly shortcutsMenuItem: Locator;
    readonly aiMenuItem: Locator;
    readonly aboutMenuItem: Locator;

    // Theme options
    readonly lightTheme: Locator;
    readonly darkTheme: Locator;

    // Sidebar toggles
    readonly leftSidebarButton: Locator;
    readonly rightSidebarButton: Locator;

    constructor(page: Page) {
        super(page);

        this.settingsButton = page.getByRole('button', { name: 'settings' });
        this.modal = page.locator('[role="dialog"]');

        this.generalMenuItem = page.getByText('General').first();
        this.appearanceMenuItem = page.getByText('Appearance').first();
        this.shortcutsMenuItem = page.getByText('Shortcuts').first();
        this.aiMenuItem = page.getByText('AI').first();
        this.aboutMenuItem = page.getByText('About').first();

        this.lightTheme = page.getByText('Light');
        this.darkTheme = page.getByText('Dark');

        this.leftSidebarButton = page.getByRole('button', { name: 'sideLeft' });
        this.rightSidebarButton = page.getByRole('button', { name: 'sideRight' });
    }

    async open(): Promise<void> {
        await this.settingsButton.click();
        await this.wait(500);
    }

    async close(): Promise<void> {
        await this.pressKey('Escape');
        await this.wait(300);
    }

    async navigateTo(panel: SettingsPanel): Promise<void> {
        switch (panel) {
            case 'General':
                await this.generalMenuItem.click();
                break;
            case 'Appearance':
                await this.appearanceMenuItem.click();
                break;
            case 'Shortcuts':
                await this.shortcutsMenuItem.click();
                break;
            case 'AI':
                await this.aiMenuItem.click();
                break;
            case 'About':
                await this.aboutMenuItem.click();
                break;
        }
        await this.wait(300);
    }

    async selectLightTheme(): Promise<void> {
        await this.lightTheme.click();
        await this.wait(500);
    }

    async selectDarkTheme(): Promise<void> {
        await this.darkTheme.click();
        await this.wait(500);
    }

    async toggleLeftSidebar(): Promise<void> {
        await this.leftSidebarButton.click();
        await this.wait(500);
    }

    async toggleRightSidebar(): Promise<void> {
        await this.rightSidebarButton.click();
        await this.wait(500);
    }

    async isLeftSidebarVisible(): Promise<boolean> {
        return await this.page.getByRole('tab', { name: 'Items' }).isVisible().catch(() => false);
    }

    async isRightSidebarVisible(): Promise<boolean> {
        return await this.page.getByRole('tab', { name: 'Assistant' }).isVisible().catch(() => false);
    }

    // Assertions
    async expectPanelVisible(content: string): Promise<void> {
        await expect(this.page.getByText(content)).toBeVisible();
    }

    async expectModalClosed(): Promise<void> {
        await expect(this.page.getByText('Application theme')).toBeHidden();
    }
}

