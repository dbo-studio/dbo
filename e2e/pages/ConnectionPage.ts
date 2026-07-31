import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export interface ConnectionSslConfig {
  mode: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
}

export interface ConnectionConfig {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  database?: string;
  type?: "PostgreSQL" | "MySQL" | "SQLite";
  ssl?: ConnectionSslConfig;
}

/**
 * Page Object for Connection management
 */
export class ConnectionPage extends BasePage {
  // Locators
  readonly newConnectionModal: Locator;
  readonly editConnectionModal: Locator;
  readonly connectionTypeSelector: (type: string) => Locator;
  readonly selectConnectionButton: Locator;
  readonly testConnectionButton: Locator;
  readonly createConnectionButton: Locator;
  readonly addConnectionButton: Locator;

  // Form fields
  readonly nameInput: Locator;
  readonly hostInput: Locator;
  readonly portInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;

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
  }

  getConnectionItem(name: string): Locator {
    return this.page.getByTestId(`connection-item-${name}`);
  }

  getConnectionHeading(name: string): Locator {
    return this.page.getByRole("heading", { name: new RegExp(name, "i") });
  }

  async connectionExists(name: string): Promise<boolean> {
    return await this.getConnectionItem(name)
      .isVisible()
      .catch(() => false);
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
    await expect(this.addConnectionButton).toBeVisible({ timeout: 15000 });
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
    await this.page.getByRole("option", { name: labels[mode], exact: true }).click();
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
      await this.page.getByTestId("ssl-textarea-sslClientCert").fill(ssl.clientCert);
    }
    if (ssl.clientKey) {
      await this.page.getByTestId("ssl-textarea-sslClientKey").fill(ssl.clientKey);
    }
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
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("connections/ping") &&
        response.request().method() === "POST",
      { timeout: 30000 },
    );
    await this.testConnectionButton.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
  }

  async submitConnection(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/connections") &&
        !response.url().includes("/ping") &&
        ["POST", "PATCH"].includes(response.request().method()) &&
        response.status() === 200,
      { timeout: 30000 },
    );
    await this.createConnectionButton.click();
    await responsePromise;
    await expect(
      this.page.getByRole("heading", { name: /^(New|Edit) connection$/ }),
    ).toBeHidden();
    await this.wait(1000);
  }

  async createConnection(config: ConnectionConfig): Promise<void> {
    await this.openNewConnectionModal();
    await this.selectConnectionType(config.type || "PostgreSQL");
    await this.fillConnectionForm(config);
    await this.testConnection();
    await this.submitConnection();
    await expect(this.getConnectionItem(config.name)).toBeVisible({
      timeout: 30000,
    });
    await this.getConnectionItem(config.name).click();
    await this.waitForConnectionActive();
  }

  async waitForConnectionActive(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "sql" })).toBeEnabled({
      timeout: 30000,
    });
    await expect(this.page.getByRole("treeitem").first()).toBeVisible({
      timeout: 30000,
    });
  }

  async handlePasswordPrompt(password: string): Promise<void> {
    const heading = this.page.getByRole("heading", {
      name: "Password",
      exact: true,
    });
    if (!(await heading.isVisible({ timeout: 5000 }).catch(() => false))) {
      return;
    }

    await this.passwordInput.fill(password);

    const savePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("credentials") && response.status() === 200,
      { timeout: 15000 },
    );
    await this.page.getByRole("button", { name: "Save" }).click();
    await savePromise;
    await this.wait(1000);
  }

  async activateConnection(name: string, password = "secret"): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("connections") &&
        ["PUT", "PATCH"].includes(response.request().method()) &&
        response.status() === 200,
      { timeout: 15000 },
    );
    await this.getConnectionItem(name).click();
    await responsePromise.catch(() => undefined);
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
    await this.getConnectionItem(connectionName).click({ button: "right" });
    await this.wait(300);
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

  async refreshConnection(name: string): Promise<void> {
    await this.openContextMenu(name);
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("connections") && response.status() === 200,
      { timeout: 10000 },
    );
    await this.clickContextMenuItem("Refresh");
    await responsePromise;
  }

  async closeContextMenu(): Promise<void> {
    await this.page.locator(".MuiBackdrop-root").click();
  }
}
