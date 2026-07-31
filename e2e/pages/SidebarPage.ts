import { expect, type Locator, type Page } from "@playwright/test";
import { apiRoute, pendingResponse } from "../helpers/network";
import { BasePage } from "./BasePage";

export type SidebarTab = "Items" | "Queries" | "History";

/**
 * Page Object for Sidebar (Items, Queries, History tabs)
 */
export class SidebarPage extends BasePage {
  readonly itemsTab: Locator;
  readonly queriesTab: Locator;
  readonly historyTab: Locator;
  readonly panel: Locator;

  constructor(page: Page) {
    super(page);
    this.itemsTab = page.getByRole("tab", { name: "Items" });
    this.queriesTab = page.getByRole("tab", { name: "Queries" });
    this.historyTab = page.getByRole("tab", { name: "History" });
    // Explorer content only — avoids matching the SQL editor / result grid.
    this.panel = page.getByRole("tabpanel");
  }

  getTab(tabName: SidebarTab): Locator {
    switch (tabName) {
      case "Items":
        return this.itemsTab;
      case "Queries":
        return this.queriesTab;
      case "History":
        return this.historyTab;
    }
  }

  async switchTo(tabName: SidebarTab): Promise<void> {
    const tab = this.getTab(tabName);
    const alreadySelected = (await tab.getAttribute("aria-selected")) === "true";

    if (!alreadySelected) {
      const waitForList =
        tabName === "History"
          ? pendingResponse(this.page, apiRoute.historiesList)
          : tabName === "Queries"
            ? pendingResponse(this.page, apiRoute.savedList)
            : null;

      await tab.click();
      if (waitForList) {
        await waitForList;
      }
    }

    await expect(tab).toHaveAttribute("aria-selected", "true");
  }

  item(text: string): Locator {
    return this.panel.getByText(text).first();
  }

  async openItemContextMenu(text: string): Promise<void> {
    const item = this.item(text);
    await expect(item).toBeVisible({ timeout: 15000 });
    await item.click();
    await item.click({ button: "right" });
    await this.wait(300);
  }

  async clickContextMenuItem(name: string): Promise<void> {
    await this.page.getByRole("menuitem", { name }).click();
  }

  async runItemFromContextMenu(text: string): Promise<void> {
    await this.openItemContextMenu(text);
    await this.clickContextMenuItem("Run");
    await this.wait(1000);
  }

  async copyItemFromContextMenu(text: string): Promise<void> {
    await this.openItemContextMenu(text);
    await this.clickContextMenuItem("Copy");
    await expect(this.page.getByText(/copied successfully/i)).toBeVisible({
      timeout: 5000,
    });
  }

  async deleteItemFromContextMenu(text: string): Promise<void> {
    await this.openItemContextMenu(text);
    await this.clickContextMenuItem("Delete");
    await expect(
      this.page.getByRole("heading", { name: "Delete action!" }),
    ).toBeVisible();
    await this.page.getByRole("button", { name: "Delete" }).click();
    await this.wait(1000);
  }

  async expectItemVisible(text: string): Promise<void> {
    await expect(this.item(text)).toBeVisible({ timeout: 15000 });
  }

  async expectItemHidden(text: string): Promise<void> {
    await expect(this.panel.getByText(text)).toHaveCount(0);
  }
}
