import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Data Grid (query results)
 */
export class DataGridPage extends BasePage {
    readonly grid: Locator;
    readonly loadingIndicator: Locator;

    constructor(page: Page) {
        super(page);
        this.grid = page.locator('[data-testid="data-grid"], .data-grid, table').first();
        this.loadingIndicator = page.locator('[data-testid="loading"], .MuiCircularProgress-root').first();
    }

    async waitForData(): Promise<void> {
        await this.wait(500);
    }

    async expectCellVisible(text: string): Promise<void> {
        await expect(this.page.getByText(text)).toBeVisible();
    }

    async expectCellHidden(text: string): Promise<void> {
        await expect(this.page.getByText(text)).toBeHidden();
    }

    async expectRowCount(count: number): Promise<void> {
        const rows = this.grid.locator('tr, [role="row"]');
        await expect(rows).toHaveCount(count);
    }
}

