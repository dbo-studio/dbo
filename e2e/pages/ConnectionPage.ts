import { expect, type Locator, type Page } from "@playwright/test";
import {
  API_DB_TIMEOUT,
  apiRoute,
  waitForResponseDuring,
} from "../helpers/network";
import { BasePage } from "./BasePage";

export interface ConnectionSslConfig {
  mode:
    "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
}

export interface ConnectionSshConfig {
  host: string;
  port: string;
  username: string;
  authMethod: "password" | "key" | "agent";
  password?: string;
  privateKey?: string;
  passphrase?: string;
  jump?: Omit<ConnectionSshConfig, "jump">;
}

export interface ConnectionConfig {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  database?: string;
  type?: "PostgreSQL" | "MySQL" | "MariaDB" | "SQLite" | "SQL Server" | "ClickHouse";
  ssl?: ConnectionSslConfig;
  ssh?: ConnectionSshConfig;
}

export class ConnectionPage extends BasePage {
  readonly newConnectionModal: Locator;
  readonly editConnectionModal: Locator;
  readonly connectionTypeSelector: (type: string) => Locator;
  readonly selectConnectionButton: Locator;
  readonly testConnectionButton: Locator;
  readonly createConnectionButton: Locator;
  readonly addConnectionButton: Locator;

  readonly nameInput: Locator;
  readonly hostInput: Locator;
  readonly portInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly uriInput: Locator;
  readonly useUriCheckbox: Locator;
  readonly copyUriButton: Locator;

  constructor(page: Page) {
    super(page);

    this.newConnectionModal = page.getByText("New connection");
    this.editConnectionModal = page.getByText("Edit connection");
    this.connectionTypeSelector = (type: string) =>
      page.getByTestId(`selected-connection-${type}`);
    this.selectConnectionButton = page.getByTestId("select-connection");
    this.testConnectionButton = page.getByTestId("test-connection");
    this.createConnectionButton = page.getByTestId("create-connection");
    this.addConnectionButton = page.getByTestId("add-connection");

    this.nameInput = page.locator('input[name="name"]');
    this.hostInput = page.locator('input[name="host"]');
    this.portInput = page.locator('input[name="port"]');
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.uriInput = page.locator('input[name="uri"]');
    this.useUriCheckbox = page.getByRole("checkbox", { name: "Use URI" });
    this.copyUriButton = page.getByTestId("copy-connection-uri");
  }

  /** Connections live in the switcher at the top of the explorer sidebar. */
  get switcherPanel(): Locator {
    return this.page.getByTestId("connection-switcher-panel");
  }

  async openSwitcher(): Promise<void> {
    if (await this.switcherPanel.isVisible().catch(() => false)) return;
    const switcher = this.page.getByTestId("connection-switcher");
    // With no connections the app auto-opens "New connection" once the list loads; on a slow
    // start that lands between waitForReady and this click and intercepts it.
    await switcher.click({ timeout: 5000 }).catch(async () => {
      await this.dismissNewConnectionModalIfOpen();
      await switcher.click();
    });
    await expect(this.switcherPanel).toBeVisible();
  }

  async closeSwitcher(): Promise<void> {
    if (!(await this.switcherPanel.isVisible().catch(() => false))) return;
    await this.page.keyboard.press("Escape");
    await expect(this.switcherPanel).toBeHidden();
  }

  getConnectionItem(name: string): Locator {
    return this.page.getByTestId(`connection-item-${name}`);
  }

  getConnectionHeading(name: string): Locator {
    return this.page.getByRole("heading", { name: new RegExp(name, "i") });
  }

  async expectConnectionActive(name: string): Promise<void> {
    await this.openSwitcher();
    await expect(this.getConnectionItem(name)).toBeVisible();
    await this.closeSwitcher();
    await this.waitForConnectionActive();
    await expect(
      this.page.getByRole("heading", { name: /^No active connection$/i }),
    ).toHaveCount(0);
  }

  async connectionExists(name: string): Promise<boolean> {
    await this.openSwitcher().catch(() => undefined);
    const exists = await this.getConnectionItem(name)
      .isVisible()
      .catch(() => false);
    await this.closeSwitcher().catch(() => undefined);
    return exists;
  }

  async isNewConnectionModalVisible(): Promise<boolean> {
    return await this.page
      .getByRole("heading", { name: "New connection" })
      .isVisible()
      .catch(() => false);
  }

