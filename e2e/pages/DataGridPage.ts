import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Data Grid (query results)
 */
export class DataGridPage extends BasePage {
  readonly grid: Locator;
  readonly loadingIndicator: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = page.locator('[data-testid="data-grid"], .data-grid, table').first();
    this.loadingIndicator = page.locator('[data-testid="loading"], .MuiCircularProgress-root').first();
    this.saveButton = page.getByTestId('grid-save');
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

  async editCell(text: string, newValue: string): Promise<void> {
    const cell = this.page.getByText(text, { exact: true }).first();
    await cell.dblclick();
    const input = this.page.locator('input').last();
    await input.fill(newValue);
    await input.press('Enter');
    await this.wait(300);
  }

  async saveChanges(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/query/update') && response.status() === 200,
      { timeout: 15000 }
    );
    await this.saveButton.click();
    await responsePromise;
    await this.wait(500);
  }

  async expectCellNotEditable(text: string): Promise<void> {
    const cell = this.page.getByText(text, { exact: true }).first();
    await cell.dblclick();
    await expect(this.page.locator('input').last()).toHaveCount(0);
  }
}
