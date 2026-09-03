import { expect, type Locator, type Page } from "@playwright/test";
import {
  API_DB_TIMEOUT,
  apiRoute,
  waitForResponseDuring,
} from "../helpers/network";
import { BasePage } from "./BasePage";
import { ObjectTreePage } from "./ObjectTreePage";

/**
 * Database diagram (ERD) canvas and toolbar.
 */
export class DiagramPage extends BasePage {
  readonly tree: ObjectTreePage;

  constructor(page: Page) {
    super(page);
    this.tree = new ObjectTreePage(page);
  }

  get panel(): Locator {
    return this.page.getByTestId("diagram-panel");
  }

  get canvas(): Locator {
    return this.page.getByTestId("diagram-canvas");
  }

  getNode(tableName: string): Locator {
    return this.page.getByTestId(`diagram-node-${tableName}`);
  }

  getColumn(tableName: string, columnName: string): Locator {
    return this.page.getByTestId(`diagram-col-${tableName}-${columnName}`);
  }

  async openFromTree(nodeName: string): Promise<void> {
    await waitForResponseDuring(
      this.page,
      apiRoute.schemaDiagram,
      () => this.tree.runTreeAction(nodeName, "Open diagram"),
      API_DB_TIMEOUT,
    );
    await expect(this.panel).toBeVisible({ timeout: 15000 });
    await expect(this.canvas).toBeVisible({ timeout: 15000 });
  }

  async expectTableVisible(tableName: string): Promise<void> {
    await expect(this.getNode(tableName)).toBeVisible({ timeout: 15000 });
  }

  async selectTable(tableName: string): Promise<void> {
    await this.getNode(tableName).click();
    await expect(this.getNode(tableName)).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  }

  async exportPng(): Promise<void> {
    await this.page.getByTestId("diagram-export").click();
    await this.page.getByTestId("diagram-export-png").click();
  }

  get sourceTab(): Locator {
    return this.page.getByRole("tab", { name: /^source$/i });
  }

  get sourcePanel(): Locator {
    return this.page.getByTestId("diagram-source");
  }

  get sourceDbml(): Locator {
    return this.page.getByTestId("diagram-source-dbml");
  }

  async openSourcePanel(): Promise<void> {
    await this.page.getByTestId("diagram-open-source").click();
    await expect(this.sourceTab).toBeVisible({ timeout: 15000 });
    await expect(this.sourceTab).toHaveAttribute("aria-selected", "true");
    await expect(this.sourcePanel).toBeVisible({ timeout: 15000 });
    await expect(this.sourceDbml).toBeVisible({ timeout: 15000 });
  }
}
