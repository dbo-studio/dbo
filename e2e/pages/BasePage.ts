import { type Page } from "@playwright/test";

/**
 * Base Page Object - contains common functionality for all pages.
 * For API waits paired with a click, use `waitForResponseDuring` / `pendingResponse`
 * from `helpers/network.ts` — never start `waitForResponse` after the action.
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
  }

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
