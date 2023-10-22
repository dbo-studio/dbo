import { expect, test } from "@playwright/test";

test("should see connection info in app header", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("PostgreSQL 15.1: public: orders: SQL Query"),
  ).toBeVisible();
});
