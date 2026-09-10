import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class AuthPage {
  constructor(private readonly page: Page) {}

  async expectLoginVisible(): Promise<void> {
    await expect(this.page.getByTestId("auth-submit")).toBeVisible({
      timeout: 30000,
    });
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.getByTestId("auth-email").fill(email);
    await this.page.getByTestId("auth-password").fill(password);
    await this.page.getByTestId("auth-submit").click();
  }

  async expectChangePasswordVisible(): Promise<void> {
    await expect(
      this.page.getByTestId("auth-change-password-submit"),
    ).toBeVisible({ timeout: 30000 });
  }

  async changePassword(
    currentPassword: string,
    nextPassword: string,
  ): Promise<void> {
    await this.page.getByTestId("auth-current-password").fill(currentPassword);
    await this.page.getByTestId("auth-new-password").fill(nextPassword);
    await this.page.getByTestId("auth-confirm-password").fill(nextPassword);
    await this.page.getByTestId("auth-change-password-submit").click();
  }

  async expectAppReady(): Promise<void> {
    await expect(this.page.getByTestId("add-connection")).toBeVisible({
      timeout: 30000,
    });
  }
}
