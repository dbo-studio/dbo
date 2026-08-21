import { expect, type Page, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export type SettingsPanel =
  | "General"
  | "Appearance"
  | "Shortcuts"
  | "AI"
  | "About";

/**
 * Page Object for Settings modal
 */
export class SettingsPage extends BasePage {
  readonly settingsButton: Locator;
  readonly modal: Locator;

  readonly generalMenuItem: Locator;
  readonly appearanceMenuItem: Locator;
  readonly shortcutsMenuItem: Locator;
  readonly aiMenuItem: Locator;
  readonly aboutMenuItem: Locator;

  readonly lightTheme: Locator;
  readonly darkTheme: Locator;

  readonly leftSidebarButton: Locator;
  readonly rightSidebarButton: Locator;

  constructor(page: Page) {
    super(page);

    this.settingsButton = page.getByRole("button", { name: "settings" });
    this.modal = page.locator('[role="dialog"]');

    this.generalMenuItem = page.getByText("General").first();
    this.appearanceMenuItem = page.getByText("Appearance").first();
    this.shortcutsMenuItem = page.getByText("Shortcuts").first();
    this.aiMenuItem = page.locator("div").filter({ hasText: /^AI$/ }).first();
    this.aboutMenuItem = page.getByText("About").first();

    this.lightTheme = page.getByRole("img", { name: "light" });
    this.darkTheme = page.getByRole("img", { name: "dark" });

    this.leftSidebarButton = page.getByRole("button", { name: "sideLeft" });
    this.rightSidebarButton = page.getByRole("button", { name: "sideRight" });
  }

  async open(): Promise<void> {
    const connectionPageHeading = this.page.getByRole("heading", {
      name: "New connection",
    });
    if (await connectionPageHeading.isVisible().catch(() => false)) {
      await this.page.getByRole("button", { name: "Cancel" }).click();
      await expect(connectionPageHeading).toBeHidden({ timeout: 10000 });
    }
    await this.settingsButton.click();
    await expect(this.page.getByText("General").first()).toBeVisible({
      timeout: 10000,
    });
  }

  async close(): Promise<void> {
    await this.pressKey("Escape");
    await expect(
      this.page.getByRole("checkbox", { name: /Enable MCP server/i }),
    )
      .toBeHidden({ timeout: 10000 })
      .catch(() => undefined);
    await expect(this.page.getByText("Application theme", { exact: true }))
      .toBeHidden({ timeout: 5000 })
      .catch(() => undefined);
  }

  async navigateTo(panel: SettingsPanel): Promise<void> {
    switch (panel) {
      case "General":
        await this.generalMenuItem.click();
        break;
      case "Appearance":
        await this.appearanceMenuItem.click();
        break;
      case "Shortcuts":
        await this.shortcutsMenuItem.click();
        break;
      case "AI":
        await this.aiMenuItem.click();
        break;
      case "About":
        await this.aboutMenuItem.click();
        break;
    }
  }

  async openMcpTab(): Promise<void> {
    const mcpTab = this.page.getByRole("tab", { name: "MCP" });
    await expect(mcpTab).toBeVisible({ timeout: 10000 });
    await mcpTab.click();
    await expect(
      this.page.getByRole("switch", { name: /Enable MCP server/i }),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectMcpPanelVisible(): Promise<void> {
    await expect(
      this.page.getByText(/Enabling MCP exposes database access/i),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      this.page.getByRole("switch", { name: /Enable MCP server/i }),
    ).toBeVisible();
    await expect(this.page.getByText("Status", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Proxy", { exact: true })).toBeVisible();
  }

  async selectLightTheme(): Promise<void> {
    await this.lightTheme.click();
    await expect(this.lightTheme).toBeVisible();
  }

  async selectDarkTheme(): Promise<void> {
    await this.darkTheme.click();
    await expect(this.darkTheme).toBeVisible();
  }

  async toggleLeftSidebar(): Promise<void> {
    await this.leftSidebarButton.click();
  }

  async toggleRightSidebar(): Promise<void> {
    await this.rightSidebarButton.click();
  }

  leftSidebarTab(): Locator {
    return this.page.getByRole("tab", { name: "Items" });
  }

  rightSidebarTab(): Locator {
    return this.page.getByRole("tab", { name: "Assistant" });
  }

  async expectPanelVisible(content: string): Promise<void> {
    await expect(this.page.getByText(content, { exact: true })).toBeVisible();
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden({ timeout: 10000 });
  }

  shortcutsSearchInput(): Locator {
    return this.page.getByPlaceholder("Search shortcuts");
  }

  async expectShortcutsCheatsheet(): Promise<void> {
    await expect(this.shortcutsSearchInput()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Editor", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Tabs", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Data grid", { exact: true })).toBeVisible();
    await expect(this.page.getByText("App", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Run", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Save", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Refresh", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Add row", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Format", { exact: true })).toBeVisible();
    await expect(
      this.page.getByText("Keyboard shortcuts", { exact: true }),
    ).toBeVisible();
  }

  async filterShortcuts(query: string): Promise<void> {
    const input = this.shortcutsSearchInput();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(query);
  }

  /** Web default: Alt+/ opens Settings on the Shortcuts tab. */
  async openShortcutsViaKeyboard(): Promise<void> {
    await this.page.keyboard.press("Alt+/");
    await expect(this.shortcutsSearchInput()).toBeVisible({ timeout: 10000 });
  }
}
