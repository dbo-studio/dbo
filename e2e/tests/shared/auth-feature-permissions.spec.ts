import { expect, request as pwRequest, test } from "@playwright/test";
import fs from "node:fs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { AuthPage } from "../../pages/AuthPage";

/**
 * Per-user feature permissions (data.cli, data.import, data.export, ai.use, backup.*, boards.*). Requires E2E_LOCAL_AUTH=1 (npm run test:auth).
 * The flags are enforced by the API; the UI only hides what would be refused.
 */
test.describe("Feature permissions", () => {
  test.beforeEach(() => {
    test.skip(process.env.E2E_LOCAL_AUTH !== "1", "Set E2E_LOCAL_AUTH=1 to run local auth stack");
  });

  test("members start without the terminal; an admin grants and revokes flags", async ({ page }, testInfo) => {
    const api = process.env.PLAYWRIGHT_API_URL ?? "";
    const headers = { "X-Client-Mode": "web" };
    const memberEmail = `perm_${uniqueTestSuffix(testInfo)}@example.com`;
    const temp = "TempPass1!";
    const final = "FinalPass1!";

    await new AuthPage(page).loginAdmin();

    const created = await page.request.post(`${api}/admin/users`, {
      data: { email: memberEmail, password: temp, role: "member" },
      headers,
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const member = (await created.json()).data as { id: string; permissions: Record<string, boolean> };

    await test.step("defaults: terminal off; import, export and AI stay on", async () => {
      expect(member.permissions).toMatchObject({ "data.cli": false, "data.import": true, "data.export": true, "ai.use": true });
    });

    const memberApi = await pwRequest.newContext({ extraHTTPHeaders: headers });
    try {
      const login = await memberApi.post(`${api}/auth/login`, { data: { email: memberEmail, password: temp } });
      expect(login.ok(), await login.text()).toBeTruthy();
      const changed = await memberApi.post(`${api}/auth/password`, {
        data: { currentPassword: temp, password: final, confirm: final },
      });
      expect(changed.ok(), await changed.text()).toBeTruthy();

      const run = () => memberApi.post(`${api}/cli/run`, { data: { connectionId: 1, input: "SELECT 1" } });
      const status = async () =>
        ((await (await memberApi.get(`${api}/auth/status`)).json()) as { data: { permissions: Record<string, boolean> } })
          .data.permissions;

      await test.step("the terminal API refuses a member without the cli flag", async () => {
        expect((await run()).status()).toBe(403);
        expect(await status()).toMatchObject({ "data.cli": false });
      });

      await test.step("the admin grants cli; the same call is no longer a permission error", async () => {
        const grant = await page.request.patch(`${api}/admin/users/${member.id}`, {
          data: { permissions: { ...member.permissions, "data.cli": true } },
          headers,
        });
        expect(grant.ok(), await grant.text()).toBeTruthy();
        expect(await status()).toMatchObject({ "data.cli": true });
        // The connection does not exist, so this is a 404 — not 403.
        expect((await run()).status()).not.toBe(403);
      });

      await test.step("revoking export and aiUse is reflected and refused by the API", async () => {
        const revoke = await page.request.patch(`${api}/admin/users/${member.id}`, {
          data: { permissions: { ...member.permissions, "data.cli": true, "data.export": false, "ai.use": false } },
          headers,
        });
        expect(revoke.ok(), await revoke.text()).toBeTruthy();
        expect(await status()).toMatchObject({ "data.export": false, "ai.use": false, "data.import": true });

        const complete = await memberApi.post(`${api}/ai/complete`, {
          data: { connectionId: 1, prompt: "select" },
        });
        // Validation may run first, but a member without aiUse must never get a 2xx.
        expect(complete.ok()).toBeFalsy();
      });

      await test.step("revoking cli takes effect on the next request", async () => {
        const off = await page.request.patch(`${api}/admin/users/${member.id}`, {
          data: { permissions: { ...member.permissions, "data.cli": false } },
          headers,
        });
        expect(off.ok()).toBeTruthy();
        expect((await run()).status()).toBe(403);
      });
    } finally {
      await memberApi.dispose();
    }
  });

  test("backup and boards are off for new members until an admin grants them", async ({ page }, testInfo) => {
    const api = process.env.PLAYWRIGHT_API_URL ?? "";
    const headers = { "X-Client-Mode": "web" };
    const memberEmail = `permbb_${uniqueTestSuffix(testInfo)}@example.com`;
    const temp = "TempPass1!";
    const final = "FinalPass1!";

    await new AuthPage(page).loginAdmin();

    const created = await page.request.post(`${api}/admin/users`, {
      data: { email: memberEmail, password: temp, role: "member" },
      headers,
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const member = (await created.json()).data as { id: string; permissions: Record<string, boolean> };

    await test.step("the catalog groups every permission and the member starts without the new ones", async () => {
      const catalog = (await (await page.request.get(`${api}/admin/permissions`, { headers })).json()).data as {
        key: string;
        group: string;
      }[];
      expect(new Set(catalog.map((p) => p.group))).toEqual(new Set(["connections", "data", "ai", "backup", "boards"]));
      expect(Object.keys(member.permissions).sort()).toEqual(catalog.map((p) => p.key).sort());
      for (const key of [
        "backup.create",
        "backup.restore",
        "backup.tools",
        "boards.reports",
        "boards.dashboards",
        "boards.share",
      ]) {
        expect(member.permissions[key], key).toBe(false);
      }
    });

    const memberApi = await pwRequest.newContext({ extraHTTPHeaders: headers });
    try {
      expect((await memberApi.post(`${api}/auth/login`, { data: { email: memberEmail, password: temp } })).ok()).toBeTruthy();
      expect(
        (
          await memberApi.post(`${api}/auth/password`, {
            data: { currentPassword: temp, password: final, confirm: final },
          })
        ).ok(),
      ).toBeTruthy();

      const grant = async (permissions: Record<string, boolean>) => {
        const res = await page.request.patch(`${api}/admin/users/${member.id}`, {
          data: { permissions: { ...member.permissions, ...permissions } },
          headers,
        });
        expect(res.ok(), await res.text()).toBeTruthy();
      };

      await test.step("every guarded endpoint answers 403 to a member without the permission", async () => {
        expect((await memberApi.get(`${api}/backups/tools`)).status()).toBe(403);
        expect((await memberApi.get(`${api}/backups/tools/downloads`)).status()).toBe(403);
        expect((await memberApi.get(`${api}/backups/history?connectionId=1`)).status()).toBe(403);
        expect((await memberApi.get(`${api}/backup-schedules`)).status()).toBe(403);
        expect((await memberApi.get(`${api}/dashboards?connectionId=1`)).status()).toBe(403);
        expect((await memberApi.get(`${api}/questions?connectionId=1`)).status()).toBe(403);
      });

      await test.step("each permission opens only its own area", async () => {
        await grant({ "backup.tools": true });
        expect((await memberApi.get(`${api}/backups/tools`)).status()).toBe(200);
        expect((await memberApi.get(`${api}/backups/history?connectionId=1`)).status()).toBe(403);

        await grant({ "boards.dashboards": true });
        expect((await memberApi.get(`${api}/dashboards?connectionId=1`)).status()).not.toBe(403);
        expect((await memberApi.get(`${api}/questions?connectionId=1`)).status()).toBe(403);
      });
    } finally {
      await memberApi.dispose();
    }
  });

  test("the UI hides the terminal tab until cli is granted", async ({ page, browser }, testInfo) => {
    const api = process.env.PLAYWRIGHT_API_URL ?? "";
    const headers = { "X-Client-Mode": "web" };
    const suffix = uniqueTestSuffix(testInfo);
    const memberEmail = `permui_${suffix}@example.com`;
    const temp = "TempPass1!";
    const final = "FinalPass1!";
    const connectionName = `perm-ui-${suffix}`.slice(0, 40);
    const file = `/tmp/dbo-e2e-perm-${suffix}.db`;
    fs.writeFileSync(file, "");

    await new AuthPage(page).loginAdmin();

    const conn = await page.request.post(`${api}/connections`, {
      data: { name: connectionName, type: "sqlite", options: { path: file } },
      headers,
    });
    expect(conn.ok(), await conn.text()).toBeTruthy();
    const listed = await page.request.get(`${api}/connections`, { headers });
    const connectionId = ((await listed.json()) as { data: { id: number; name: string }[] }).data.find(
      (c) => c.name === connectionName,
    )!.id;

    const created = await page.request.post(`${api}/admin/users`, {
      data: { email: memberEmail, password: temp, role: "member" },
      headers,
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const member = (await created.json()).data as { id: string; permissions: Record<string, boolean> };
    const share = await page.request.post(`${api}/connections/${connectionId}/shares`, {
      data: { userId: member.id, role: "viewer", passwordShared: false },
      headers,
    });
    expect(share.ok(), await share.text()).toBeTruthy();

    const context = await browser.newContext();
    const memberPage = await context.newPage();
    try {
      const auth = new AuthPage(memberPage);
      await memberPage.goto("/");
      await auth.login(memberEmail, temp);
      await auth.expectChangePasswordVisible();
      await auth.changePasswordForced(final);
      await auth.expectAppReady();

      await memberPage.getByTestId("connection-switcher").click();
      await memberPage.getByTestId(`connection-item-${connectionName}`).click();
      await expect(memberPage.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });

      await test.step("without cli the panel has History only", async () => {
        await memberPage.getByTestId("status-history").click();
        await expect(memberPage.getByTestId("bottom-panel")).toBeVisible();
        await expect(memberPage.getByTestId("bottom-tab-history")).toBeVisible();
        await expect(memberPage.getByTestId("bottom-tab-terminal")).toHaveCount(0);
        await expect(memberPage.getByTestId("db-terminal")).toHaveCount(0);
      });

      await test.step("after the admin grants cli, the terminal tab appears", async () => {
        const grant = await page.request.patch(`${api}/admin/users/${member.id}`, {
          data: { permissions: { ...member.permissions, "data.cli": true } },
          headers,
        });
        expect(grant.ok(), await grant.text()).toBeTruthy();
        await memberPage.reload();
        await expect(memberPage.getByRole("treeitem").first()).toBeVisible({ timeout: 30000 });
        // The open panel is remembered across the reload; only open it when it is not.
        if (!(await memberPage.getByTestId("bottom-panel").isVisible().catch(() => false))) {
          await memberPage.getByTestId("status-history").click();
        }
        await expect(memberPage.getByTestId("bottom-tab-terminal")).toBeVisible();
      });
    } finally {
      await context.close();
    }
  });
});
