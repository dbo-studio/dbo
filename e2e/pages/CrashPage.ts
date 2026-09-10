import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CrashPage extends BasePage {
  readonly screen: Locator;
  readonly reloadButton: Locator;

  constructor(page: Page) {
    super(page);
    this.screen = page.getByTestId("crash-screen");
    this.reloadButton = page.getByTestId("crash-reload");
  }

  async gotoCrash(): Promise<void> {
    await this.page.goto("/?crash=1", { waitUntil: "domcontentloaded" });
  }

  async expectVisible(): Promise<void> {
    await expect(this.screen).toBeVisible();
    await expect(this.page.getByText("Something went wrong")).toBeVisible();
    await expect(this.reloadButton).toBeVisible();
  }

  async reloadAndClear(): Promise<void> {
    await this.reloadButton.click({ noWaitAfter: true });
  }
}
