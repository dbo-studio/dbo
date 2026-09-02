import { expect, type Locator, type Page } from "@playwright/test";
import {
  API_DB_TIMEOUT,
  apiRoute,
  pendingResponse,
  waitForResponseDuring,
} from "../helpers/network";
import { BasePage } from "./BasePage";
import { DataGridPage } from "./DataGridPage";
import { ObjectTreePage } from "./ObjectTreePage";

/**
 * Page Object for the Data browser tab (open table from tree + ActionBar).
 */
export class DataBrowserPage extends BasePage {
  readonly dataGrid: DataGridPage;
  readonly tree: ObjectTreePage;

  constructor(page: Page) {
    super(page);
    this.dataGrid = new DataGridPage(page);
    this.tree = new ObjectTreePage(page);
  }

  get filtersButton(): Locator {
    return this.page.getByRole("button", { name: "Filters" });
  }

  get sortsButton(): Locator {
    return this.page.getByRole("button", { name: "sort", exact: true });
  }

  get columnsButton(): Locator {
    return this.page.getByRole("button", { name: "grid" });
  }

  get queryPreviewButton(): Locator {
    return this.page.getByRole("button", { name: "Query preview" });
  }

  get inlineQueryRunButton(): Locator {
    return this.page.getByTestId("inline-query-run");
  }

  get exportButton(): Locator {
    return this.page.getByTestId("export-button");
  }

  get importButton(): Locator {
    return this.page.getByTestId("import-button");
  }

  get applyButton(): Locator {
    return this.page.getByRole("button", { name: "Apply" });
  }

  get filterItem(): Locator {
    return this.page.getByLabel("filter-item");
  }

  get sortItem(): Locator {
    return this.page.getByLabel("sort-item");
  }

