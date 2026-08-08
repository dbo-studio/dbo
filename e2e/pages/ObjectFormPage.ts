import { expect, type Locator, type Page } from "@playwright/test";
import { API_DDL_TIMEOUT, apiRoute, waitForResponseDuring } from "../helpers/network";
import { BasePage } from "./BasePage";

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
    this.root = page.getByTestId("object-form");
    this.saveButton = page.getByTestId("object-form-save");
    this.cancelButton = page.getByTestId("object-form-cancel");
    this.addRowButton = page.getByTestId("object-form-add-row");
    this.previewModal = page.getByTestId("object-form-preview-modal");
    this.executeButton = page.getByTestId("object-form-execute");
    this.previewCancelButton = page.getByTestId("object-form-preview-cancel");
  }

  async waitForReady(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 30000 });
    await this.page
      .locator('[role="progressbar"]')
      .waitFor({ state: "hidden", timeout: 30000 })
      .catch(() => undefined);
  }

  getTab(tabId: string): Locator {
    return this.page.getByTestId(`object-form-tab-${tabId}`);
  }

  async selectTab(tabId: string): Promise<void> {
    await this.page.keyboard.press("Escape");
    const tab = this.getTab(tabId);
    if ((await tab.getAttribute("aria-selected")) !== "true") {
      await tab.click({ force: true });
    }
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
    const input = locator.locator("input").first();
    await this.page.keyboard.press("Escape");
    await input.waitFor({ state: "visible", timeout: 30000 });
    await input.click();
    await this.page.keyboard.press("ControlOrMeta+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.type(value, { delay: 20 });
    await input.blur();
    await this.wait(200);
  }

  async fillGeneralField(fieldId: string, value: string): Promise<void> {
    await this.fillTextField(this.getGeneralField(fieldId), value);
  }

  async fillArrayCell(
    rowIndex: number,
    fieldId: string,
    value: string,
  ): Promise<void> {
    await this.fillTextField(this.getArrayCell(rowIndex, fieldId), value);
  }

  private getCellCombobox(cell: Locator): Locator {
    return cell.getByRole("combobox");
  }

  async selectArrayCellOption(
    rowIndex: number,
    fieldId: string,
    optionLabel: string,
  ): Promise<void> {
    const cell = this.getArrayCell(rowIndex, fieldId);
    const combobox = this.getCellCombobox(cell);
    await combobox.click();
    await combobox.fill(optionLabel);

    const existingOption = this.page.getByRole("option", {
      name: optionLabel,
      exact: true,
    });
    if (await existingOption.isVisible().catch(() => false)) {
      await existingOption.click();
    } else {
      await this.page
        .getByRole("option", { name: `Create "${optionLabel}"` })
        .click();
    }

    await this.wait(300);
  }

  async selectMultiSelectOptions(
    rowIndex: number,
    fieldId: string,
    optionLabels: string[],
  ): Promise<void> {
    const cell = this.getArrayCell(rowIndex, fieldId);

    for (const label of optionLabels) {
      const combobox = this.getCellCombobox(cell);
      await combobox.click();
      await combobox.fill(label);

      const existingOption = this.page.getByRole("option", {
        name: label,
        exact: true,
      });
      if (await existingOption.isVisible().catch(() => false)) {
        await existingOption.click();
      } else {
        await this.page
          .getByRole("option", { name: `Create "${label}"` })
          .click();
      }

      await this.wait(200);
    }

    await this.page.keyboard.press("Escape");
    await this.wait(300);
  }

  async selectGeneralOption(
    fieldId: string,
    optionLabel: string,
  ): Promise<void> {
    const field = this.getGeneralField(fieldId);
    const combobox = this.getCellCombobox(field);
    await combobox.click();
    await combobox.fill(optionLabel);

    const existingOption = this.page.getByRole("option", {
      name: optionLabel,
      exact: true,
    });
    if (await existingOption.isVisible().catch(() => false)) {
      await existingOption.click();
    } else {
      await this.page
        .getByRole("option", { name: `Create "${optionLabel}"` })
        .click();
    }

    await this.wait(300);
  }

  async toggleArrayCheckbox(
    rowIndex: number,
    fieldId: string,
    checked = true,
  ): Promise<void> {
    const cell = this.getArrayCell(rowIndex, fieldId);
    const checkbox = cell.locator('input[type="checkbox"]');
    const isChecked = await checkbox.isChecked();

    if (isChecked !== checked) {
      await checkbox.click();
      await this.wait(200);
    }
  }

  async fillGeneralQueryField(fieldId: string, sql: string): Promise<void> {
    await this.fillQueryFieldViaStore(fieldId, sql);
  }

  private async fillQueryFieldViaStore(
    fieldId: string,
    sql: string,
  ): Promise<void> {
    const workspaceTabId = await this.root.getAttribute(
      "data-workspace-tab-id",
    );
    if (!workspaceTabId) {
      throw new Error("data-workspace-tab-id missing on object-form");
    }

    await this.page.evaluate(
      ({ tabId, fieldId, sqlText }) => {
        const store = (
          window as unknown as {
            __FORM_OBJECT_STORE__?: {
              getState: () => {
                updateGeneralField: (a: string, b: string, c: string) => void;
              };
            };
          }
        ).__FORM_OBJECT_STORE__;
        store?.getState().updateGeneralField(tabId, fieldId, sqlText);
      },
      { tabId: workspaceTabId, fieldId, sqlText: sql },
    );
    await this.wait(200);
  }

  async addRow(): Promise<void> {
    await this.addRowButton.click();
    await this.wait(300);
  }

  async arrayRowCount(fieldId: string): Promise<number> {
    return this.root
      .locator(`[data-testid^="object-form-cell-"][data-testid$="-${fieldId}"]`)
      .count();
  }

  /** Add an array row and return its index (counts existing rows first). */
  async addArrayRow(fieldId: string): Promise<number> {
    const rowIndex = await this.arrayRowCount(fieldId);
    await this.addRowButton.waitFor({ state: "visible", timeout: 10000 });
    await this.addRow();
    await expect(this.getArrayCell(rowIndex, fieldId)).toBeVisible({
      timeout: 15000,
    });
    return rowIndex;
  }

  async deleteArrayRow(rowIndex: number): Promise<void> {
    const deleteBtn = this.page.getByTestId(`object-form-delete-row-${rowIndex}`);
    await expect(deleteBtn).toBeVisible({ timeout: 15000 });
    await deleteBtn.click();
    await this.wait(300);
  }

  async save(): Promise<void> {
    const response = await waitForResponseDuring(
      this.page,
      apiRoute.objectPreview,
      () => this.saveButton.click(),
      API_DDL_TIMEOUT,
    );
    expect(response.status()).toBe(200);
    await expect(this.previewModal).toBeVisible({ timeout: 10000 });
  }

  async assertPreviewContains(text: string | RegExp): Promise<void> {
    await expect(this.previewModal).toContainText(text, { timeout: 30000 });
  }

  async confirmExecute(): Promise<void> {
    const response = await waitForResponseDuring(
      this.page,
      apiRoute.objectExecute,
      () => this.executeButton.click(),
      API_DDL_TIMEOUT,
    );
    if (response.status() !== 200) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Execute failed with ${response.status()}: ${body.slice(0, 500)}`,
      );
    }
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

  private getWorkspaceTab(title: string): Locator {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    return this.page.getByTestId(`workspace-tab-${slug}`);
  }

  private async resolveWorkspaceTab(title: string): Promise<Locator> {
    const byTestId = this.getWorkspaceTab(title);
    if (await byTestId.isVisible().catch(() => false)) {
      return byTestId;
    }

    return this.page.getByRole("button", { name: title, exact: true }).first();
  }

  async activateWorkspaceTab(title: string): Promise<void> {
    await this.ensureWorkspaceTab(title);
  }

  async ensureWorkspaceTab(title: string, altTitle?: string): Promise<void> {
    for (const candidate of [title, altTitle].filter((value): value is string =>
      Boolean(value),
    )) {
      const tab = await this.resolveWorkspaceTab(candidate);
      if (await tab.isVisible().catch(() => false)) {
        await this.page.keyboard.press("Escape");
        await tab.click();
        await this.wait(500);
        await this.waitForReady();
        return;
      }
    }

    const tab = await this.resolveWorkspaceTab(title);
    await expect(tab).toBeVisible({ timeout: 30000 });
    await this.page.keyboard.press("Escape");
    await tab.click();
    await this.wait(500);
    await this.waitForReady();
  }

  async closeWorkspaceTab(title: string): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const tab = await this.resolveWorkspaceTab(title);
      if (!(await tab.isVisible().catch(() => false))) {
        return;
      }

      await tab.hover();
      await tab.locator("svg").last().click({ force: true });

      const confirmClose = this.page.getByRole("button", { name: "Yes" });
      if (await confirmClose.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmClose.click();
        await expect(confirmClose).toBeHidden({ timeout: 5000 });
      }

      await this.wait(500);

      const byTestId = this.getWorkspaceTab(title);
      const byRole = this.page.getByRole("button", {
        name: title,
        exact: true,
      });
      const stillVisible =
        (await byTestId.isVisible().catch(() => false)) ||
        ((await byRole.count()) > 0 &&
          (await byRole
            .first()
            .isVisible()
            .catch(() => false)));
      if (!stillVisible) {
        return;
      }
    }
  }

  /** Close every workspace tab except the one matching `keepTitle`. */
  async closeStaleWorkspaceTabs(keepTitle: string): Promise<void> {
    const keepSlug = keepTitle.toLowerCase().replace(/\s+/g, "-");

    for (let attempt = 0; attempt < 30; attempt++) {
      const tabs = this.page.locator('[data-testid^="workspace-tab-"]');
      const count = await tabs.count();
      if (count === 0) {
        return;
      }

      let closedAny = false;

      for (let i = 0; i < count; i++) {
        const tab = tabs.nth(i);
        const testId = await tab.getAttribute("data-testid");
        if (testId === `workspace-tab-${keepSlug}`) {
          continue;
        }
        if (!(await tab.isVisible().catch(() => false))) {
          continue;
        }

        await tab.hover();
        await tab.locator("svg").last().click({ force: true });

        const confirmClose = this.page.getByRole("button", { name: "Yes" });
        if (
          await confirmClose.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await confirmClose.click();
          await expect(confirmClose).toBeHidden({ timeout: 5000 });
        }

        closedAny = true;
        await this.wait(300);
        break;
      }

      if (!closedAny) {
        return;
      }
    }
  }

  async closeAllWorkspaceTabs(): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt++) {
      const tabs = this.page.locator('[data-testid^="workspace-tab-"]');
      if ((await tabs.count()) === 0) {
        return;
      }

      const tab = tabs.first();
      if (!(await tab.isVisible().catch(() => false))) {
        return;
      }

      await tab.hover();
      await tab.locator("svg").last().click({ force: true });

      const confirmClose = this.page.getByRole("button", { name: "Yes" });
      if (await confirmClose.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmClose.click();
        await expect(confirmClose).toBeHidden({ timeout: 5000 });
      }

      await this.wait(300);
    }
  }
}
