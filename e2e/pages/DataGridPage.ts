import { expect, type Page, type Locator } from "@playwright/test";
import { apiRoute, pendingResponse, waitForResponseDuring } from "../helpers/network";
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
    await waitForResponseDuring(
      this.page,
      apiRoute.queryUpdate,
      () => this.clickSave(),
    );
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
    await expect(this.refreshButton).toBeVisible({ timeout: 10000 });
    await waitForResponseDuring(
      this.page,
      apiRoute.queryFetch,
      () => this.refreshButton.click(),
    );
  }

  async selectRowByCellText(text: string): Promise<void> {
    const row = this.grid.locator("tbody tr").filter({ hasText: text }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const checkbox = row.getByRole("checkbox", { name: /select row/i });
    await expect(checkbox).toBeVisible({ timeout: 5000 });
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    await expect(checkbox).toBeChecked();
  }

  async toggleBooleanCell(columnAriaLabel: string): Promise<void> {
    const checkbox = this.grid.getByRole("checkbox", { name: columnAriaLabel }).first();
    await expect(checkbox).toBeVisible({ timeout: 15000 });
    // Tri-state cycle: false → null → true (or true → false). Advance until checked flips as expected.
    const wasChecked = await checkbox.isChecked();
    const wasMixed = (await checkbox.getAttribute("aria-checked")) === "mixed";
    await checkbox.click();
    if (wasChecked) {
      await expect(checkbox).not.toBeChecked({ timeout: 5000 });
      return;
    }
    if (wasMixed) {
      await expect(checkbox).toBeChecked({ timeout: 5000 });
      return;
    }
    // Unchecked false → NULL (still unchecked). One more click reaches true.
    await expect(checkbox).toHaveAttribute("aria-checked", "mixed", { timeout: 5000 });
    await checkbox.click();
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  }

  async clickBooleanCell(columnAriaLabel: string): Promise<void> {
    const checkbox = this.grid.getByRole("checkbox", { name: columnAriaLabel }).first();
    await expect(checkbox).toBeVisible({ timeout: 15000 });
    await checkbox.click();
  }

  async expectBooleanCellState(
    columnAriaLabel: string,
    state: "checked" | "unchecked" | "null",
  ): Promise<void> {
    const checkbox = this.grid.getByRole("checkbox", { name: columnAriaLabel }).first();
    await expect(checkbox).toBeVisible({ timeout: 15000 });
    if (state === "checked") {
      await expect(checkbox).toBeChecked({ timeout: 5000 });
      await expect(checkbox).toHaveAttribute("aria-checked", "true");
      return;
    }
    if (state === "unchecked") {
      await expect(checkbox).not.toBeChecked({ timeout: 5000 });
      await expect(checkbox).toHaveAttribute("aria-checked", "false");
      return;
    }
    await expect(checkbox).toHaveAttribute("aria-checked", "mixed", {
      timeout: 5000,
    });
  }

  async selectEnumCell(currentText: string, nextValue: string): Promise<void> {
    const cell = this.grid.getByText(currentText, { exact: true }).first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click({ clickCount: 2, delay: 40 });
    const select = this.grid.getByTestId("grid-cell-enum");
    await expect(select).toBeVisible({ timeout: 5000 });
    await select.selectOption(nextValue);
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
  }

  async expectForeignKeyBadge(tooltip?: string | RegExp): Promise<void> {
    const badge = this.grid.locator("thead").getByText("FK", { exact: true }).first();
    await expect(badge).toBeVisible({ timeout: 15000 });
    if (tooltip) {
      await expect(badge).toHaveAttribute("title", tooltip);
    }
  }

  async openFkLookupInRow(rowText: string, fkCellText: string): Promise<Locator> {
    const row = this.grid.locator("tbody tr").filter({ hasText: rowText }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    // PK id and FK columns often share the same display value (e.g. both "1").
    const cell = row
      .getByTestId("grid-cell-fk-value")
      .filter({ has: this.page.getByText(fkCellText, { exact: true }) })
      .first();
    await expect(cell).toBeVisible({ timeout: 5000 });
    await cell.scrollIntoViewIfNeeded();
    await cell.click({ clickCount: 2, delay: 40 });
    const button = row.getByTestId("grid-fk-lookup-button").first();
    await expect(button).toBeVisible({ timeout: 5000 });
    await button.click();
    const editor = this.grid.getByTestId("grid-cell-fk");
    await expect(editor).toBeVisible({ timeout: 5000 });
    return editor;
  }

  async pickFkOption(
    rowText: string,
    currentFkValue: string,
    optionLabel: string | RegExp,
  ): Promise<void> {
    const editor = await this.openFkLookupInRow(rowText, currentFkValue);
    const input = editor.locator("input").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    const search =
      typeof optionLabel === "string"
        ? optionLabel.replace(/^.*·\s*/, "").slice(0, 6)
        : "Books";
    await input.fill(search);
    const option = this.page.getByRole("option", { name: optionLabel }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
  }

  async pasteFkRawKey(
    rowText: string,
    currentFkValue: string,
    rawKey: string,
  ): Promise<void> {
    const editor = await this.openFkLookupInRow(rowText, currentFkValue);
    const input = editor.locator("input").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill(rawKey);
    const createOption = this.page.getByRole("option", {
      name: new RegExp(`Use ["']${rawKey}["']`, "i"),
    });
    if (await createOption.isVisible().catch(() => false)) {
      await createOption.click();
    } else {
      await input.press("Enter");
    }
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
  }

  async expectFkMenuHasNoNullOption(rowText: string, fkCellText: string): Promise<void> {
    const editor = await this.openFkLookupInRow(rowText, fkCellText);
    await expect(editor).toBeVisible({ timeout: 5000 });
    const nullOption = this.page.getByRole("option", { name: /^NULL$/i });
    await expect(nullOption).toHaveCount(0);
    await this.page.keyboard.press("Escape");
  }

  async pickCompositeFkOption(
    rowText: string,
    optionLabel: string | RegExp,
    fkCellText = "1",
  ): Promise<void> {
    const editor = await this.openFkLookupInRow(rowText, fkCellText);
    const input = editor.locator("input").first();
    await expect(input).toBeVisible({ timeout: 5000 });
    const search =
      typeof optionLabel === "string"
        ? optionLabel.replace(/^.*·\s*/, "").slice(0, 6)
        : "Beta";
    await input.fill(search);
    const option = this.page.getByRole("option", { name: optionLabel }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
  }

  async editDateTimeCell(currentSnippet: RegExp | string, nextValue: string): Promise<void> {
    const cell =
      typeof currentSnippet === "string"
        ? this.grid.getByText(currentSnippet, { exact: false }).first()
        : this.grid.getByText(currentSnippet).first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click({ clickCount: 2, delay: 40 });
    const input = this.grid.getByTestId("grid-cell-datetime");
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill(nextValue);
    await input.press("Enter");
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
  }

  async expectBinaryCueVisible(): Promise<void> {
    await expect(this.grid.getByText(/\[(blob|hex)\]/i).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectImageCueVisible(): Promise<void> {
    await expect(this.grid.getByText(/\[image\]/i).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectGeometryTextVisible(): Promise<void> {
    await expect(this.grid.getByText(/POINT\s*\(/i).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectGeometryCueAbsent(): Promise<void> {
    await expect(this.grid.getByText("[geometry]", { exact: true })).toHaveCount(0);
  }

  async expectJsonTextVisible(snippet: string): Promise<void> {
    await expect(this.grid.getByText(snippet, { exact: false }).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async expectCueAbsent(cue: string): Promise<void> {
    await expect(this.grid.getByText(cue, { exact: true })).toHaveCount(0);
  }

  /** Right-click a cell matching text and open Quick Look editor. */
  async openQuickLookOnCell(cellText: string | RegExp): Promise<void> {
    const cell =
      typeof cellText === "string"
        ? this.grid.getByText(cellText, { exact: false }).first()
        : this.grid.getByText(cellText).first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.scrollIntoViewIfNeeded();
    // Select the cell first so Quick Look has selectedColumn context.
    await cell.click({ delay: 40 });
    await cell.click({ button: "right" });
    const menuItem = this.page.getByRole("menuitem", { name: /quick look/i });
    await expect(menuItem).toBeVisible({ timeout: 5000 });
    await menuItem.click();
    await expect(this.quickLookTitle()).toBeVisible({ timeout: 5000 });
  }

  /** Right-click empty area of the grid container (not a cell). */
  async openEmptyAreaContextMenu(): Promise<void> {
    const container = this.page.getByTestId("data-grid-container");
    await expect(container).toBeVisible({ timeout: 15000 });
    const box = await container.boundingBox();
    if (!box) {
      throw new Error("data-grid-container has no bounding box");
    }
    // Dispatch on the container itself so cell/header handlers never run.
    await container.evaluate(
      (el, pos) => {
        el.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: pos.x,
            clientY: pos.y,
            button: 2,
          }),
        );
      },
      { x: box.x + 24, y: box.y + box.height - 12 },
    );
  }

  async openCellContextMenu(cellText: string): Promise<void> {
    const cell = this.grid.getByText(cellText, { exact: true }).first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click({ delay: 40 });
    await cell.click({ button: "right" });
    await expect(this.contextMenuItem(/open fields/i)).toBeVisible({
      timeout: 5000,
    });
  }

  async openHeaderContextMenu(columnName: string): Promise<void> {
    const header = this.grid.locator("thead").getByText(columnName, { exact: true }).first();
    await expect(header).toBeVisible({ timeout: 15000 });
    await header.click({ button: "right" });
    await expect(this.contextMenuItem(/hide column/i)).toBeVisible({
      timeout: 5000,
    });
  }

  contextMenuItem(name: string | RegExp): Locator {
    return this.page.getByRole("menuitem", { name });
  }

  /** Includes disabled items (Playwright role queries can skip disabled menuitems). */
  contextMenuItemByTestId(slug: string): Locator {
    return this.page.getByTestId(`context-menu-item-${slug}`);
  }

  async expectContextMenuItems(names: Array<string | RegExp>): Promise<void> {
    for (const name of names) {
      await expect(this.contextMenuItem(name)).toBeVisible({ timeout: 5000 });
    }
  }

  async expectContextMenuItemDisabledByTestId(slug: string): Promise<void> {
    const item = this.contextMenuItemByTestId(slug);
    await expect(item).toBeVisible({ timeout: 5000 });
    await expect(item).toHaveAttribute("aria-disabled", "true", { timeout: 5000 });
  }

  async clickContextMenuItem(name: string | RegExp): Promise<void> {
    const item = this.contextMenuItem(name);
    await expect(item).toBeVisible({ timeout: 5000 });
    await item.click();
  }

  /** Open a nested submenu (Copy / Filter) then click a child item. */
  async clickContextSubmenuItem(
    parent: string | RegExp,
    child: string | RegExp,
  ): Promise<void> {
    const parentItem = this.contextMenuItem(parent);
    await expect(parentItem).toBeVisible({ timeout: 5000 });
    await parentItem.click();
    const childItem = this.contextMenuItem(child);
    await expect(childItem).toBeVisible({ timeout: 5000 });
    await childItem.click();
  }

  async closeContextMenu(): Promise<void> {
    const item = this.page.getByTestId(/^context-menu-item-/).first();
    if (!(await item.isVisible().catch(() => false))) {
      return;
    }
    // Backdrop is opacity:0 (Playwright treats it as hidden). Click a corner so
    // the hit does not land on the menu paper / Filter submenu at viewport center.
    await this.page.locator(".MuiBackdrop-root").last().click({
      force: true,
      position: { x: 1, y: 1 },
      timeout: 5000,
    });
    await expect(item).toBeHidden({ timeout: 5000 });
  }

  async expectCopiedToast(): Promise<void> {
    await expect(this.page.getByText(/copied successfully/i).first()).toBeVisible({
      timeout: 5000,
    });
  }

  async readClipboard(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  async expectUnsavedRowCount(count: number): Promise<void> {
    await expect(this.grid.locator("tbody tr.unsaved-highlight")).toHaveCount(count, {
      timeout: 10000,
    });
  }

  async expectRemovedRowVisible(): Promise<void> {
    await expect(this.grid.locator("tbody tr.removed-highlight").first()).toBeVisible({
      timeout: 10000,
    });
  }

  async expectHeaderColumnVisible(columnName: string, visible: boolean): Promise<void> {
    const header = this.grid.locator("thead").getByText(columnName, { exact: true });
    if (visible) {
      await expect(header.first()).toBeVisible({ timeout: 10000 });
      return;
    }
    await expect(header).toHaveCount(0, { timeout: 10000 });
  }

  quickLookTitle(): Locator {
    return this.page.getByRole("heading", { name: /quick look editor/i });
  }

  async expectQuickLookMode(
    mode: "text" | "json" | "hex" | "image" | "geometry",
  ): Promise<void> {
    await expect(this.page.getByTestId(`value-panel-body-${mode}`)).toBeVisible({
      timeout: 5000,
    });
  }

  async applyQuickLook(): Promise<void> {
    const apply = this.page.getByTestId("value-panel-apply");
    await expect(apply).toBeVisible({ timeout: 5000 });
    await apply.click();
    await expect(this.quickLookTitle()).toHaveCount(0, { timeout: 5000 });
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
  }

  async closeQuickLook(): Promise<void> {
    if ((await this.quickLookTitle().count()) === 0) {
      return;
    }
    await this.page.keyboard.press("Escape");
    await expect(this.quickLookTitle()).toHaveCount(0, { timeout: 5000 });
  }

  async openQuickLookFromContextMenu(): Promise<void> {
    const cell = this.grid.getByTestId("grid-cell").first();
    await expect(cell).toBeVisible({ timeout: 15000 });
    await cell.click({ button: "right" });
    await this.page.getByRole("menuitem", { name: /quick look/i }).click();
    await expect(this.quickLookTitle()).toBeVisible({ timeout: 5000 });
  }

  private pendingRawQuery(): Promise<unknown> {
    return pendingResponse(this.page, apiRoute.queryFetch);
  }

  async goToNextPage(): Promise<void> {
    const responsePromise = this.pendingRawQuery();
    await expect(this.nextPageButton).toBeEnabled({ timeout: 10000 });
    await this.nextPageButton.click();
    await responsePromise;
  }

  async goToPreviousPage(): Promise<void> {
    const responsePromise = this.pendingRawQuery();
    await expect(this.previousPageButton).toBeEnabled({ timeout: 10000 });
    await this.previousPageButton.click();
    await responsePromise;
  }

  async expectNextPageDisabled(): Promise<void> {
    await expect(this.nextPageButton).toBeDisabled({ timeout: 10000 });
  }

  async expectPreviousPageDisabled(): Promise<void> {
    await expect(this.previousPageButton).toBeDisabled({ timeout: 10000 });
  }

  /** Page-size settings control in the query/data status bar. */
  private get paginationSettingsButton(): Locator {
    return this.page.getByTestId("pagination-settings");
  }

  async setPageLimit(limit: number): Promise<void> {
    await expect(this.paginationSettingsButton).toBeVisible({ timeout: 10000 });
    await this.paginationSettingsButton.click();

    // FieldInput uses a caption + placeholder, not an accessible <label>.
    const limitInput = this.page.getByPlaceholder(/^limit$/i);
    await expect(limitInput).toBeVisible({ timeout: 5000 });
    await limitInput.fill(String(limit));

    const responsePromise = this.pendingRawQuery();
    const popper = this.page
      .locator(".MuiPopper-root")
      .filter({ has: limitInput });
    const saveButton = popper.getByRole("button", { name: /^save$/i });
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    await responsePromise;
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
