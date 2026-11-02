import net from "node:net";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  getBastionOnlyPostgresConfig,
  getSshBastionConfig,
} from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { AuthPage } from "../../pages/AuthPage";

type SshView = Record<string, unknown> | undefined;
type ConnectionListItem = {
  id: number;
  name: string;
  access?: string;
  options?: { ssh?: SshView };
};

async function canReach(host: string, port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1500);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

async function sessionCookie(page: Page): Promise<string> {
  const sid = (await page.context().cookies()).find(
    (c) => c.name === "dbo_session",
  );
  expect(sid?.value).toBeTruthy();
  return sid!.value;
}

async function list(
  request: APIRequestContext,
  apiUrl: string,
  sid: string,
): Promise<ConnectionListItem[]> {
  const res = await request.get(`${apiUrl}/connections`, {
    headers: { Cookie: `dbo_session=${sid}` },
  });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { data: ConnectionListItem[] }).data ?? [];
}

/**
 * SSH tunnel details on shared connections. Requires E2E_LOCAL_AUTH=1 and the
 * sample bastion. Run: npm run test:auth
 */
test.describe("Shared connections with SSH tunnel (local auth)", () => {
  test.beforeEach(() => {
    test.skip(
      process.env.E2E_LOCAL_AUTH !== "1",
      "Set E2E_LOCAL_AUTH=1 to run local auth stack",
    );
  });

  test("owner sees tunnel target, viewer only sees it is enabled", async ({
    page,
    request,
    browser,
  }, testInfo) => {
    const bastion = getSshBastionConfig();
    test.skip(
      !(await canReach(bastion.host, Number(bastion.port))),
      `SSH sample not reachable at ${bastion.host}:${bastion.port}.`,
    );

    const apiUrl = process.env.PLAYWRIGHT_API_URL!;
    const suffix = uniqueTestSuffix(testInfo);
    const name = `share-ssh-${suffix}`.slice(0, 50);
    const memberEmail = `share_ssh_${suffix}@example.com`;
    const memberTemp = "TempPass1!";
    const memberPassword = "MemberPass1!";
    const config = getBastionOnlyPostgresConfig(name);

    await new AuthPage(page).loginAdmin("AdminPass1!");
    await page.goto("/");
    const adminSid = await sessionCookie(page);

    const createRes = await request.post(`${apiUrl}/connections`, {
      headers: { Cookie: `dbo_session=${adminSid}` },
      data: {
        name,
        type: "postgresql",
        rememberPassword: true,
        options: {
          host: config.host,
          port: Number(config.port),
          username: config.username,
          password: config.password,
          database: config.database,
          ssh: {
            enabled: true,
            host: bastion.host,
            port: Number(bastion.port),
            username: bastion.username,
            authMethod: "password",
            password: bastion.password,
          },
        },
      },
    });
    expect(createRes.ok()).toBeTruthy();

    const owned = (await list(request, apiUrl, adminSid)).find(
      (c) => c.name === name,
    )!;

    await test.step("owner sees host, username and stored flag, never the secret", async () => {
      const ssh = owned.options?.ssh as Record<string, unknown>;
      expect(ssh.host).toBe(bastion.host);
      expect(ssh.username).toBe(bastion.username);
      expect(ssh.passwordSet).toBe(true);
      expect(ssh.password).toBe("");
      expect(JSON.stringify(owned)).not.toContain(bastion.password);
    });

    const userRes = await request.post(`${apiUrl}/admin/users`, {
      headers: { Cookie: `dbo_session=${adminSid}` },
      data: { email: memberEmail, password: memberTemp, role: "member" },
    });
    expect(userRes.ok()).toBeTruthy();
    const memberId = ((await userRes.json()) as { data: { id: string } }).data
      .id;

    const shareRes = await request.post(
      `${apiUrl}/connections/${owned.id}/shares`,
      {
        headers: { Cookie: `dbo_session=${adminSid}` },
        data: { userId: memberId, role: "viewer", passwordShared: true },
      },
    );
    expect(shareRes.ok()).toBeTruthy();

    const memberContext = await browser.newContext();
    try {
      const memberPage = await memberContext.newPage();
      const memberAuth = new AuthPage(memberPage);
      await memberPage.goto("/");
      await memberAuth.login(memberEmail, memberTemp);
      await memberAuth.expectChangePasswordVisible();
      await memberAuth.changePasswordForced(memberPassword);
      await memberAuth.expectAppReady();

      await test.step("viewer sees only that a tunnel is enabled", async () => {
        const shared = (
          await list(request, apiUrl, await sessionCookie(memberPage))
        ).find((c) => c.id === owned.id)!;
        expect(shared.access).toBe("viewer");
        expect(shared.options?.ssh).toEqual({ enabled: true });
      });
    } finally {
      await memberContext.close();
    }
  });
});
