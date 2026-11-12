import { expect, test, type Page } from "@playwright/test";

// A fresh install: no account and no finished tour.
test.use({ storageState: { cookies: [], origins: [] } });

async function openAccountStep(page: Page) {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.goto("/");
  await expect(page.getByTestId("onboarding")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("account-step")).toBeVisible();
}

async function mockConnectStart(page: Page) {
  await page.route("**/v1/account/connect/start", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          code: "ABCD2345",
          url: "https://example.com/connect?code=ABCD2345",
        },
      }),
    }),
  );
}

const session = {
  data: {
    pending: false,
    session: {
      token: "t",
      user: { name: "dev", email: "dev@example.com", verified: true },
    },
  },
};

test("first run lets the user skip the account", async ({ page }) => {
  await openAccountStep(page);

  await page.getByTestId("onboarding-finish").click();
  await expect(page.getByTestId("onboarding")).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("onboarding")).toBeHidden();
});

test("connecting finishes by polling while the browser sign-in completes", async ({
  page,
}) => {
  await mockConnectStart(page);
  await page.route("**/v1/account/connect/poll", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    }),
  );

  await openAccountStep(page);
  await page.getByTestId("account-connect").click();
  await expect(page.getByTestId("account-connect-wait")).toBeVisible();
  await expect(page.getByTestId("onboarding")).toBeHidden({ timeout: 10_000 });
});

test("the code from the browser page connects when polling does not", async ({
  page,
}) => {
  await mockConnectStart(page);
  let polls = 0;
  await page.route("**/v1/account/connect/poll", (route) => {
    polls += 1;
    const typed = route.request().postDataJSON().code === "WXYZ6789";
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(typed ? session : { data: { pending: true } }),
    });
  });

  await openAccountStep(page);
  await page.getByTestId("account-connect").click();
  await page.getByTestId("account-connect-code").fill("WXYZ6789");
  await page.getByTestId("account-connect-submit").click();
  await expect(page.getByTestId("onboarding")).toBeHidden();
  expect(polls).toBeGreaterThan(0);
});

test("the privacy step turns analytics off for good", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 2; i++) {
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("onboarding-analytics-state")).toContainText(
    "On",
  );

  await page.getByTestId("onboarding-analytics").click();
  await expect(page.getByTestId("onboarding-analytics-state")).toContainText(
    "Off",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("umami.disabled")),
  ).toBe("1");
});

test("the theme step switches the look right away", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 1; i++) {
    await page.getByTestId("onboarding-next").click();
  }
  const root = page.getByTestId("onboarding");
  const before = await root.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );

  await page.getByTestId("onboarding-mode-dark").click();
  await expect
    .poll(() => root.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(before);
});

test("help commands stay reachable after the tour is skipped", async ({ page }) => {
  await openAccountStep(page);
  await page.getByTestId("onboarding-finish").click();
  await expect(page.getByTestId("onboarding")).toBeHidden();

  await page.keyboard.press("Alt+K");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await expect(palette.getByRole("option", { name: "Documentation" })).toBeVisible();
  await expect(palette.getByRole("option", { name: "Keyboard shortcuts" })).toBeVisible();

  await palette.getByRole("option", { name: "Show welcome" }).click();
  await expect(page.getByTestId("onboarding")).toBeVisible();
});
