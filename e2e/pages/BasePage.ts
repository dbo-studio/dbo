import { type Page } from '@playwright/test';

/**
 * Base Page Object - contains common functionality for all pages
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async waitForReady(): Promise<void> {
    // await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  async waitForResponse(urlPattern: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForResponse((response) => response.url().includes(urlPattern) && response.status() === 200, {
      timeout
    });
  }

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
