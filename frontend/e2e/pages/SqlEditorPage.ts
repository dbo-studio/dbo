import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for SQL Editor
 */
export class SqlEditorPage extends BasePage {
    readonly editor: Locator;
    readonly openEditorButton: Locator;
    readonly saveButton: Locator;
    readonly runButton: Locator;
    readonly formatButton: Locator;
    readonly minifyButton: Locator;

    constructor(page: Page) {
        super(page);

        this.editor = page.locator('.monaco-editor').first();
        this.openEditorButton = page.getByRole('button', { name: /open editor/i });
        this.saveButton = page.getByRole('button', { name: /save/i }).first();
        this.runButton = page.locator('[data-testid="run-query"], button:has-text("Run")').first();
        this.formatButton = page.getByRole('button', { name: /beatify|format/i });
        this.minifyButton = page.getByRole('button', { name: /minify/i });
    }

    async open(): Promise<void> {
        try {
            await this.openEditorButton.click({ timeout: 2000 });
        } catch {
            // Fallback to keyboard shortcut
            await this.pressKey('Control+N');
        }
        await this.wait(500);
    }

    async focus(): Promise<void> {
        await this.editor.click();
    }

    async clearEditor(): Promise<void> {
        await this.focus();
        await this.pressKey('Control+A');
    }

    async typeQuery(sql: string): Promise<void> {
        await this.clearEditor();
        await this.page.keyboard.type(sql);
    }

    async runQuery(): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes('query') && response.status() === 200,
            { timeout: 15000 }
        );
        await this.pressKey('Control+Enter');
        await responsePromise;
        await this.wait(500);
    }

    async typeAndRun(sql: string): Promise<void> {
        await this.typeQuery(sql);
        await this.runQuery();
    }

    async saveQuery(): Promise<void> {
        const responsePromise = this.page.waitForResponse(
            response => response.url().includes('saved-queries') && response.status() === 200,
            { timeout: 10000 }
        );
        await this.saveButton.click();
        await responsePromise;
        await expect(this.page.getByText(/query saved successfully/i)).toBeVisible({ timeout: 5000 });
        await this.wait(500);
    }

    async getEditorContent(): Promise<string> {
        return await this.editor.textContent() || '';
    }

    async expectEditorContains(text: string): Promise<void> {
        await expect(this.editor).toContainText(text);
    }
}

