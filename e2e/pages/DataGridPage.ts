import { expect, type Page, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for Data Grid (query results)
 */
export class DataGridPage extends BasePage {
  readonly grid: Locator;
  readonly loadingIndicator: Locator;
  readonly saveButton: Locator;
  readonly addRowButton: Locator;
  readonly removeRowButton: Locator;
  readonly discardButton: Locator;
  readonly refreshButton: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = page.getByTestId("data-grid");
    this.loadingIndicator = page
      .locator('[data-testid="loading"], .MuiCircularProgress-root')
      .first();
    this.saveButton = page.getByTestId("grid-save");
    this.addRowButton = page.getByRole("button", { name: /add row/i });
    this.removeRowButton = page.getByRole("button", { name: /remove row/i });
    this.discardButton = page.getByRole("button", {
      name: /discard changes/i,
    });
    this.refreshButton = page.getByTestId("refresh-query");
    this.nextPageButton = page.getByRole("button", { name: /next page/i });
    this.previousPageButton = page.getByRole("button", {
      name: /previous page/i,
    });
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
    await expect(this.grid.getByText(text, { exact: true }).first()).toBeVisible();
  }

  async expectCellHidden(text: string): Promise<void> {
    await expect(this.grid.getByText(text, { exact: true })).toHaveCount(0);
  }

  async expectDataRowCount(count: number): Promise<void> {
    await expect(this.grid).toBeVisible({ timeout: 15000 });
    const rows = this.grid.locator("tbody tr");
    await expect(rows).toHaveCount(count, { timeout: 15000 });
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

  /**
   * Edit a NULL/empty cell in the last grid row (used after Add row).
   * `columnIndex` is 0-based among data columns (skips the leading checkbox column).
   */
  async editLastRowEmptyCell(
    columnIndex: number,
    newValue: string,
  ): Promise<void> {
    const lastRow = this.grid.locator("tbody tr").last();
    await expect(lastRow).toBeVisible({ timeout: 10000 });
    // +1 skips the checkbox column
    const cell = lastRow.locator("td").nth(columnIndex + 1);
    await expect(cell).toBeVisible({ timeout: 5000 });
    await cell.click({ clickCount: 2, delay: 40 });

    const input = this.grid.locator('input:not([type="checkbox"])').last();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill(newValue);
    await input.press("Enter");
    await this.wait(300);
  }

  async clickSave(): Promise<void> {
    await expect(this.saveButton).toBeEnabled({ timeout: 10000 });
    await this.saveButton.click();
  }

  async saveChanges(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/query/update") && response.status() === 200,
      { timeout: 15000 },
    );
    await this.clickSave();
    await responsePromise;
    await this.wait(500);
  }

  async addRow(): Promise<void> {
    await expect(this.addRowButton).toBeEnabled({ timeout: 10000 });
    await this.addRowButton.click();
    await this.wait(300);
  }

  async removeRow(): Promise<void> {
    await expect(this.removeRowButton).toBeEnabled({ timeout: 10000 });
    await this.removeRowButton.click();
    await this.wait(300);
  }

  async discardChanges(): Promise<void> {
    await expect(this.discardButton).toBeEnabled({ timeout: 10000 });
    await this.discardButton.click();
    await this.wait(300);
  }

  async refreshQuery(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/query/raw") &&
        response.request().method() === "POST" &&
        response.status() === 200,
      { timeout: 15000 },
    );
    await expect(this.refreshButton).toBeVisible({ timeout: 10000 });
    await this.refreshButton.click();
    await responsePromise;
    await this.wait(300);
  }

  async selectRowByCellText(text: string): Promise<void> {
    const row = this.grid.locator("tbody tr").filter({ hasText: text }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const checkbox = row.getByRole("checkbox");
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    // MUI controlled checkbox: click fires onChange more reliably than check().
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    await expect(checkbox).toBeChecked();
  }

  private async waitForRawQuery(): Promise<void> {
    await this.page.waitForResponse(
      (response) =>
        response.url().includes("/query/raw") &&
        response.request().method() === "POST" &&
        response.status() === 200,
      { timeout: 15000 },
    );
  }

  async goToNextPage(): Promise<void> {
    const responsePromise = this.waitForRawQuery();
    await expect(this.nextPageButton).toBeEnabled({ timeout: 10000 });
    await this.nextPageButton.click();
    await responsePromise;
    await this.wait(300);
  }

  async goToPreviousPage(): Promise<void> {
    const responsePromise = this.waitForRawQuery();
    await expect(this.previousPageButton).toBeEnabled({ timeout: 10000 });
    await this.previousPageButton.click();
    await responsePromise;
    await this.wait(300);
  }

  async expectNextPageDisabled(): Promise<void> {
    await expect(this.nextPageButton).toBeDisabled({ timeout: 10000 });
  }

  async expectPreviousPageDisabled(): Promise<void> {
    await expect(this.previousPageButton).toBeDisabled({ timeout: 10000 });
  }

  /** Settings icon immediately before the Previous page control. */
  private get paginationSettingsButton(): Locator {
    return this.previousPageButton.locator("xpath=preceding-sibling::button[1]");
  }

  async setPageLimit(limit: number): Promise<void> {
    await expect(this.paginationSettingsButton).toBeVisible({ timeout: 10000 });
    await this.paginationSettingsButton.click();

    // FieldInput uses a caption + placeholder, not an accessible <label>.
    const limitInput = this.page.getByPlaceholder(/^limit$/i);
    await expect(limitInput).toBeVisible({ timeout: 5000 });
    await limitInput.fill(String(limit));

    const responsePromise = this.waitForRawQuery();
    const popper = this.page
      .locator(".MuiPopper-root")
      .filter({ has: limitInput });
    const saveButton = popper.getByRole("button", { name: /^save$/i });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    await responsePromise;
    await this.wait(300);
  }

  async expectEditActionsVisible(visible: boolean): Promise<void> {
    if (visible) {
      await expect(this.addRowButton).toBeVisible({ timeout: 10000 });
      await expect(this.saveButton).toBeVisible({ timeout: 10000 });
      await expect(this.discardButton).toBeVisible({ timeout: 10000 });
      return;
    }
    await expect(this.addRowButton).toHaveCount(0);
    await expect(this.saveButton).toHaveCount(0);
    await expect(this.discardButton).toHaveCount(0);
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
