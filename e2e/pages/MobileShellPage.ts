import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export type MobileTab = "explore" | "query" | "ai";

export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/**
 * Mobile shell (viewport < 600px): connection switcher header, bottom tab bar, drill-down explorer, card data view.
 */
export class MobileShellPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get shell(): Locator {
    return this.page.getByTestId("mobile-shell");
  }

  get applyButton(): Locator {
    return this.page.getByRole("button", { name: "Apply" });
  }

  get saveButton(): Locator {
    return this.page.getByRole("button", { name: "Save" });
  }

  /** The + in the query screen header. */
  get newEditorButton(): Locator {
    return this.page.getByRole("button", { name: "Open editor", exact: true });
  }

  /** Open-tabs badge in the query screen header. */
  get tabCount(): Locator {
    return this.page.locator(".MuiBadge-badge");
  }

  get treeList(): Locator {
    return this.page.getByTestId("mobile-tree-list");
  }

  get bottomSheet(): Locator {
    return this.page.getByTestId("bottom-sheet");
  }

  get moreActionsButton(): Locator {
    return this.page.getByRole("button", { name: "More actions" });
  }

  /** Controls that only make sense on desktop and must not render inside the phone shell. */
  get desktopOnlyControls(): Locator {
    return this.page
      .getByRole("button", { name: "sideLeft" })
      .or(this.page.getByRole("button", { name: "sideRight" }))
      .or(this.page.locator('[data-testid^="workspace-tab-"]'));
  }

  get connectionSwitcher(): Locator {
    return this.page.getByTestId("mobile-connection-switcher");
  }

  tab(id: MobileTab): Locator {
    return this.page.getByTestId(`mobile-tab-${id}`);
  }

  connection(name: string): Locator {
    return this.page.getByTestId(`mobile-connection-${name}`);
  }

  node(name: string): Locator {
    return this.page.getByTestId(`mobile-node-${name}`);
  }

  rowCard(text: string): Locator {
    return this.page.locator('[data-testid^="mobile-row-"]').filter({ hasText: text });
  }

  field(column: string): Locator {
    return this.page.getByTestId(`mobile-row-field-${column}`);
  }

  async switchToMobile(): Promise<void> {
    await this.page.setViewportSize(MOBILE_VIEWPORT);
    await this.page.reload();
    await expect(this.shell).toBeVisible({ timeout: 15000 });
  }

  async switchToDesktop(): Promise<void> {
    await this.page.setViewportSize(DESKTOP_VIEWPORT);
    await this.page.reload();
    await expect(this.shell).toBeHidden({ timeout: 15000 });
  }

  async openTab(id: MobileTab): Promise<void> {
    await this.tab(id).click();
    await expect(this.tab(id)).toHaveAttribute("aria-current", "page");
  }

  async selectConnection(connectionName: string): Promise<void> {
    await this.connectionSwitcher.click();
    await this.connection(connectionName).click();
    await expect(this.connectionSwitcher).toContainText(connectionName);
  }

  async openTable(connectionName: string, tableName: string): Promise<void> {
    await this.selectConnection(connectionName);
    await this.openTab("explore");
    await this.node("Tables").click();
    await this.node(tableName).click();
    await expect(this.tab("query")).toHaveAttribute("aria-current", "page");
  }

  sqlKey(token: string): Locator {
    return this.page.getByTestId("sql-key-bar").getByRole("button", { name: token, exact: true });
  }

  /** Synthesizes a touch drag down on a scroll container (Playwright has no swipe API). */
  async pullDown(target: Locator, distance = 200): Promise<void> {
    await target.evaluate(async (el, dy) => {
      const touch = (y: number): Touch =>
        new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });
      const fire = (type: string, y: number): void => {
        el.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === "touchend" ? [] : [touch(y)],
            changedTouches: [touch(y)],
          }),
        );
      };
      fire("touchstart", 100);
      fire("touchmove", 100 + dy / 2);
      fire("touchmove", 100 + dy);
      await new Promise((resolve) => setTimeout(resolve, 50));
      fire("touchend", 100 + dy);
    }, distance);
  }

  async openEditor(): Promise<void> {
    await this.moreActionsButton.click();
    await this.bottomSheet.getByRole("button", { name: "Open editor" }).click();
    await expect(this.tab("query")).toHaveAttribute("aria-current", "page");
  }

  async editRowField(rowText: string, column: string, value: string): Promise<void> {
    await this.rowCard(rowText).click();
    await expect(this.field(column)).toBeVisible();
    await this.field(column).fill(value);
    await this.applyButton.click();
    await expect(this.applyButton).toBeHidden();
  }
}
