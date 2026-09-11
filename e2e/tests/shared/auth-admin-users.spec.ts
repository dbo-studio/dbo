import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { AuthPage } from "../../pages/AuthPage";
import { SettingsPage } from "../../pages/SettingsPage";

/**
 * Administration users table. Requires E2E_LOCAL_AUTH=1.
 * Run: npm run test:auth
 */
test.describe("Administration users", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "1",
      "Set E2E_LOCAL_AUTH=1 to run local auth stack",
    );
  });

  test("admin creates a member in the users table", async ({
    page,
  }, testInfo) => {
    const auth = new AuthPage(page);
    const settings = new SettingsPage(page);
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
    const memberEmail = `admin_user_${uniqueTestSuffix(testInfo)}@example.com`;
    const memberTemp = "TempPass1!";
    const resetTemp = "TempPass2!";

    await test.step("admin signs in", async () => {
      await auth.loginAdmin();
    });

    await test.step("open Administration users table", async () => {
      await settings.open();
      await settings.navigateTo("Administration");
      await settings.expectAdminUsersTable();
      const adminRow = settings.adminUserRow(adminEmail);
      await expect(adminRow).toBeVisible();
      await settings.openAdminUserMenu(adminEmail);
      await expect(
        page.getByTestId(`admin-user-disable-${adminEmail}`),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
    });

    await test.step("create member from the form", async () => {
      await settings.createAdminUser(memberEmail, memberTemp);
      const row = settings.adminUserRow(memberEmail);
      await expect(row.getByText("Active", { exact: true })).toBeVisible();
      await expect(row.getByText("Must change password")).toBeVisible();
    });

    await test.step("reset password from the row dialog", async () => {
      await settings.resetAdminUserPassword(memberEmail);
      await settings.submitAdminResetPassword(resetTemp);
    });

    await test.step("open share connections modal for member", async () => {
      await settings.openAdminShareConnections(memberEmail);
      await expect(page.getByTestId("admin-share-connections-modal")).toBeVisible();
      await expect(page.getByTestId("admin-share-existing-panel")).toBeVisible();
      await expect(page.getByTestId("admin-share-picker-panel")).toBeVisible();
      await expect(page.getByText("This user has no shared connections yet.")).toBeVisible();
      await page.keyboard.press("Escape");
    });

    await test.step("disable the member", async () => {
      const row = settings.adminUserRow(memberEmail);
      await settings.disableAdminUser(memberEmail);
      await expect(row.getByText("Disabled", { exact: true })).toBeVisible({
        timeout: 10000,
      });
      await settings.openAdminUserMenu(memberEmail);
      await expect(
        page.getByTestId(`admin-user-disable-${memberEmail}`),
      ).toHaveText("Enable");
      await page.keyboard.press("Escape");
    });
  });
});
