import { expect, test } from "@playwright/test";
import { AuthPage } from "../../pages/AuthPage";
import { SettingsPage } from "../../pages/SettingsPage";

/**
 * Local auth M1 acceptance. Requires E2E_LOCAL_AUTH=1 so start-stack bootstraps an admin.
 * Run: E2E_LOCAL_AUTH=1 npm test -- tests/shared/auth-local.spec.ts
 * CI: npm run test:auth
 */
test.describe("Auth Gateway local (M1)", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "1",
      "Set E2E_LOCAL_AUTH=1 to run local auth stack",
    );
  });

  test("bootstrap login, forced password change, member, logout", async ({
    page,
    request,
  }) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
    const bootstrapPassword =
      process.env.E2E_ADMIN_PASSWORD ?? "bootstrap1";
    const adminPassword = "AdminPass1!";
    const memberEmail = `member_${Date.now()}@example.com`;
    const memberTemp = "TempPass1!";
    const memberPassword = "MemberPass1!";
    const auth = new AuthPage(page);
    const settings = new SettingsPage(page);

    await test.step("unauthenticated connections returns 401", async () => {
      const res = await request.get(`${apiUrl}/connections`);
      expect(res.status()).toBe(401);
    });

    await test.step("MCP management rejects forged Bearer without session", async () => {
      const res = await request.post(`${apiUrl}/mcp/update`, {
        headers: { Authorization: "Bearer junk" },
        data: { enabled: true },
      });
      expect(res.status()).toBe(401);
    });

    await test.step("cold start shows login", async () => {
      await page.goto("/");
      await auth.expectLoginVisible();
      await expect(page.getByTestId("add-connection")).toHaveCount(0);
    });

    await test.step("first login forces password change", async () => {
      await auth.login(adminEmail, bootstrapPassword);
      await auth.expectChangePasswordVisible();

      const cookies = await page.context().cookies();
      const sid = cookies.find((c) => c.name === "dbo_session");
      expect(sid?.value).toBeTruthy();

      const blocked = await request.get(`${apiUrl}/connections`, {
        headers: { Cookie: `dbo_session=${sid!.value}` },
      });
      expect(blocked.status()).toBe(403);

      await auth.changePassword(bootstrapPassword, adminPassword);
      await auth.expectAppReady();
    });

    await test.step("authenticated connections list works", async () => {
      const cookies = await page.context().cookies();
      const sid = cookies.find((c) => c.name === "dbo_session");
      expect(sid?.value).toBeTruthy();

      const res = await request.get(`${apiUrl}/connections`, {
        headers: { Cookie: `dbo_session=${sid!.value}` },
      });
      expect(res.ok()).toBeTruthy();
    });

    let memberId = "";

    await test.step("admin creates a member", async () => {
      const cookies = await page.context().cookies();
      const sid = cookies.find((c) => c.name === "dbo_session")!.value;
      const createRes = await request.post(`${apiUrl}/admin/users`, {
        headers: { Cookie: `dbo_session=${sid}` },
        data: {
          email: memberEmail,
          password: memberTemp,
          role: "member",
        },
      });
      expect(createRes.ok()).toBeTruthy();
      const body = await createRes.json();
      expect(body.data.id).toBeTruthy();
      memberId = body.data.id;
    });

    await test.step("logout invalidates session", async () => {
      await settings.open();
      await settings.navigateTo("General");
      await page.getByRole("button", { name: "Log out" }).click();
      await auth.expectLoginVisible();
    });

    let memberSid = "";

    await test.step("member can log in and change password", async () => {
      await auth.login(memberEmail, memberTemp);
      await auth.expectChangePasswordVisible();
      await auth.changePassword(memberTemp, memberPassword);
      await auth.expectAppReady();

      const cookies = await page.context().cookies();
      memberSid = cookies.find((c) => c.name === "dbo_session")!.value;

      const adminRes = await request.get(`${apiUrl}/admin/users`, {
        headers: { Cookie: `dbo_session=${memberSid}` },
      });
      expect(adminRes.status()).toBe(403);
    });

    await test.step("disable member revokes their session", async () => {
      const adminLogin = await request.post(`${apiUrl}/auth/login`, {
        data: { email: adminEmail, password: adminPassword },
      });
      expect(adminLogin.ok()).toBeTruthy();

      const disableRes = await request.patch(
        `${apiUrl}/admin/users/${memberId}`,
        { data: { disabled: true } },
      );
      expect(disableRes.ok()).toBeTruthy();

      const revoked = await request.get(`${apiUrl}/connections`, {
        headers: { Cookie: `dbo_session=${memberSid}` },
      });
      expect(revoked.status()).toBe(401);
    });
  });
});
