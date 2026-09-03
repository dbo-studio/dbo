import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Workspace tab chrome (close / dirty confirm).
 */
export class WorkspacePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getTab(title: string): Locator {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    return this.page.getByTestId(`workspace-tab-${slug}`);
  }

  get confirmYes(): Locator {
    return this.page.getByRole("button", { name: "Yes" });
  }

  get confirmCancel(): Locator {
    return this.page.getByRole("button", { name: "Cancel" });
  }

  get dirtyConfirmMessage(): Locator {
    return this.page.getByText("Are you sure you want to close this tab?");
  }

  async closeTab(title: string): Promise<void> {
    const tab = this.getTab(title);
    await expect(tab).toBeVisible({ timeout: 15000 });
    await tab.hover();
    await tab.locator("svg").last().click({ force: true });
  }

  async closeTabConfirmYes(title: string): Promise<void> {
    await this.closeTab(title);
    await expect(this.dirtyConfirmMessage).toBeVisible({ timeout: 10000 });
    await this.confirmYes.click();
    await expect(this.getTab(title)).toBeHidden({ timeout: 10000 });
  }

  async closeTabConfirmCancel(title: string): Promise<void> {
    await this.closeTab(title);
    await expect(this.dirtyConfirmMessage).toBeVisible({ timeout: 10000 });
    await this.confirmCancel.click();
    await expect(this.dirtyConfirmMessage).toBeHidden({ timeout: 10000 });
    await expect(this.getTab(title)).toBeVisible({ timeout: 10000 });
  }

  async closeTabExpectNoConfirm(title: string): Promise<void> {
    await this.closeTab(title);
    await expect(this.dirtyConfirmMessage).toBeHidden({ timeout: 2000 });
    await expect(this.getTab(title)).toBeHidden({ timeout: 10000 });
  }

  /** Close the first workspace tab, confirming the dirty dialog when it appears. */
  async closeFirstTab(): Promise<void> {
    const tab = this.page.locator('[data-testid^="workspace-tab-"]').first();
    await expect(tab).toBeVisible({ timeout: 15000 });
    await tab.hover();
    await tab.locator("svg").last().click({ force: true });
    const confirm = this.dirtyConfirmMessage;
    await confirm.waitFor({ state: "visible", timeout: 2000 }).then(
      async () => {
        await this.confirmYes.click();
      },
      () => undefined,
    );
    await expect(tab).toBeHidden({ timeout: 10000 });
  }
}
