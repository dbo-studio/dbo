import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface ConnectionConfig {
    name: string;
    host: string;
    port: string;
    username: string;
    password: string;
    type?: 'PostgreSQL' | 'MySQL' | 'SQLite';
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

        this.newConnectionModal = page.getByText('New connection');
        this.editConnectionModal = page.getByText('Edit connection');
        this.connectionTypeSelector = (type: string) => page.getByTestId(`selected-connection-${type}`);
        this.selectConnectionButton = page.getByTestId('select-connection');
        this.testConnectionButton = page.getByTestId('test-connection');
        this.createConnectionButton = page.getByTestId('create-connection');
        this.addConnectionButton = page.getByTestId('add-connection');

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
        return this.page.getByRole('heading', { name: new RegExp(name, 'i') });
    }

    async connectionExists(name: string): Promise<boolean> {
        return await this.getConnectionItem(name).isVisible().catch(() => false);
    }

    async isNewConnectionModalVisible(): Promise<boolean> {
        return await this.newConnectionModal.isVisible().catch(() => false);
    }

    async openNewConnectionModal(): Promise<void> {
        if (!(await this.isNewConnectionModalVisible())) {
            await this.addConnectionButton.click();
        }
        await expect(this.newConnectionModal).toBeVisible();
    }

    async fillConnectionForm(config: ConnectionConfig): Promise<void> {
        await this.nameInput.fill(config.name);
        await this.hostInput.fill(config.host);
        await this.portInput.fill(config.port);
        await this.usernameInput.fill(config.username);
        await this.passwordInput.fill(config.password);
    }

    async selectConnectionType(type: string = 'PostgreSQL'): Promise<void> {
        await this.connectionTypeSelector(type).click();
        await this.selectConnectionButton.click();
    }

    async testConnection(): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes('connections/ping') && response.status() === 200,
            { timeout: 10000 }
        );
        await this.testConnectionButton.click();
        await responsePromise;
    }

    async submitConnection(): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes('connections') && response.status() === 200,
            { timeout: 10000 }
        );
        await this.createConnectionButton.click();
        await responsePromise;
        await expect(this.newConnectionModal).toBeHidden();
        await this.wait(1000);
    }

    async createConnection(config: ConnectionConfig): Promise<void> {
        await this.openNewConnectionModal();
        await this.selectConnectionType(config.type || 'PostgreSQL');
        await this.fillConnectionForm(config);
        await this.testConnection();
        await this.submitConnection();
        await expect(this.getConnectionItem(config.name)).toBeVisible();
    }

    async activateConnection(name: string): Promise<void> {
        await this.getConnectionItem(name).click();
        await this.wait(1000);
    }

    async setupConnection(config: ConnectionConfig): Promise<void> {
        const exists = await this.connectionExists(config.name);
        if (!exists) {
            await this.createConnection(config);
        }
        await this.activateConnection(config.name);
    }

    async openContextMenu(connectionName: string): Promise<void> {
        await this.getConnectionItem(connectionName).click({ button: 'right' });
        await this.wait(300);
    }

    async clickContextMenuItem(menuItemName: string): Promise<void> {
        await this.page.getByRole('menu').getByRole('menuitem', { name: menuItemName }).click();
    }

    async deleteConnection(name: string): Promise<void> {
        await this.openContextMenu(name);
        await this.clickContextMenuItem('Delete');
        await expect(this.page.getByRole('heading', { name: 'Delete action!' })).toBeVisible();
        await this.page.getByRole('button', { name: 'Yes' }).click();
        await expect(this.getConnectionItem(name)).toBeHidden();
    }

    async editConnection(name: string): Promise<void> {
        await this.openContextMenu(name);
        await this.clickContextMenuItem('Edit');
        await expect(this.editConnectionModal).toBeVisible();
    }

    async refreshConnection(name: string): Promise<void> {
        await this.openContextMenu(name);
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes('connections') && response.status() === 200,
            { timeout: 10000 }
        );
        await this.clickContextMenuItem('Refresh');
        await responsePromise;
    }

    async closeContextMenu(): Promise<void> {
        await this.page.locator('.MuiBackdrop-root').click();
    }
}

