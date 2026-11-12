import { expect, test } from "@playwright/test";
import { ConnectionPage } from "../../pages";

/** A rejected create keeps the modal open and every typed value in place. */
test.describe("Connection form failure", () => {
  test("failed create preserves entered values", async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    await connectionPage.goto();
    await connectionPage.waitForReady();

    await page.route("**/api/connections", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "rejected" }),
        });
        return;
      }
      await route.fallback();
    });

    await connectionPage.openNewConnectionModal();
    await connectionPage.selectConnectionType("SQLite");
    await connectionPage.fillConnectionForm({
      type: "SQLite",
      name: "keep-me",
      host: "/tmp/keep-me.db",
      port: "",
      username: "",
      password: "",
    });

    const create = connectionPage.createConnectionButton;
    const rejected = page.waitForResponse(
      (r) => r.url().endsWith("/api/connections") && r.request().method() === "POST",
    );
    await create.click();
    expect((await rejected).status()).toBe(400);

    await expect(connectionPage.nameInput).toHaveValue("keep-me");
    await expect(page.locator('input[name="path"]')).toHaveValue("/tmp/keep-me.db");
  });
});
