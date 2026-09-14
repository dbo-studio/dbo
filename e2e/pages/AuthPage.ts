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
    await this.page.getByTestId("auth-submit").click({ noWaitAfter: true });
  }

  async expectChangePasswordVisible(): Promise<void> {
    await expect(
      this.page.getByTestId("auth-change-password-submit"),
    ).toBeVisible({ timeout: 30000 });
  }

  async changePasswordForced(nextPassword: string): Promise<void> {
    await this.page.getByTestId("auth-new-password").fill(nextPassword);
    await this.page.getByTestId("auth-confirm-password").fill(nextPassword);
    await this.page
      .getByTestId("auth-change-password-submit")
      .click({ noWaitAfter: true });
  }

  async changePassword(
    currentPassword: string,
    nextPassword: string,
  ): Promise<void> {
    const currentField = this.page.getByTestId("auth-current-password");
    if (await currentField.isVisible().catch(() => false)) {
      await currentField.fill(currentPassword);
    }
    await this.page.getByTestId("auth-new-password").fill(nextPassword);
    await this.page.getByTestId("auth-confirm-password").fill(nextPassword);
    await this.page
      .getByTestId("auth-change-password-submit")
      .click({ noWaitAfter: true });
  }

  async loginAdmin(adminPassword = "AdminPass1!"): Promise<void> {
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
    const bootstrapPassword = process.env.E2E_ADMIN_PASSWORD ?? "bootstrap1";
    const candidates = [
      bootstrapPassword,
      adminPassword,
      "AdminPass2!",
    ].filter((password, index, all) => all.indexOf(password) === index);

    await this.page.goto("/");
    if (
      await this.page
        .getByTestId("add-connection")
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    await this.expectLoginVisible();

    for (const password of candidates) {
      await this.page.getByTestId("auth-email").fill(adminEmail);
      await this.page.getByTestId("auth-password").fill(password);
      const submit = this.page.getByTestId("auth-submit");
      await expect(submit).toBeEnabled({ timeout: 10000 });
      await submit.click({ noWaitAfter: true });

      const changeSubmit = this.page.getByTestId("auth-change-password-submit");
      const appReady = this.page.getByTestId("add-connection");

      try {
        await expect(changeSubmit.or(appReady)).toBeVisible({ timeout: 15000 });
      } catch {
        await expect(submit).toBeEnabled({ timeout: 10000 }).catch(() => undefined);
        continue;
      }

      if (await changeSubmit.isVisible().catch(() => false)) {
        await this.changePasswordForced(adminPassword);
      }

      await this.expectAppReady();
      return;
    }

    await this.expectAppReady();
  }

  async expectAppReady(): Promise<void> {
    await expect(this.page.getByTestId("add-connection")).toBeVisible({
      timeout: 30000,
    });
  }
}
