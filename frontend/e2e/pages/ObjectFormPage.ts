import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Object Form (create/edit database objects)
 */
export class ObjectFormPage extends BasePage {
  readonly root: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly addRowButton: Locator;
  readonly previewModal: Locator;
  readonly executeButton: Locator;
  readonly previewCancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByTestId('object-form');
    this.saveButton = page.getByTestId('object-form-save');
    this.cancelButton = page.getByTestId('object-form-cancel');
    this.addRowButton = page.getByTestId('object-form-add-row');
    this.previewModal = page.getByTestId('object-form-preview-modal');
    this.executeButton = page.getByTestId('object-form-execute');
    this.previewCancelButton = page.getByTestId('object-form-preview-cancel');
  }

  async waitForReady(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 30000 });
    await this.page
      .locator('[role="progressbar"]')
      .waitFor({ state: 'hidden', timeout: 30000 })
      .catch(() => undefined);
  }

  getTab(tabId: string): Locator {
    return this.page.getByTestId(`object-form-tab-${tabId}`);
  }

  async selectTab(tabId: string): Promise<void> {
    await this.getTab(tabId).click();
    await this.wait(500);
    await this.waitForReady();
  }

  getGeneralField(fieldId: string): Locator {
    return this.page.getByTestId(`object-form-field-${fieldId}`);
  }

  getArrayCell(rowIndex: number, fieldId: string): Locator {
    return this.page.getByTestId(`object-form-cell-${rowIndex}-${fieldId}`);
  }

  async fillTextField(locator: Locator, value: string): Promise<void> {
    const input = locator.locator('input').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(value);
    await input.blur();
  }

  async fillGeneralField(fieldId: string, value: string): Promise<void> {
    await this.fillTextField(this.getGeneralField(fieldId), value);
  }

  async fillArrayCell(rowIndex: number, fieldId: string, value: string): Promise<void> {
    await this.fillTextField(this.getArrayCell(rowIndex, fieldId), value);
  }

  async selectArrayCellOption(rowIndex: number, fieldId: string, optionLabel: string): Promise<void> {
    const cell = this.getArrayCell(rowIndex, fieldId);
    await cell.locator('input').first().click();
    await this.page.getByRole('option', { name: optionLabel, exact: true }).click();
    await this.wait(300);
  }

  async addRow(): Promise<void> {
    await this.addRowButton.click();
    await this.wait(300);
  }

  async save(): Promise<void> {
    const previewPromise = this.page.waitForResponse((response) => response.url().includes('/fields/object/preview'), {
      timeout: 30000
    });
    await this.saveButton.click();
    const response = await previewPromise;
    expect(response.status()).toBe(200);
    await expect(this.previewModal).toBeVisible({ timeout: 10000 });
  }

  async assertPreviewContains(text: string | RegExp): Promise<void> {
    await expect(this.previewModal).toContainText(text);
  }

  async confirmExecute(): Promise<void> {
    const executePromise = this.page.waitForResponse(
      (response) => response.url().includes('/fields/object') && !response.url().includes('/preview'),
      { timeout: 60000 }
    );
    await this.executeButton.click();
    const response = await executePromise;
    expect(response.status()).toBe(200);
    await expect(this.previewModal).toBeHidden({ timeout: 10000 });
  }

  async saveAndExecute(): Promise<void> {
    await this.save();
    await this.confirmExecute();
  }

  async cancelPreview(): Promise<void> {
    await this.previewCancelButton.click();
    await expect(this.previewModal).toBeHidden();
  }
}
