import net from "node:net";
import { expect, test } from "@playwright/test";
import { getHostSqlConfig, getSshBastionConfig, type HostSqlEngine } from "../fixtures/dbConfigs";
import { ping } from "./hostSql";

/** Where the bastion (sample-sshd) reaches each sample server by compose service name, and its in-network port. */
const INSIDE: Record<HostSqlEngine, { host: string; port: number; type: string }> = {
  mssql: { host: "sample-mssql", port: 1433, type: "sqlserver" },
  clickhouse: { host: "sample-clickhouse", port: 9000, type: "clickhouse" },
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

/**
 * SSH tunnel and TLS for SQL Server / ClickHouse, through the ping API (same options the form submits).
 * Needs sample-sshd on the same compose project: docker compose -p dbo -f docker-compose.dev.yml up -d sample-sshd
 */
export function defineHostSqlTunnelTests(engine: HostSqlEngine): void {
  const target = INSIDE[engine];
  const cfg = getHostSqlConfig(engine, "x");
  const bastion = getSshBastionConfig();
  const direct = { host: cfg.host, port: Number(cfg.port), username: cfg.username, password: cfg.password, database: "shop" };
  // The server as the bastion sees it; the host itself cannot resolve this name.
  const viaBastion = { ...direct, host: target.host, port: target.port };
  const ssh = (extra: Record<string, unknown> = {}) => ({
    enabled: true,
    host: bastion.host,
    port: Number(bastion.port),
    username: bastion.username,
    authMethod: "password",
    password: bastion.password,
    ...extra,
  });

  test.describe(`${engine} SSH tunnel and TLS`, () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!(await canReach(bastion.host, Number(bastion.port))), "sample-sshd is not reachable");
      await page.goto("/");
    });

    test("a server only the bastion can name is reached through the tunnel", async ({ page }) => {
      const res = await ping(page, target.type, { ...viaBastion, ssh: ssh() });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expect((res.body.data as { sshTunnel?: boolean }).sshTunnel).toBe(true);
    });

    test("without the tunnel the same host name does not resolve", async ({ page }) => {
      const res = await ping(page, target.type, viaBastion);
      expect(res.status).toBe(400);
      expect((res.body.data as { category?: string }).category).toBe("network");
    });

    test("a wrong SSH password is an authentication failure, not a database error", async ({ page }) => {
      const res = await ping(page, target.type, { ...viaBastion, ssh: ssh({ password: "wrong" }) });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/ssh|tunnel|authentication/i);
    });

    test("an unreachable bastion is a network failure", async ({ page }) => {
      const res = await ping(page, target.type, { ...viaBastion, ssh: ssh({ port: 1 }) });
      expect(res.status).toBe(400);
    });

    test("wrong database credentials are still reported through a working tunnel", async ({ page }) => {
      const res = await ping(page, target.type, { ...viaBastion, password: "nope", ssh: ssh() });
      expect(res.status).toBe(400);
      expect((res.body.data as { category?: string }).category).toBe("authentication");
    });

    test("a tunnel with no host is refused by validation", async ({ page }) => {
      const res = await ping(page, target.type, { ...viaBastion, ssh: ssh({ host: "" }) });
      expect(res.status).toBe(400);
    });

    if (engine === "mssql") {
      test("TLS: require connects, verify-full without a CA is refused", async ({ page }) => {
        const required = await ping(page, "sqlserver", { ...direct, ssl: { mode: "require" } });
        expect(required.status, JSON.stringify(required.body)).toBe(200);
        const strict = await ping(page, "sqlserver", { ...direct, ssl: { mode: "verify-full" } });
        expect(strict.status).toBe(400);
      });
    } else {
      test("TLS: requiring TLS on the plain native port fails cleanly", async ({ page }) => {
        const res = await ping(page, "clickhouse", { ...direct, ssl: { mode: "require" } });
        expect(res.status).toBe(400);
        expect(res.status).toBeLessThan(500);
      });
    }

    test("an invalid ssl mode is refused by validation", async ({ page }) => {
      const res = await ping(page, target.type, { ...direct, ssl: { mode: "banana" } });
      expect(res.status).toBe(400);
    });
  });
}
