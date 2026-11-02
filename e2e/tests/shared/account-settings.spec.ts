import { expect, test } from "@playwright/test";
import { ConnectionPage, SettingsPage } from "../../pages";

// The config seeds a signed-in account (e2e@example.com).
test("Settings, General shows the signed-in account and signs out", async ({
  page,
}) => {
  const connectionPage = new ConnectionPage(page);
  const settingsPage = new SettingsPage(page);

  await connectionPage.goto();
  await connectionPage.waitForReady();
  await settingsPage.open();

  await expect(page.getByText("Signed in as e2e@example.com")).toBeVisible();

  await page.getByTestId("account-sign-out").click();
  await expect(page.getByText("Not signed in")).toBeVisible();

  await page.getByTestId("account-sign-in").click();
  await expect(page.getByTestId("account-step")).toBeVisible();
});