  async waitForReady(): Promise<void> {
    // Wait on UI readiness — not waitForResponse("connections"). That races with
    // goto() (response often already finished) and burns the full 30s timeout.
    await this.page.waitForLoadState("domcontentloaded");
    await expect(this.addConnectionButton).toBeVisible({ timeout: 30000 });
    // Let the connections list load so an empty-state "New connection" auto-open lands now,
    // not in the middle of the next click. Capped: a long-lived stream must not block here.
    await this.page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .catch(() => undefined);
  }

  async openNewConnectionModal(): Promise<void> {
    const modalHeading = this.page.getByRole("heading", {
      name: "New connection",
    });
    const addBtn = this.addConnectionButton;

    if (await modalHeading.isVisible().catch(() => false)) {
      return;
    }

    await addBtn.waitFor({ state: "visible", timeout: 30000 });

    if (await modalHeading.isVisible().catch(() => false)) {
      return;
    }

    await addBtn.click();
    await expect(modalHeading).toBeVisible();
  }

  async fillConnectionForm(config: ConnectionConfig): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "New connection" }),
    ).toBeVisible({ timeout: 15000 });
    await this.nameInput.waitFor({ state: "visible", timeout: 15000 });
    await this.nameInput.fill(config.name);

    if (config.type === "SQLite") {
      await this.page.locator('input[name="path"]').fill(config.host);
      return;
    }

    await this.hostInput.clear();
    await this.hostInput.fill(config.host);
    await this.portInput.clear();
    await this.portInput.fill(config.port);
    await this.usernameInput.fill(config.username);
    await this.passwordInput.fill(config.password);

    if (config.database) {
      await this.page.locator('input[name="database"]').fill(config.database);
    }

    if (config.ssl) {
      await this.applySslConfig(config.ssl);
    }

    if (config.ssh) {
      await this.applySshConfig(config.ssh);
    }
  }

  async openSshTab(): Promise<void> {
    await this.page.getByTestId("connection-tab-ssh").click();
    await expect(this.page.getByTestId("connection-ssh-fields")).toBeVisible();
  }

  async setSshEnabled(enabled: boolean): Promise<void> {
    await this.openSshTab();
    await this.page.getByTestId("ssh-enabled").setChecked(enabled);
  }

  private async fillSshHop(
    prefix: "ssh" | "sshJump",
    hop: Omit<ConnectionSshConfig, "jump">,
  ): Promise<void> {
    const labels = {
      password: "Password",
      key: "Private key",
      agent: "SSH agent",
    };
    const page = this.page;
    const root = page.getByTestId(`${prefix}-fields`);

    await root.locator(`input[name="${prefix}Host"]`).fill(hop.host);
    await root.locator(`input[name="${prefix}Port"]`).fill(hop.port);
    await root.locator(`input[name="${prefix}Username"]`).fill(hop.username);
    await root.locator(`.${prefix}-auth__control`).click();
    await page
      .getByRole("option", { name: labels[hop.authMethod], exact: true })
      .click();

    if (hop.authMethod === "password") {
      await root
        .locator(`input[name="${prefix}Password"]`)
        .fill(hop.password ?? "");
    }
    if (hop.authMethod === "key") {
      await page
        .getByTestId(`${prefix}-private-key`)
        .fill(hop.privateKey ?? "");
      if (hop.passphrase) {
        await root
          .locator(`input[name="${prefix}Passphrase"]`)
          .fill(hop.passphrase);
      }
    }
  }

  async applySshConfig(ssh: ConnectionSshConfig): Promise<void> {
    await this.setSshEnabled(true);
    await this.fillSshHop("ssh", ssh);

    if (ssh.jump) {
      await this.page.getByTestId("ssh-jump-enabled").check();
      await this.fillSshHop("sshJump", ssh.jump);
    }
  }

  async openSslTab(): Promise<void> {
    await this.page.getByTestId("connection-tab-ssl").click();
    await expect(this.page.getByTestId("connection-ssl-fields")).toBeVisible();
  }

  async openGeneralTab(): Promise<void> {
    await this.page.getByTestId("connection-tab-general").click();
    await expect(this.nameInput).toBeVisible();
  }

  async setSslMode(
    mode: NonNullable<ConnectionConfig["ssl"]>["mode"],
  ): Promise<void> {
    const labels: Record<NonNullable<ConnectionConfig["ssl"]>["mode"], string> =
      {
        disable: "Disable",
        allow: "Allow",
        prefer: "Prefer",
        require: "Require",
        "verify-ca": "Verify CA",
        "verify-full": "Verify Full",
      };

    await this.openSslTab();
    await this.page.locator(".ssl-mode__control").click();
    await this.page
      .getByRole("option", { name: labels[mode], exact: true })
      .click();
    await expect(this.page.locator(".ssl-mode__single-value")).toHaveText(
      labels[mode],
    );
  }

  async fillSslCaCert(pem: string): Promise<void> {
    await this.openSslTab();
    await this.page.getByTestId("ssl-textarea-sslCaCert").fill(pem);
  }

  async loadSslCaCertFile(filePath: string): Promise<void> {
    await this.openSslTab();
    await this.page
      .getByTestId("ssl-file-input-sslCaCert")
      .setInputFiles(filePath);
    await expect(this.page.getByTestId("ssl-textarea-sslCaCert")).toContainText(
      "BEGIN CERTIFICATE",
    );
  }

  async applySslConfig(ssl: ConnectionSslConfig): Promise<void> {
    await this.setSslMode(ssl.mode);
    if (ssl.caCert) {
      await this.fillSslCaCert(ssl.caCert);
    }
    if (ssl.clientCert) {
      await this.page
        .getByTestId("ssl-textarea-sslClientCert")
        .fill(ssl.clientCert);
    }
    if (ssl.clientKey) {
      await this.page
        .getByTestId("ssl-textarea-sslClientKey")
        .fill(ssl.clientKey);
    }
  }

  async enableUriMode(): Promise<void> {
    if (await this.useUriCheckbox.isChecked()) {
      return;
    }
    await this.useUriCheckbox.check();
    await expect(this.uriInput).toBeEnabled();
  }

  async fillConnectionUri(uri: string): Promise<void> {
    await this.enableUriMode();
    await this.uriInput.fill(uri);
    await this.uriInput.blur();
  }

  async createConnectionFromUri(
    name: string,
    uri: string,
    type: ConnectionConfig["type"] = "PostgreSQL",
  ): Promise<void> {
    await this.openNewConnectionModal();
    await this.selectConnectionType(type || "PostgreSQL");
    await this.nameInput.fill(name);
    await this.fillConnectionUri(uri);
    await this.page
      .getByRole("checkbox", { name: "Remember password" })
      .check();
    await this.testConnection();
    await this.submitConnection();
    await this.openSwitcher();
    await expect(this.getConnectionItem(name)).toBeVisible({
      timeout: 30000,
    });
    await this.closeSwitcher();
  }

  async expectSslMode(
    mode: NonNullable<ConnectionConfig["ssl"]>["mode"],
  ): Promise<void> {
    const labels: Record<NonNullable<ConnectionConfig["ssl"]>["mode"], string> =
      {
        disable: "Disable",
        allow: "Allow",
        prefer: "Prefer",
        require: "Require",
        "verify-ca": "Verify CA",
        "verify-full": "Verify Full",
      };
    await this.openSslTab();
    await expect(this.page.locator(".ssl-mode__single-value")).toHaveText(
      labels[mode],
    );
  }

  async selectConnectionType(type: string = "PostgreSQL"): Promise<void> {
    await this.connectionTypeSelector(type).click();
    await this.selectConnectionButton.click();
    await this.nameInput.waitFor({ state: "visible", timeout: 30000 });
  }

  async testConnection(): Promise<void> {
    const response = await waitForResponseDuring(
      this.page,
      apiRoute.connectionsPing,
      () => this.testConnectionButton.click(),
      API_DB_TIMEOUT,
    );
    expect(response.status()).toBe(200);
  }

  async submitConnection(): Promise<void> {
    await waitForResponseDuring(this.page, apiRoute.connectionsSave, () =>
      this.createConnectionButton.click(),
    );
    await expect(
      this.page.getByRole("heading", { name: /^(New|Edit) connection$/ }),
    ).toBeHidden({ timeout: 10_000 });
  }

  async createConnection(config: ConnectionConfig): Promise<void> {
    await this.openNewConnectionModal();
    await this.selectConnectionType(config.type || "PostgreSQL");
    await this.fillConnectionForm(config);
    await this.testConnection();
    await this.submitConnection();
    await this.openSwitcher();
    await expect(this.getConnectionItem(config.name)).toBeVisible({
      timeout: 30000,
    });
    await this.getConnectionItem(config.name).click();
    await expect(this.switcherPanel).toBeHidden();
    await this.waitForConnectionActive();
  }

  async waitForConnectionActive(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "sql", exact: true }),
    ).toBeEnabled({
      timeout: 30000,
    });
    await expect(this.page.getByRole("treeitem").first()).toBeVisible({
      timeout: 30000,
    });
  }

  /** A locked connection asks for its password inline in the explorer, not in a dialog. */
  async handlePasswordPrompt(password: string): Promise<void> {
    const panel = this.page.getByTestId("connection-unlock-panel");
    if (!(await panel.isVisible({ timeout: 5000 }).catch(() => false))) {
      return;
    }

    await panel.locator('input[name="password"]').fill(password);

    await waitForResponseDuring(this.page, apiRoute.connectionCredentials, () =>
      panel.getByTestId("connection-unlock-submit").click(),
    );
    await expect(panel).toBeHidden({ timeout: 10_000 });
  }

  async activateConnection(name: string, password = "secret"): Promise<void> {
    // Do not soft-wait for PUT/PATCH — already-active connections may not hit the
    // API, and a caught timeout still burns ~15s in the report.
    await this.openSwitcher();
    await this.getConnectionItem(name).click();
    await expect(this.switcherPanel).toBeHidden();
    await this.handlePasswordPrompt(password);
    await this.waitForConnectionActive();
  }

  async setupConnection(config: ConnectionConfig): Promise<void> {
    await this.goto();
    await this.waitForReady();

    const exists = await this.connectionExists(config.name);
    if (!exists) {
      await this.createConnection(config);
      return;
    }
    await this.activateConnection(config.name, config.password);
  }

  async openContextMenu(connectionName: string): Promise<void> {
    await this.closeSwitcher();
    await this.openSwitcher();
    await this.getConnectionItem(connectionName).click({ button: "right" });
    await expect(this.page.getByRole("menu")).toBeVisible();
  }

  async clickContextMenuItem(menuItemName: string): Promise<void> {
    await this.page
      .getByRole("menu")
      .getByRole("menuitem", { name: menuItemName })
      .click();
  }

  async dismissNewConnectionModalIfOpen(): Promise<void> {
    const heading = this.page.getByRole("heading", { name: "New connection" });
    if (!(await heading.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }
    await this.page.getByRole("button", { name: "Cancel" }).click();
    await expect(heading).toBeHidden();
  }

  async deleteConnection(name: string): Promise<void> {
    await this.openContextMenu(name);
    await this.clickContextMenuItem("Delete");
    await expect(
      this.page.getByRole("heading", { name: "Delete action!" }),
    ).toBeVisible();
    await this.page.getByRole("button", { name: "Delete" }).click();
    await expect(this.getConnectionItem(name)).toBeHidden();

    // Deleting the last connection auto-opens the New connection modal.
    const remaining = this.page.locator('[data-testid^="connection-item-"]');
    if ((await remaining.count()) === 0) {
      await this.dismissNewConnectionModalIfOpen();
    }
  }

  async editConnection(name: string): Promise<void> {
    await this.openContextMenu(name);
    await this.clickContextMenuItem("Edit");

    const confirmContinue = this.page.getByRole("button", { name: "Yes" });
    if (await confirmContinue.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmContinue.click();
      await expect(confirmContinue).toBeHidden();
    }

    await expect(this.nameInput).toBeVisible({ timeout: 15000 });
  }

  async duplicateConnection(name: string): Promise<void> {
    await this.openContextMenu(name);
    await this.clickContextMenuItem("Duplicate");
    await expect(
      this.page.getByRole("heading", { name: "New connection" }),
    ).toBeVisible();
    await expect(this.nameInput).toBeVisible({ timeout: 15000 });
  }

  async reorderConnection(
    sourceName: string,
    targetName: string,
  ): Promise<void> {
    await this.openSwitcher();
    const source = this.getConnectionItem(sourceName);
    const target = this.getConnectionItem(targetName);
    await expect(source).toBeVisible();
    await expect(target).toBeVisible();

    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) {
      throw new Error("connection items have no bounding box");
    }

    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // PointerSensor activationDistance is 8px; a single dragTo jump does not activate.
    await this.page.mouse.move(startX, startY + 16, { steps: 4 });
    await this.page.mouse.move(endX, endY, { steps: 12 });
    await this.page.mouse.up();
  }

  getConnectionItems(): Locator {
    return this.page.locator('[data-testid^="connection-item-"]');
  }

  async refreshConnection(name: string): Promise<void> {
    await this.openContextMenu(name);
    await waitForResponseDuring(this.page, apiRoute.connectionsList, () =>
      this.clickContextMenuItem("Refresh"),
    );
  }

  async closeContextMenu(): Promise<void> {
    const menu = this.page.getByRole("menu");
    await expect(menu).toBeVisible();
    await menu.focus();
    await this.page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  }
}
