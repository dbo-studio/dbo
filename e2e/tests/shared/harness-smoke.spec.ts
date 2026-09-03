import { expect, test } from "@playwright/test";

/**
 * Proves the ephemeral stack is up without touching sample PG/MySQL.
 */
test.describe("E2E harness", () => {
  test("ephemeral API and frontend are reachable", async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL;
    expect(apiUrl, "PLAYWRIGHT_API_URL must be set by run-e2e").toBeTruthy();

    const configRes = await request.get(`${apiUrl}/config`);
    expect(configRes.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByTestId("add-connection")).toBeVisible({
      timeout: 30000,
    });
  });
});
