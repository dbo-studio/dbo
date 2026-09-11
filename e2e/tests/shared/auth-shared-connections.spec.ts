import net from "node:net";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { AuthPage } from "../../pages/AuthPage";
import { ConnectionPage } from "../../pages/ConnectionPage";
import { SettingsPage } from "../../pages/SettingsPage";

type ConnectionListItem = {
  id: number;
  name: string;
  access?: string;
  shared?: boolean;
  passwordShared?: boolean;
  options?: { password?: string } & Record<string, unknown>;
};

async function canReachHost(
  host: string,
  port: number,
  timeoutMs = 1500,
): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

async function sessionCookie(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const sid = cookies.find((c) => c.name === "dbo_session");
  expect(sid?.value).toBeTruthy();
  return sid!.value;
}

async function listConnections(
  request: APIRequestContext,
  apiUrl: string,
  sid: string,
): Promise<ConnectionListItem[]> {
  const res = await request.get(`${apiUrl}/connections`, {
    headers: { Cookie: `dbo_session=${sid}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data: ConnectionListItem[] };
  return body.data ?? [];
}

async function loginAdmin(page: Page, adminPassword: string): Promise<void> {
  const auth = new AuthPage(page);
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
  const bootstrapPassword = process.env.E2E_ADMIN_PASSWORD ?? "bootstrap1";

  await page.goto("/");
  if (
    await page
      .getByTestId("add-connection")
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  await auth.expectLoginVisible();
  await auth.login(adminEmail, bootstrapPassword);

  const changeSubmit = page.getByTestId("auth-change-password-submit");
  const appReady = page.getByTestId("add-connection");
  try {
    await expect(changeSubmit.or(appReady)).toBeVisible({ timeout: 15000 });
  } catch {
    await auth.login(adminEmail, adminPassword);
    await auth.expectAppReady();
    return;
  }

  if (await changeSubmit.isVisible().catch(() => false)) {
    await auth.changePasswordForced(adminPassword);
  }

  await auth.expectAppReady();
}

/**
 * Shared connections S1+S2. Requires E2E_LOCAL_AUTH=1.
 * Run: npm run test:auth
 */
test.describe("Shared connections (local auth)", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "1",
      "Set E2E_LOCAL_AUTH=1 to run local auth stack",
    );
  });

  test("viewer sees catalog, cannot PATCH, revoke blocks access", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const adminPassword = "AdminPass1!";
    const memberEmail = `share_member_${uniqueTestSuffix(testInfo)}@example.com`;
    const memberTemp = "TempPass1!";
    const memberPassword = "MemberPass1!";
    const connectionName = `share-sql-${uniqueTestSuffix(testInfo)}`.slice(
      0,
      50,
    );
    const sqlitePath = `/tmp/dbo-e2e-share-${uniqueTestSuffix(testInfo)}.db`;
    ensureSqliteDbFile(sqlitePath);

    const connections = new ConnectionPage(page);

    try {
      await test.step("admin login and create sqlite connection", async () => {
        await loginAdmin(page, adminPassword);
        await connections.goto();
        await connections.waitForReady();
        await connections.createConnection(
          getDbConfig("sqlite", connectionName, sqlitePath),
        );
      });

      const adminSid = await sessionCookie(page);
      let memberId = "";
      let connectionId = 0;

      await test.step("admin creates member and shares as viewer", async () => {
        const createRes = await request.post(`${apiUrl}/admin/users`, {
          headers: { Cookie: `dbo_session=${adminSid}` },
          data: { email: memberEmail, password: memberTemp, role: "member" },
        });
        expect(createRes.ok()).toBeTruthy();
        memberId = ((await createRes.json()) as { data: { id: string } }).data
          .id;

        const listed = await listConnections(request, apiUrl, adminSid);
        const created = listed.find((c) => c.name === connectionName);
        expect(created!.id).toBeTruthy();
        connectionId = created!.id;
        expect(created!.options?.password ?? "").toBe("");
        expect(JSON.stringify(created!.options ?? {})).not.toContain(
          "ciphertext",
        );

        const shareRes = await request.post(
          `${apiUrl}/connections/${connectionId}/shares`,
          {
            headers: { Cookie: `dbo_session=${adminSid}` },
            data: { userId: memberId, role: "viewer", passwordShared: false },
          },
        );
        expect(shareRes.ok()).toBeTruthy();
        const shareBody = (await shareRes.json()) as {
          data: { passwordShared: boolean; members: { userId: string }[] };
        };
        expect(shareBody.data.passwordShared).toBe(false);
        expect(shareBody.data.members.some((m) => m.userId === memberId)).toBe(
          true,
        );

        const settings = new SettingsPage(page);
        await settings.open();
        await settings.navigateTo("Administration");
        await settings.expectAdminSharesTable();
        await expect(
          settings.adminShareRow(connectionName, memberEmail),
        ).toBeVisible();
        await settings.close();
      });

      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberAuth = new AuthPage(memberPage);

      try {
        await test.step("member sees shared card and cannot PATCH metadata", async () => {
          await memberPage.goto("/");
          await memberAuth.login(memberEmail, memberTemp);
          await memberAuth.expectChangePasswordVisible();
          await memberAuth.changePasswordForced(memberPassword);
          await memberAuth.expectAppReady();

          await expect(
            memberPage.getByTestId("connections-group-shared"),
          ).toBeVisible();
          await expect(
            memberPage.getByTestId(`connection-item-${connectionName}`),
          ).toBeVisible();

          const memberSettings = new SettingsPage(memberPage);
          await memberSettings.open();
          await memberSettings.expectMemberSettingsScope();
          await memberSettings.close();

          const memberSid = await sessionCookie(memberPage);
          const memberList = await listConnections(request, apiUrl, memberSid);
          const shared = memberList.find((c) => c.id === connectionId);
          expect(shared?.shared).toBe(true);
          expect(shared?.access).toBe("viewer");
          expect(String(shared?.options?.password ?? "")).toBe("");

          const patchRes = await request.patch(
            `${apiUrl}/connections/${connectionId}`,
            {
              headers: { Cookie: `dbo_session=${memberSid}` },
              data: { name: "hacked" },
            },
          );
          expect(patchRes.status()).toBe(403);

          const shareRes = await request.get(
            `${apiUrl}/connections/${connectionId}/shares`,
            { headers: { Cookie: `dbo_session=${memberSid}` } },
          );
          expect(shareRes.status()).toBe(403);
        });

        await test.step("member can open the shared sqlite connection", async () => {
          const memberConnections = new ConnectionPage(memberPage);
          await memberConnections.activateConnection(connectionName, "");
          await memberConnections.expectConnectionActive(connectionName);
        });

        await test.step("revoke removes access", async () => {
          const revokeRes = await request.delete(
            `${apiUrl}/connections/${connectionId}/shares/${memberId}`,
            { headers: { Cookie: `dbo_session=${adminSid}` } },
          );
          expect(revokeRes.ok()).toBeTruthy();

          const memberSid = await sessionCookie(memberPage);
          await memberPage.reload();
          await expect(
            memberPage.getByTestId(`connection-item-${connectionName}`),
          ).toHaveCount(0);

          const listed = await listConnections(request, apiUrl, memberSid);
          expect(listed.some((c) => c.id === connectionId)).toBe(false);

          const findRes = await request.patch(
            `${apiUrl}/connections/${connectionId}`,
            {
              headers: { Cookie: `dbo_session=${memberSid}` },
              data: { isActive: true },
            },
          );
          expect(findRes.status()).toBe(404);
        });
      } finally {
        await memberContext.close();
      }
    } finally {
      removeSqliteDbFile(sqlitePath);
    }
  });

  test("password share on uses vault; API never returns secret", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    const pgHost = process.env.PGSQL_TEST_HOST ?? "127.0.0.1";
    const pgPort = Number(process.env.PGSQL_TEST_PORT ?? "5432");
    test.skip(
      !(await canReachHost(pgHost, pgPort)),
      "Sample Postgres is not reachable for password-share coverage",
    );

    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const adminPassword = "AdminPass1!";
    const memberEmail = `vault_member_${uniqueTestSuffix(testInfo)}@example.com`;
    const memberTemp = "TempPass1!";
    const memberPassword = "MemberPass1!";
    const connectionName = `share-pg-${uniqueTestSuffix(testInfo)}`.slice(
      0,
      50,
    );
    const pg = getDbConfig("postgresql", connectionName);

    await test.step("admin login", async () => {
      await loginAdmin(page, adminPassword);
    });

    const adminSid = await sessionCookie(page);

    await test.step("create postgres connection with remembered password", async () => {
      const createRes = await request.post(`${apiUrl}/connections`, {
        headers: { Cookie: `dbo_session=${adminSid}` },
        data: {
          name: connectionName,
          type: "postgresql",
          rememberPassword: true,
          options: {
            host: pg.host,
            port: Number(pg.port),
            username: pg.username,
            password: pg.password,
            database: pg.database,
          },
        },
      });
      expect(createRes.ok()).toBeTruthy();
    });

    const listed = await listConnections(request, apiUrl, adminSid);
    const created = listed.find((c) => c.name === connectionName);
    expect(created?.id).toBeTruthy();
    const connectionId = created!.id;
    expect(JSON.stringify(created)).not.toMatch(/secret|ciphertext/i);

    const createUser = await request.post(`${apiUrl}/admin/users`, {
      headers: { Cookie: `dbo_session=${adminSid}` },
      data: { email: memberEmail, password: memberTemp, role: "member" },
    });
    expect(createUser.ok()).toBeTruthy();
    const memberId = ((await createUser.json()) as { data: { id: string } })
      .data.id;

    await test.step("share with password vault on", async () => {
      const shareRes = await request.post(
        `${apiUrl}/connections/${connectionId}/shares`,
        {
          headers: { Cookie: `dbo_session=${adminSid}` },
          data: { userId: memberId, role: "viewer", passwordShared: true },
        },
      );
      expect(shareRes.ok()).toBeTruthy();
      const body = (await shareRes.json()) as {
        data: { passwordShared: boolean };
      };
      expect(body.data.passwordShared).toBe(true);
      expect(JSON.stringify(body)).not.toMatch(/secret|ciphertext/i);
    });

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    const memberAuth = new AuthPage(memberPage);

    try {
      await test.step("member connects without password prompt", async () => {
        await memberPage.goto("/");
        await memberAuth.login(memberEmail, memberTemp);
        await memberAuth.expectChangePasswordVisible();
        await memberAuth.changePasswordForced(memberPassword);
        await memberAuth.expectAppReady();

        const memberConnections = new ConnectionPage(memberPage);
        await memberConnections.getConnectionItem(connectionName).click();
        await expect(
          memberPage.getByRole("heading", { name: "Password", exact: true }),
        ).toHaveCount(0);
        await memberConnections.waitForConnectionActive();
      });
    } finally {
      await memberContext.close();
    }
  });

  test("saved history chats and instance APIs stay per user", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const adminPassword = "AdminPass1!";
    const memberEmail = `iso_member_${uniqueTestSuffix(testInfo)}@example.com`;
    const memberTemp = "TempPass1!";
    const memberPassword = "MemberPass1!";
    const connectionName = `iso-sql-${uniqueTestSuffix(testInfo)}`.slice(0, 50);
    const sqlitePath = `/tmp/dbo-e2e-iso-${uniqueTestSuffix(testInfo)}.db`;
    ensureSqliteDbFile(sqlitePath);

    const connections = new ConnectionPage(page);

    try {
      await test.step("admin login, create sqlite, share with member", async () => {
        await loginAdmin(page, adminPassword);
        await connections.goto();
        await connections.waitForReady();
        await connections.createConnection(
          getDbConfig("sqlite", connectionName, sqlitePath),
        );
      });

      const adminSid = await sessionCookie(page);
      let connectionId = 0;
      let savedId = 0;
      let chatId = 0;

      await test.step("share catalog and create admin-owned artifacts", async () => {
        const createUser = await request.post(`${apiUrl}/admin/users`, {
          headers: { Cookie: `dbo_session=${adminSid}` },
          data: { email: memberEmail, password: memberTemp, role: "member" },
        });
        expect(createUser.ok()).toBeTruthy();
        const memberId = ((await createUser.json()) as { data: { id: string } })
          .data.id;

        const listed = await listConnections(request, apiUrl, adminSid);
        const created = listed.find((c) => c.name === connectionName);
        expect(created?.id).toBeTruthy();
        connectionId = created!.id;

        const shareRes = await request.post(
          `${apiUrl}/connections/${connectionId}/shares`,
          {
            headers: { Cookie: `dbo_session=${adminSid}` },
            data: { userId: memberId, role: "viewer", passwordShared: false },
          },
        );
        expect(shareRes.ok()).toBeTruthy();

        const savedRes = await request.post(`${apiUrl}/saved`, {
          headers: { Cookie: `dbo_session=${adminSid}` },
          data: {
            connectionId,
            name: "admin-only-query",
            query: "SELECT 1",
          },
        });
        expect(savedRes.ok()).toBeTruthy();
        savedId = ((await savedRes.json()) as { data: { id: number } }).data.id;

        const chatRes = await request.post(`${apiUrl}/ai/chats`, {
          headers: { Cookie: `dbo_session=${adminSid}` },
          data: { connectionId, title: "admin-chat" },
        });
        expect(chatRes.ok()).toBeTruthy();
        chatId = ((await chatRes.json()) as { data: { id: number } }).data.id;
      });

      const memberContext = await browser.newContext();
      const memberPage = await memberContext.newPage();
      const memberAuth = new AuthPage(memberPage);

      try {
        await test.step("member cannot see or mutate admin artifacts", async () => {
          await memberPage.goto("/");
          await memberAuth.login(memberEmail, memberTemp);
          await memberAuth.expectChangePasswordVisible();
          await memberAuth.changePasswordForced(memberPassword);
          await memberAuth.expectAppReady();

          const memberSid = await sessionCookie(memberPage);
          const headers = { Cookie: `dbo_session=${memberSid}` };

          const savedList = await request.get(
            `${apiUrl}/saved?connectionId=${connectionId}`,
            { headers },
          );
          expect(savedList.ok()).toBeTruthy();
          const savedItems = (
            (await savedList.json()) as { data: { id: number }[] }
          ).data;
          expect(savedItems.some((item) => item.id === savedId)).toBe(false);

          const historyList = await request.get(
            `${apiUrl}/histories?connectionId=${connectionId}&page=1&count=10`,
            { headers },
          );
          expect(historyList.ok()).toBeTruthy();

          const chatList = await request.get(
            `${apiUrl}/ai/chats?connectionId=${connectionId}&page=1&count=10`,
            { headers },
          );
          expect(chatList.ok()).toBeTruthy();
          const chats = ((await chatList.json()) as { data: { id: number }[] })
            .data;
          expect(chats.some((chat) => chat.id === chatId)).toBe(false);

          const ownSaved = await request.post(`${apiUrl}/saved`, {
            headers,
            data: {
              connectionId,
              name: "member-query",
              query: "SELECT 2",
            },
          });
          expect(ownSaved.ok()).toBeTruthy();

          const patchSaved = await request.patch(`${apiUrl}/saved/${savedId}`, {
            headers,
            data: { query: "SELECT 9" },
          });
          expect(patchSaved.status()).toBe(404);

          const chatDetail = await request.get(`${apiUrl}/ai/chats/${chatId}`, {
            headers,
          });
          expect(chatDetail.status()).toBe(404);
        });

        await test.step("member AI settings are scoped; instance admin APIs blocked", async () => {
          const memberSid = await sessionCookie(memberPage);
          const memberHeaders = { Cookie: `dbo_session=${memberSid}` };
          const adminHeaders = { Cookie: `dbo_session=${adminSid}` };

          const adminProvidersRes = await request.get(`${apiUrl}/ai/providers`, {
            headers: adminHeaders,
          });
          expect(adminProvidersRes.ok()).toBeTruthy();
          const adminBefore = (
            (await adminProvidersRes.json()) as {
              data: { id: number; timeout: number }[];
            }
          ).data[0];
          expect(adminBefore?.id).toBeTruthy();

          const memberProvidersRes = await request.get(`${apiUrl}/ai/providers`, {
            headers: memberHeaders,
          });
          expect(memberProvidersRes.ok()).toBeTruthy();
          const memberProvider = (
            (await memberProvidersRes.json()) as {
              data: { id: number }[];
            }
          ).data[0];
          expect(memberProvider?.id).toBeTruthy();
          expect(memberProvider.id).not.toBe(adminBefore.id);

          const patchProvider = await request.patch(
            `${apiUrl}/ai/providers/${memberProvider.id}`,
            { headers: memberHeaders, data: { timeout: 42 } },
          );
          expect(patchProvider.ok()).toBeTruthy();

          const adminAfterRes = await request.get(`${apiUrl}/ai/providers`, {
            headers: adminHeaders,
          });
          const adminAfter = (
            (await adminAfterRes.json()) as {
              data: { id: number; timeout: number }[];
            }
          ).data.find((item) => item.id === adminBefore.id);
          expect(adminAfter?.timeout).toBe(adminBefore.timeout);

          const logsRes = await request.get(`${apiUrl}/config/logs`, {
            headers: memberHeaders,
          });
          expect(logsRes.status()).toBe(403);

          const resetRes = await request.post(`${apiUrl}/config/reset`, {
            headers: memberHeaders,
          });
          expect(resetRes.status()).toBe(403);
        });
      } finally {
        await memberContext.close();
      }
    } finally {
      removeSqliteDbFile(sqlitePath);
    }
  });

  test("theme persist does not follow the next user on the same browser", async ({
    page,
    request,
  }, testInfo) => {
    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const adminPassword = "AdminPass1!";
    const memberEmail = `theme_member_${uniqueTestSuffix(testInfo)}@example.com`;
    const memberTemp = "TempPass1!";
    const memberPassword = "MemberPass1!";
    const settings = new SettingsPage(page);
    const auth = new AuthPage(page);

    await test.step("admin sets dark theme", async () => {
      await loginAdmin(page, adminPassword);
      await settings.open();
      await settings.navigateTo("Appearance");
      await settings.selectDarkTheme();
    });

    const adminSid = await sessionCookie(page);

    await test.step("create member then log admin out", async () => {
      const createUser = await request.post(`${apiUrl}/admin/users`, {
        headers: { Cookie: `dbo_session=${adminSid}` },
        data: { email: memberEmail, password: memberTemp, role: "member" },
      });
      expect(createUser.ok()).toBeTruthy();
      await settings.logout();
    });

    await test.step("member login does not inherit admin dark theme", async () => {
      await auth.login(memberEmail, memberTemp);
      await auth.expectChangePasswordVisible();
      await auth.changePasswordForced(memberPassword);
      await auth.expectAppReady();

      const memberSid = await sessionCookie(page);
      const statusRes = await request.get(`${apiUrl}/auth/status`, {
        headers: { Cookie: `dbo_session=${memberSid}` },
      });
      expect(statusRes.ok()).toBeTruthy();
      const memberId = (
        (await statusRes.json()) as { data: { user?: { id: string } } }
      ).data.user?.id;
      expect(memberId).toBeTruthy();

      const scoped = await page.evaluate((id: string) => {
        return localStorage.getItem(`dbo:${id}:settings`);
      }, memberId!);
      expect(scoped ?? "").not.toContain('"isDark":true');
    });
  });
});
