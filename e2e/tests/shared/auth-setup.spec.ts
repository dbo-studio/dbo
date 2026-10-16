import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { AuthPage } from "../../pages/AuthPage";

/** The backend prints the one-time setup token in its log at startup. */
function readSetupToken(): string {
  const logDir = path.join(process.env.E2E_DATA_DIR!, "logs");
  const text = fs
    .readdirSync(logDir)
    .map((file) => fs.readFileSync(path.join(logDir, file), "utf8"))
    .join("\n");
  const match = text.match(/setup token ([0-9a-f]{32})/);
  if (!match) throw new Error(`No setup token in ${logDir}`);
  return match[1];
}

/**
 * First-run setup: login is on (APP_AUTH_MODE=local) and no account exists, so
 * the admin is created from the browser with the token printed in the server log.
 * Run: npm run test:auth-setup
 */
test.describe("Auth first-run setup", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "setup",
      "Set E2E_LOCAL_AUTH=setup to run the first-run setup stack",
    );
  });

  test("first visitor creates the admin, setup then closes", async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const email = "owner@example.com";
    const password = "OwnerPass1!";
    const auth = new AuthPage(page);
    const token = readSetupToken();

    await test.step("status asks for setup and data APIs stay closed", async () => {
      const status = await request.get(`${apiUrl}/auth/status`);
      const body = (await status.json()) as {
        data: { mode: string; setupRequired: boolean; authenticated: boolean };
      };
      expect(body.data).toMatchObject({
        mode: "local",
        setupRequired: true,
        authenticated: false,
      });
      expect((await request.get(`${apiUrl}/connections`)).status()).toBe(401);
    });

    await test.step("mismatched passwords are rejected", async () => {
      const res = await request.post(`${apiUrl}/auth/setup`, {
        data: { token, email, password, confirm: "Different1!" },
      });
      expect(res.status()).toBe(422);
    });

    await test.step("a wrong setup token is refused", async () => {
      const res = await request.post(`${apiUrl}/auth/setup`, {
        data: { token: "0".repeat(32), email, password, confirm: password },
      });
      expect(res.status()).toBe(403);
    });

    await test.step("the log link fills the token; setup creates the admin", async () => {
      await page.goto(`/?setup=${token}`);
      await expect(page.getByTestId("auth-setup-submit")).toBeVisible({
        timeout: 30000,
      });
      await expect(page.getByTestId("auth-setup-token")).toHaveValue(token);
      await page.getByTestId("auth-setup-email").fill(email);
      await page.getByTestId("auth-setup-password").fill(password);
      await page.getByTestId("auth-setup-confirm").fill(password);
      await page.getByTestId("auth-setup-submit").click();
      await expect(page.getByTestId("add-connection")).toBeVisible({
        timeout: 30000,
      });

      const status = await page.request.get("/api/auth/status");
      const body = (await status.json()) as {
        data: {
          setupRequired: boolean;
          user?: { email: string; role: string };
        };
      };
      expect(body.data.setupRequired).toBe(false);
      expect(body.data.user).toMatchObject({ email, role: "admin" });
    });

    await test.step("setup cannot run twice", async () => {
      const res = await request.post(`${apiUrl}/auth/setup`, {
        data: {
          token,
          email: "intruder@example.com",
          password,
          confirm: password,
        },
      });
      expect(res.status()).toBe(403);
    });

    await test.step("a new browser gets the login screen, not setup", async () => {
      await page.context().clearCookies();
      await page.goto("/");
      await auth.expectLoginVisible();
      await expect(page.getByTestId("auth-setup-submit")).toHaveCount(0);
      await auth.login(email, password);
      await expect(page.getByTestId("add-connection")).toBeVisible({
        timeout: 30000,
      });
    });
  });
});
