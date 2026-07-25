import { expect, type Page, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for Data Grid (query results)
 */
export class DataGridPage extends BasePage {
  readonly grid: Locator;
  readonly loadingIndicator: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = page.getByTestId("data-grid");
    this.loadingIndicator = page
      .locator('[data-testid="loading"], .MuiCircularProgress-root')
      .first();
    this.saveButton = page.getByTestId("grid-save");
  }

  async waitForData(expectedText?: string): Promise<void> {
    await expect(this.grid).toBeVisible({ timeout: 15000 });
    if (expectedText) {
      await expect(this.grid.getByText(expectedText).first()).toBeVisible({
        timeout: 15000,
      });
      return;
    }
    await expect(this.grid.locator("tbody tr").first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectCellVisible(text: string): Promise<void> {
    await expect(this.grid.getByText(text).first()).toBeVisible();
  }

  async expectCellHidden(text: string): Promise<void> {
    await expect(this.grid.getByText(text)).toHaveCount(0);
  }

  async expectRowCount(count: number): Promise<void> {
    const rows = this.grid.locator('tr, [role="row"]');
    await expect(rows).toHaveCount(count);
  }

  async editCell(text: string, newValue: string): Promise<void> {
    // DataGrid uses a custom double-click (<200ms) on click handlers, not native dblclick.
    // Do not assert on the cell text between clicks — entering edit mode replaces the span with an input.
    const cell = this.grid.getByText(text, { exact: true }).first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click({ clickCount: 2, delay: 40 });

    const input = this.grid.locator('input:not([type="checkbox"])').last();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill(newValue);
    await input.press("Enter");
    await this.wait(300);
  }

  async saveChanges(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/query/update") && response.status() === 200,
      { timeout: 15000 },
    );
    await this.saveButton.click();
    await responsePromise;
    await this.wait(500);
  }

  async expectCellNotEditable(text: string): Promise<void> {
    const cell = this.grid.getByText(text, { exact: true }).first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click({ clickCount: 2, delay: 40 });
    await expect(
      this.grid.locator('input:not([type="checkbox"])'),
    ).toHaveCount(0);
  }
}
