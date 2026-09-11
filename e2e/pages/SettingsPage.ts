import { expect, type Page, type Locator } from "@playwright/test";
import { apiRoute, pendingResponse } from "../helpers/network";
import { BasePage } from "./BasePage";

export type SettingsPanel =
  | "General"
  | "Appearance"
  | "Shortcuts"
  | "AI"
  | "Security"
  | "About"
  | "Administration";

/**
 * Page Object for Settings workspace tab
 */
export class SettingsPage extends BasePage {
  readonly settingsButton: Locator;
  readonly panel: Locator;
  readonly workspaceTab: Locator;

  readonly generalMenuItem: Locator;
  readonly appearanceMenuItem: Locator;
  readonly shortcutsMenuItem: Locator;
  readonly aiMenuItem: Locator;
  readonly securityMenuItem: Locator;
  readonly aboutMenuItem: Locator;
  readonly administrationMenuItem: Locator;

  readonly lightTheme: Locator;
  readonly darkTheme: Locator;

  readonly leftSidebarButton: Locator;
  readonly rightSidebarButton: Locator;

  constructor(page: Page) {
    super(page);

    this.settingsButton = page.getByRole("button", {
      name: "settings",
      exact: true,
    });
    this.panel = page.getByTestId("settings-panel");
    this.workspaceTab = page.getByTestId("workspace-tab-settings");

    this.generalMenuItem = page.getByText("General").first();
    this.appearanceMenuItem = page.getByText("Appearance").first();
    this.shortcutsMenuItem = page.getByText("Shortcuts").first();
    this.aiMenuItem = page.locator("div").filter({ hasText: /^AI$/ }).first();
    this.securityMenuItem = page.getByText("Security").first();
    this.aboutMenuItem = page.getByText("About").first();
    this.administrationMenuItem = this.panel.getByRole("button", {
      name: "Administration",
    });

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
    await expect(this.panel).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("General").first()).toBeVisible({
      timeout: 10000,
    });
  }

  async close(): Promise<void> {
    await expect(this.workspaceTab).toBeVisible({ timeout: 10000 });
    // Lucide close icon inside the Settings workspace tab
    await this.workspaceTab.locator("svg").last().click();
    await expect(this.panel).toBeHidden({ timeout: 10000 });
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
      case "Security":
        await this.securityMenuItem.click();
        break;
      case "About":
        await this.aboutMenuItem.click();
        break;
      case "Administration":
        await this.administrationMenuItem.click();
        break;
    }
  }

  async expectAdminUsersTable(): Promise<void> {
    await expect(this.page.getByTestId("admin-users-table")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      this.page.getByRole("columnheader", { name: "Email" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("columnheader", { name: "Role" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("columnheader", { name: "Status" }),
    ).toBeVisible();
  }

  adminUserRow(email: string): Locator {
    return this.page.getByTestId(`admin-user-row-${email}`);
  }

  async openAdminUserMenu(email: string): Promise<void> {
    await this.page.getByTestId(`admin-user-menu-${email}`).click();
  }

  async disableAdminUser(email: string): Promise<void> {
    await this.openAdminUserMenu(email);
    await this.page.getByTestId(`admin-user-disable-${email}`).click();
  }

  async resetAdminUserPassword(email: string): Promise<void> {
    await this.openAdminUserMenu(email);
    await this.page.getByTestId(`admin-user-reset-password-${email}`).click();
  }

  async openAdminShareConnections(email: string): Promise<void> {
    await this.openAdminUserMenu(email);
    await this.page
      .getByTestId(`admin-user-share-connections-${email}`)
      .click();
    await expect(
      this.page.getByTestId("admin-share-connections-modal"),
    ).toBeVisible();
  }

  async changeAccountPassword(
    currentPassword: string,
    nextPassword: string,
  ): Promise<void> {
    await this.page.getByTestId("account-password-change").click();
    await this.page
      .getByTestId("account-current-password")
      .fill(currentPassword);
    await this.page.getByTestId("account-new-password").fill(nextPassword);
    await this.page.getByTestId("account-confirm-password").fill(nextPassword);
    await this.page.getByTestId("account-password-submit").click();
  }

  async setupTotpAndEnable(code: string): Promise<void> {
    await this.page.getByTestId("auth-totp-setup").click();
    await expect(this.page.getByTestId("auth-totp-secret")).toBeVisible({
      timeout: 10000,
    });
    await this.page.getByTestId("auth-totp-enable-code").fill(code);
    await this.page.getByTestId("auth-totp-enable-submit").click();
  }

  async submitAdminResetPassword(password: string): Promise<void> {
    const input = this.page.getByTestId("admin-reset-password-input");
    await expect(
      this.page.getByTestId("admin-reset-password-modal"),
    ).toBeVisible();
    await input.fill(password);
    await input.press("Enter");
    await expect(
      this.page.getByTestId("admin-reset-password-modal"),
    ).toHaveCount(0, { timeout: 10000 });
  }

  async createAdminUser(email: string, password: string): Promise<void> {
    await this.page.getByTestId("admin-create-email").fill(email);
    await this.page.getByTestId("admin-create-password").fill(password);
    await this.page.getByTestId("admin-create-submit").click();
    await expect(this.adminUserRow(email)).toBeVisible({ timeout: 10000 });
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

  async logout(): Promise<void> {
    if (!(await this.panel.isVisible().catch(() => false))) {
      await this.open();
    }
    await this.navigateTo("General");
    await this.page.getByRole("button", { name: "Log out" }).click();
    await expect(this.page.getByTestId("auth-submit")).toBeVisible({
      timeout: 30000,
    });
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

  aiSetupForm(): Locator {
    return this.page.getByTestId("ai-setup-form");
  }

  async setSafeModePassword(password: string): Promise<void> {
    await this.navigateTo("Security");
    const setButton = this.page.getByTestId("safe-mode-settings-set-password");
    await expect(setButton).toBeVisible({ timeout: 10000 });
    await setButton.click();

    const prompt = this.page.getByTestId("safe-mode-password-prompt");
    await expect(prompt).toBeVisible({ timeout: 10000 });
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.locator('input[name="confirm"]').fill(password);

    const setPromise = pendingResponse(this.page, {
      ...apiRoute.safeModePassword,
      method: "POST",
      status: 200,
    });
    await this.page.getByTestId("safe-mode-password-save").click();
    await setPromise;
    await expect(prompt).toHaveCount(0, { timeout: 15000 });
    await expect(this.page.getByTestId("safe-mode-settings-status")).toHaveText(
      "Configured",
      { timeout: 10000 },
    );
  }

  async changeSafeModePassword(
    currentPassword: string,
    nextPassword: string,
  ): Promise<void> {
    await this.navigateTo("Security");
    const changeButton = this.page.getByTestId(
      "safe-mode-settings-change-password",
    );
    await expect(changeButton).toBeVisible({ timeout: 10000 });
    await changeButton.click();

    const prompt = this.page.getByTestId("safe-mode-password-prompt");
    await expect(prompt).toBeVisible({ timeout: 10000 });
    await this.page
      .locator('input[name="currentPassword"]')
      .fill(currentPassword);
    await this.page.locator('input[name="password"]').fill(nextPassword);
    await this.page.locator('input[name="confirm"]').fill(nextPassword);

    const changePromise = pendingResponse(this.page, {
      ...apiRoute.safeModePassword,
      method: "PATCH",
      status: 200,
    });
    await this.page.getByTestId("safe-mode-password-save").click();
    await changePromise;
    await expect(prompt).toHaveCount(0, { timeout: 15000 });
    await expect(
      this.page.getByText("Safe Mode password updated").first(),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectPanelVisible(content: string): Promise<void> {
    await expect(this.page.getByText(content, { exact: true })).toBeVisible();
  }

  async expectSettingsClosed(): Promise<void> {
    await expect(this.panel).toBeHidden({ timeout: 10000 });
  }

  /** @deprecated use expectSettingsClosed */
  async expectModalClosed(): Promise<void> {
    await this.expectSettingsClosed();
  }

  settingsSearchInput(): Locator {
    return this.page.getByTestId("settings-search");
  }

  async filterSettings(query: string): Promise<void> {
    const input = this.settingsSearchInput();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(query);
  }

  async openSearchResult(label: string): Promise<void> {
    const option = this.page.getByRole("option", { name: label }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
  }

  async searchAndOpen(query: string, resultLabel: string): Promise<void> {
    await this.filterSettings(query);
    await this.openSearchResult(resultLabel);
  }

  shortcutsSearchInput(): Locator {
    return this.page.getByPlaceholder("Search shortcuts");
  }

  async expectShortcutsCheatsheet(): Promise<void> {
    await expect(this.shortcutsSearchInput()).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText("Editor", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Tabs", { exact: true })).toBeVisible();
    await expect(
      this.page.getByText("Data grid", { exact: true }),
    ).toBeVisible();
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
