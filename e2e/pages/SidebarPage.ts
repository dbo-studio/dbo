import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type SidebarTab = 'Items' | 'Queries' | 'History';

/**
 * Page Object for Sidebar (Items, Queries, History tabs)
 */
export class SidebarPage extends BasePage {
    readonly itemsTab: Locator;
    readonly queriesTab: Locator;
    readonly historyTab: Locator;

    constructor(page: Page) {
        super(page);
        this.itemsTab = page.getByRole('tab', { name: 'Items' });
        this.queriesTab = page.getByRole('tab', { name: 'Queries' });
        this.historyTab = page.getByRole('tab', { name: 'History' });
    }

    getTab(tabName: SidebarTab): Locator {
        switch (tabName) {
            case 'Items':
                return this.itemsTab;
            case 'Queries':
                return this.queriesTab;
            case 'History':
                return this.historyTab;
        }
    }

    async switchTo(tabName: SidebarTab): Promise<void> {
        await this.getTab(tabName).click();
        await this.wait(500);
    }

    async findItem(text: string): Locator {
        return this.page.getByText(text).first();
    }

    async openItemContextMenu(text: string): Promise<void> {
        const item = this.page.getByText(text).first();
        await item.click();
        await item.click({ button: 'right' });
        await this.wait(300);
    }

    async clickContextMenuItem(name: string): Promise<void> {
        await this.page.getByRole('menuitem', { name }).click();
    }

    async runItemFromContextMenu(text: string): Promise<void> {
        await this.openItemContextMenu(text);
        await this.clickContextMenuItem('Run');
        await this.wait(1000);
    }

    async copyItemFromContextMenu(text: string): Promise<void> {
        await this.openItemContextMenu(text);
        await this.clickContextMenuItem('Copy');
        await expect(this.page.getByText(/copied successfully/i)).toBeVisible({ timeout: 5000 });
    }

    async deleteItemFromContextMenu(text: string): Promise<void> {
        await this.openItemContextMenu(text);
        await this.clickContextMenuItem('Delete');
        await expect(this.page.getByRole('heading', { name: 'Delete action!' })).toBeVisible();
        await this.page.getByRole('button', { name: 'Yes' }).click();
        await this.wait(1000);
    }

    async expectItemVisible(text: string): Promise<void> {
        await expect(this.page.getByText(text)).toBeVisible();
    }

    async expectItemHidden(text: string): Promise<void> {
        await expect(this.page.getByText(text)).toBeHidden();
    }
}

