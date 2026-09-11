import { expect, test } from "@playwright/test";
import { AuthPage } from "../../pages/AuthPage";
import { SettingsPage } from "../../pages/SettingsPage";

/**
 * Account password change from Settings → Security.
 * Run: E2E_LOCAL_AUTH=1 npm test -- tests/shared/auth-security-settings.spec.ts
 */
test.describe("Security settings account password", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "1",
      "Set E2E_LOCAL_AUTH=1 to run local auth stack",
    );
  });

  test("user changes login password from Security panel", async ({ page }) => {
    const auth = new AuthPage(page);
    const settings = new SettingsPage(page);
    const currentPassword = "AdminPass1!";
    const nextPassword = "AdminPass2!";

    await test.step("sign in as admin", async () => {
      await auth.loginAdmin(currentPassword);
    });

    await test.step("change password in Security settings", async () => {
      await settings.open();
      await settings.navigateTo("Security");
      await settings.changeAccountPassword(currentPassword, nextPassword);
      await expect(page.getByText("Password updated.").first()).toBeVisible({
        timeout: 10000,
      });
    });

    await test.step("sign out and sign in with new password", async () => {
      await settings.navigateTo("General");
      await page.getByRole("button", { name: "Log out" }).click();
      await auth.expectLoginVisible();
      await auth.login(
        process.env.E2E_ADMIN_EMAIL ?? "admin@example.com",
        nextPassword,
      );
      await auth.expectAppReady();
    });
  });
});
