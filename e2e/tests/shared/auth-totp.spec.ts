import { expect, test } from "@playwright/test";
import { authenticator } from "otplib";
import { AuthPage } from "../../pages/AuthPage";
import { SettingsPage } from "../../pages/SettingsPage";

/**
 * TOTP 2FA enable + login + admin disable.
 * Run: E2E_LOCAL_AUTH=1 npm test -- tests/shared/auth-totp.spec.ts
 */
test.describe("TOTP two-factor authentication", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "1",
      "Set E2E_LOCAL_AUTH=1 to run local auth stack",
    );
  });

  test("enable 2FA, login with OTP, admin disables for user", async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    const settings = new SettingsPage(page);
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
    const adminPassword = "AdminPass1!";
    let totpSecret = "";

    await test.step("admin signs in", async () => {
      await auth.loginAdmin(adminPassword);
    });

    await test.step("enable TOTP in Security settings", async () => {
      await settings.open();
      await settings.navigateTo("Security");
      await page.getByTestId("auth-totp-setup").click();
      await expect(page.getByTestId("auth-totp-qr")).toBeVisible({ timeout: 10000 });
      const secretEl = page.getByTestId("auth-totp-secret");
      await expect(secretEl).toBeVisible({ timeout: 10000 });
      totpSecret = (await secretEl.textContent())?.trim() ?? "";
      expect(totpSecret.length).toBeGreaterThan(10);
      const code = authenticator.generate(totpSecret);
      await page.getByTestId("auth-totp-enable-code").fill(code);
      await page.getByTestId("auth-totp-enable-submit").click();
      await expect(page.getByText("Two-factor authentication enabled.").first()).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("logout and login with OTP", async () => {
      await settings.navigateTo("General");
      await page.getByRole("button", { name: "Log out" }).click();
      await auth.expectLoginVisible();
      await auth.login(adminEmail, adminPassword);
      await expect(page.getByTestId("auth-totp-submit")).toBeVisible({
        timeout: 10000,
      });
      const code = authenticator.generate(totpSecret);
      await page.getByTestId("auth-totp-code").fill(code);
      await page.getByTestId("auth-totp-submit").click();
      await auth.expectAppReady();
    });

    await test.step("admin disables 2FA from users table", async () => {
      await settings.open();
      await settings.navigateTo("Administration");
      await expect(page.getByTestId(`admin-user-totp-${adminEmail}`)).toHaveText(
        "On",
      );
      await settings.openAdminUserMenu(adminEmail);
      await page.getByTestId(`admin-user-disable-totp-${adminEmail}`).click();
      await expect(page.getByText("User updated.").first()).toBeVisible({
        timeout: 10000,
      });
    });
  });
});
