import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { getDbConfig, getSslPostgresConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { API_DB_TIMEOUT, apiRoute, pendingResponse } from "../helpers/network";
import { withConnectionCleanup } from "../helpers/safeCleanup";
import { ConnectionPage } from "../pages";

const fixturesDir = path.join(process.cwd(), "fixtures");
const caCertPath = path.join(fixturesDir, "certs", "ca.crt");
const wrongCaPath = path.join(fixturesDir, "certs", "wrong-ca.crt");

async function canReachHost(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
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

/**
 * Connection SSL — UI smoke + TLS-required Postgres (sample-pgsql-ssl).
 *
 * Prerequisites for TLS cases:
 *   docker compose -f docker-compose.dev.yml up -d sample-pgsql-ssl
 */
test.describe("Connection SSL", () => {
  const testPrefix = "conn-ssl";

  test("SSL tab mode toggles cert fields", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-ui-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step("Open PostgreSQL connection form", async () => {
      await connectionPage.openNewConnectionModal();
      await connectionPage.selectConnectionType("PostgreSQL");
      await connectionPage.nameInput.fill(config.name);
    });

    await test.step("SSL tab shows Prefer by default without cert fields", async () => {
      await connectionPage.openSslTab();
      await expect(page.locator(".ssl-mode__single-value")).toHaveText("Prefer");
      await expect(page.getByTestId("ssl-cert-field-sslCaCert")).toBeHidden();
    });

    await test.step("Require reveals certificate fields", async () => {
      await connectionPage.setSslMode("require");
      await expect(page.getByTestId("ssl-cert-field-sslCaCert")).toBeVisible();
      await expect(page.getByTestId("ssl-cert-field-sslClientCert")).toBeVisible();
      await expect(page.getByTestId("ssl-cert-field-sslClientKey")).toBeVisible();
    });

    await test.step("Load CA file into textarea", async () => {
      await connectionPage.loadSslCaCertFile(caCertPath);
    });

    await test.step("Disable hides certificate fields", async () => {
      await connectionPage.setSslMode("disable");
      await expect(page.getByTestId("ssl-cert-field-sslCaCert")).toBeHidden();
    });

    await test.step("Cancel form", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(
        page.getByRole("heading", { name: "New connection" }),
      ).toBeHidden();
    });
  });

  test("Create Postgres connection with SSL Require against TLS sample", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-req-${uniqueTestSuffix(testInfo)}`;
    const config = getSslPostgresConfig(connectionName);
    const reachable = await canReachHost(config.host, Number(config.port));

    test.skip(
      !reachable,
      `TLS sample Postgres not reachable at ${config.host}:${config.port}. Run: docker compose -f docker-compose.dev.yml up -d sample-pgsql-ssl`,
    );

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create connection with SSL Require", async () => {
        await connectionPage.createConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Edit form preserves SSL Require", async () => {
        await connectionPage.editConnection(connectionName);
        await connectionPage.expectSslMode("require");
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(
          page.getByRole("heading", { name: "Edit connection" }),
        ).toBeHidden();
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(connectionName);
      });
    });
  });

  test("Verify CA with wrong certificate fails Test", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-badca-${uniqueTestSuffix(testInfo)}`;
    const config = getSslPostgresConfig(connectionName);
    const reachable = await canReachHost(config.host, Number(config.port));

    test.skip(
      !reachable,
      `TLS sample Postgres not reachable at ${config.host}:${config.port}. Run: docker compose -f docker-compose.dev.yml up -d sample-pgsql-ssl`,
    );

    const wrongCaPem = readFileSync(wrongCaPath, "utf8");

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step("Fill form with verify-ca and wrong CA", async () => {
      await connectionPage.openNewConnectionModal();
      await connectionPage.selectConnectionType("PostgreSQL");
      await connectionPage.fillConnectionForm({
        ...config,
        ssl: { mode: "verify-ca", caCert: wrongCaPem },
      });
    });

    await test.step("Test connection fails", async () => {
      const responsePromise = pendingResponse(
        page,
        apiRoute.connectionsPing,
        API_DB_TIMEOUT,
      );
      await connectionPage.testConnectionButton.click();
      const response = await responsePromise;
      expect(response.status()).not.toBe(200);
    });

    await test.step("Cancel", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
    });
  });
});