  /** Open a table's Data tab via tree double-click (node action path: data). */
  async openTableFromTree(
    pathToTables: string[],
    tableName: string,
  ): Promise<void> {
    const tabSlug = tableName.toLowerCase().replace(/\s+/g, "-");
    const existingTab = this.page.getByTestId(`workspace-tab-${tabSlug}`);
    // Already open — select tab only. Re-dblclick would not fire queryFetch.
    if (await existingTab.isVisible().catch(() => false)) {
      await existingTab.click();
      await expect(this.page.getByTestId("data-grid")).toBeVisible({
        timeout: 15000,
      });
      return;
    }

    await this.tree.expandPath(pathToTables);
    await this.tree.refreshExpandNode("Tables");
    const node = this.tree.getTreeNode(tableName);
    await expect(node).toBeVisible({ timeout: 15000 });

    const queryPromise = pendingResponse(
      this.page,
      apiRoute.queryFetch,
      API_DB_TIMEOUT,
    );
    await node.dblclick();
    await queryPromise;

    await expect(existingTab).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByTestId("data-grid")).toBeVisible({
      timeout: 15000,
    });
  }

  async openFiltersPanel(): Promise<void> {
    const alreadyOpen = await this.page
      .getByLabel("add-filter-btn")
      .or(this.filterItem)
      .first()
      .isVisible()
      .catch(() => false);
    if (!alreadyOpen) {
      await this.filtersButton.click();
    }
    await expect(
      this.page.getByLabel("add-filter-btn").or(this.filterItem).first(),
    ).toBeVisible({ timeout: 10000 });
  }

  /** Close the filters panel if it is open (avoids stale Filters UI across table switches). */
  async closeFiltersPanel(): Promise<void> {
    const panelVisible = await this.page
      .getByLabel("add-filter-btn")
      .or(this.filterItem)
      .first()
      .isVisible()
      .catch(() => false);
    if (!panelVisible) {
      return;
    }
    await this.filtersButton.click();
    await expect(
      this.page.getByLabel("add-filter-btn").or(this.filterItem),
    ).toHaveCount(0, { timeout: 10000 });
  }

  async openSortsPanel(): Promise<void> {
    const alreadyOpen = await this.page
      .getByLabel("add-sort-btn")
      .or(this.sortItem)
      .first()
      .isVisible()
      .catch(() => false);
    if (!alreadyOpen) {
      await this.sortsButton.click();
    }
    await expect(
      this.page.getByLabel("add-sort-btn").or(this.sortItem).first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async openColumnsPanel(): Promise<void> {
    const panelVisible = await this.page
      .getByTestId(/^column-visibility-/)
      .first()
      .isVisible()
      .catch(() => false);
    if (!panelVisible) {
      await this.columnsButton.click();
    }
    await expect(this.page.getByTestId(/^column-visibility-/).first()).toBeVisible({
      timeout: 10000,
    });
  }

  async toggleColumnVisibility(columnName: string): Promise<void> {
    await this.openColumnsPanel();
    const row = this.page.getByTestId(`column-visibility-${columnName}`);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();
  }

  async runInlineQuery(condition: string): Promise<void> {
    const inline = this.page.getByTestId("inline-query");
    await expect(inline).toBeVisible({ timeout: 10000 });
    const editor = inline.locator(".monaco-editor").first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    const selectAll = process.platform === "darwin" ? "Meta+A" : "Control+A";
    await this.page.keyboard.press(selectAll);
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.type(condition, { delay: 20 });

    await waitForResponseDuring(
      this.page,
      apiRoute.queryFetch,
      () => this.inlineQueryRunButton.click(),
      API_DB_TIMEOUT,
    );
  }

  async openQueryPreview(): Promise<void> {
    const previewVisible = await this.page
      .getByRole("button", { name: "Open editor" })
      .isVisible()
      .catch(() => false);
    if (!previewVisible) {
      await this.queryPreviewButton.click();
    }
    await expect(
      this.page.getByRole("button", { name: "Open editor" }),
    ).toBeVisible({ timeout: 10000 });
  }

  async openQueryPreviewInEditor(): Promise<void> {
    await this.openQueryPreview();
    const openEditor = this.page.getByRole("button", { name: "Open editor" });
    await expect(openEditor).toBeEnabled({ timeout: 15000 });
    await openEditor.click();
  }

  async addFilter(
    column: string,
    operator: string,
    value: string,
  ): Promise<void> {
    const addBtn = this.page.getByLabel("add-filter-btn").first();
    await addBtn.click();
    await expect(this.filterItem.first()).toBeVisible({ timeout: 10000 });

    const item = this.filterItem.first();
    await this.selectReactSelectWithin(item, 0, column);
    await this.selectReactSelectWithin(item, 1, operator);

    // Value FieldInput — only MUI InputBase in the filter row (react-select ≠ InputBase).
    // Wrapper `filter-value` is the stable contract (MUI v9 dropped inputProps testids).
    const valueInput = item.getByTestId("filter-value").locator("input");
    await expect(valueInput).toBeVisible({ timeout: 5000 });
    await expect(valueInput).toBeEnabled({ timeout: 5000 });
    await valueInput.click();
    await valueInput.fill(value);
    await expect(valueInput).toHaveValue(value);
    // Commit to tab store (onBlur upserts) before Apply re-runs the query.
    await valueInput.blur();

    await waitForResponseDuring(
      this.page,
      apiRoute.queryFetch,
      () => this.applyButton.click(),
      API_DB_TIMEOUT,
    );
  }

  /** Remove all filter rows (re-runs query when an active filter is removed). */
  async clearFilters(): Promise<void> {
    await this.openFiltersPanel();
    for (let i = 0; i < 20 && (await this.filterItem.count()) > 0; i += 1) {
      const removeBtn = this.filterItem.first().locator(".remove-filter-btn");
      await waitForResponseDuring(
        this.page,
        apiRoute.queryFetch,
        () => removeBtn.click(),
        API_DB_TIMEOUT,
      );
    }
    await expect(this.filterItem).toHaveCount(0, { timeout: 10000 });
  }

  async addSort(column: string, direction: "ASC" | "DESC"): Promise<void> {
    const addBtn = this.page.getByLabel("add-sort-btn").first();
    await addBtn.click();
    await expect(this.sortItem.first()).toBeVisible({ timeout: 10000 });

    const item = this.sortItem.first();
    await this.selectReactSelectWithin(item, 0, column);
    await this.selectReactSelectWithin(item, 1, direction);

    await waitForResponseDuring(
      this.page,
      apiRoute.queryFetch,
      () => this.applyButton.click(),
      API_DB_TIMEOUT,
    );
  }

  async openExportModal(): Promise<void> {
    await expect(this.exportButton).toBeVisible({ timeout: 10000 });
    await this.exportButton.click();
    await expect(this.page.getByText("Export Options")).toBeVisible({
      timeout: 10000,
    });
  }

  async exportAs(format: "SQL" | "JSON" | "CSV"): Promise<void> {
    await this.startExportJob(format);
    await this.closeJobProgressModal("Exporting Data");
  }

  /**
   * Export as format, download the result file to `savePath`, then close progress.
   * Returns the absolute path written (same as `savePath`).
   */
  async exportAndDownload(
    format: "SQL" | "JSON" | "CSV",
    savePath: string,
  ): Promise<string> {
    await this.startExportJob(format);
    const downloadButton = this.page.getByRole("button", {
      name: "Download File",
    });
    await expect(downloadButton).toBeVisible({ timeout: 10000 });

    const downloadPromise = this.page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;
    await download.saveAs(savePath);

    await this.closeJobProgressModal("Exporting Data");
    return savePath;
  }

  /** @deprecated Prefer {@link importFile} — format is detected from the file extension. */
  async importCsv(filePath: string): Promise<void> {
    await this.importFile(filePath);
  }

  async importFile(
    filePath: string,
    options?: {
      continueOnError?: boolean;
      skipErrors?: boolean;
      /** Override auto-detected format (SQL | JSON | CSV). */
      format?: "SQL" | "JSON" | "CSV";
      /** Regex matched against the progress status line (default: /import completed/i). */
      expectStatus?: RegExp;
    },
  ): Promise<void> {
    await expect(this.importButton).toBeVisible({ timeout: 10000 });
    await this.importButton.click();
    await expect(this.page.getByText("Import Data")).toBeVisible({
      timeout: 10000,
    });

    const modal = this.page
      .locator(".MuiModal-root")
      .filter({ hasText: "Import Data" });
    await this.page.locator('input[type="file"]').setInputFiles(filePath);

    if (options?.format) {
      await this.selectLabeledFormat(options.format);
    }
    if (options?.continueOnError) {
      await modal.getByRole("checkbox", { name: /continue on error/i }).check();
    }
    if (options?.skipErrors) {
      await modal.getByRole("checkbox", { name: /skip errors/i }).check();
    }

    const confirmImport = modal.getByRole("button", {
      name: "Import",
      exact: true,
    });
    await waitForResponseDuring(
      this.page,
      apiRoute.importStart,
      () => confirmImport.click(),
      API_DB_TIMEOUT,
    );
    await expect(this.page.getByText("Importing Data")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      this.page.getByText(options?.expectStatus ?? /import completed/i),
    ).toBeVisible({ timeout: 60000 });
    await this.closeJobProgressModal("Importing Data");
  }

  private async startExportJob(
    format: "SQL" | "JSON" | "CSV",
  ): Promise<void> {
    await this.openExportModal();
    await this.selectLabeledFormat(format);
    const modal = this.page
      .locator(".MuiModal-root")
      .filter({ hasText: "Export Options" });
    const confirmExport = modal.getByRole("button", {
      name: "Export",
      exact: true,
    });
    await waitForResponseDuring(
      this.page,
      apiRoute.exportStart,
      () => confirmExport.click(),
      API_DB_TIMEOUT,
    );
    await expect(this.page.getByText("Exporting Data")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      this.page.getByText(/export completed successfully/i),
    ).toBeVisible({ timeout: 60000 });
    await expect(
      this.page.getByRole("button", { name: "Download File" }),
    ).toBeVisible({ timeout: 10000 });
  }

  private async closeJobProgressModal(title: string): Promise<void> {
    await this.page.getByRole("button", { name: "Close" }).click();
    await expect(this.page.getByText(title)).toBeHidden({ timeout: 10000 });
  }

  /**
   * Pick a react-select option by select index within a filter/sort row.
   * Requires classNamePrefix `filter-select` / `sort-select` on those SelectInputs.
   */
  private async selectReactSelectWithin(
    scope: Locator,
    selectIndex: number,
    optionLabel: string,
  ): Promise<void> {
    const controlInputs = scope.locator(
      ".filter-select__control input, .sort-select__control input",
    );
    const input = controlInputs.nth(selectIndex);
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.click();

    const option = this.page.getByRole("option", {
      name: optionLabel,
      exact: true,
    });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await this.wait(200);
  }

  private async selectLabeledFormat(format: string): Promise<void> {
    const formatCaption = this.page.getByText("Format", { exact: true });
    await expect(formatCaption).toBeVisible({ timeout: 10000 });
    const selectRoot = formatCaption.locator("xpath=following-sibling::*[1]");
    const input = selectRoot.locator("input").first();
    await input.click();
    await this.page.getByRole("option", { name: format, exact: true }).click();
    await this.wait(200);
  }
}
