import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Boards sidebar view: saved dashboards and reports of the connection.
 */
export class BoardsPage extends BasePage {
  readonly tab: Locator;

  constructor(page: Page) {
    super(page);
    this.tab = page.getByTestId("sidebar-tab-boards");
  }

  async open(): Promise<void> {
    // Activity bar button: icon only, pressed while its area is open.
    if ((await this.tab.getAttribute("aria-pressed")) !== "true") {
      await this.tab.click();
    }
    await expect(this.tab).toHaveAttribute("aria-pressed", "true");
    await expect(this.tab).toHaveAttribute("aria-label", "Boards");
    await expect(this.page.getByTestId("boards-view")).toBeVisible();
  }

  item(name: string): Locator {
    return this.page.locator(
      `[data-testid="boards-item"][data-name="${name}"]`,
    );
  }

  async openItem(name: string): Promise<void> {
    await this.open();
    await this.item(name).click();
  }

  async runAction(name: string, action: string): Promise<void> {
    await this.open();
    await this.item(name).click({ button: "right" });
    await this.page
      .getByTestId(
        `context-menu-item-${action.toLowerCase().replace(/\s+/g, "-")}`,
      )
      .click();
  }

  async newDashboard(): Promise<void> {
    await this.open();
    await this.page.getByTestId("boards-new-dashboard").click();
  }

  async newReport(): Promise<void> {
    await this.open();
    await this.page.getByTestId("boards-new-report").click();
  }

  async importDashboard(): Promise<void> {
    await this.open();
    await this.page.getByTestId("boards-import-dashboard").click();
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByRole("button", { name: "Delete" }).click();
  }
}
