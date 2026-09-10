import net from "node:net";
import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

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

/**
 * Connection URI import — parse/sync fields + SSL, password strip on save.
 */
test.describe("Connection URI import", () => {
  const testPrefix = "conn-uri";

  test("Paste Neon-style URI fills fields and SSL mode", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-parse-${uniqueTestSuffix(testInfo)}`;

    await connectionPage.goto();
    await connectionPage.waitForReady();

    await test.step("Open PostgreSQL form and paste URI", async () => {
      await connectionPage.openNewConnectionModal();
      await connectionPage.selectConnectionType("PostgreSQL");
      await connectionPage.nameInput.fill(connectionName);
      await connectionPage.fillConnectionUri(
        "postgres://neon_user:s3cret@ep-cool.aws.neon.tech:5432/neondb?sslmode=require",
      );
    });

    await test.step("Discrete fields and SSL are filled; URI is redacted", async () => {
      await expect(connectionPage.hostInput).toHaveValue("ep-cool.aws.neon.tech");
      await expect(connectionPage.portInput).toHaveValue("5432");
      await expect(connectionPage.usernameInput).toHaveValue("neon_user");
      await expect(connectionPage.passwordInput).toHaveValue("s3cret");
      await expect(page.locator('input[name="database"]')).toHaveValue("neondb");
      await expect(connectionPage.uriInput).toHaveValue(
        /postgres:\/\/neon_user@ep-cool\.aws\.neon\.tech:5432\/neondb/,
      );
      await expect(connectionPage.uriInput).not.toHaveValue(/s3cret/);
      await connectionPage.expectSslMode("require");
    });

    await test.step("Cancel form", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(
        page.getByRole("heading", { name: "New connection" }),
      ).toBeHidden();
    });
  });

  test("Create from URI stores redacted URI and still connects", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `${testPrefix}-save-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig("postgresql", connectionName);
    const reachable = await canReachHost(config.host, Number(config.port));

    test.skip(
      !reachable,
      `Postgres sample not reachable at ${config.host}:${config.port}`,
    );

    const uri = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database ?? "default"}?sslmode=prefer`;

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create connection from URI", async () => {
        await connectionPage.createConnectionFromUri(
          connectionName,
          uri,
          "PostgreSQL",
        );
      });

      await test.step("Activate connection", async () => {
        await connectionPage.activateConnection(
          connectionName,
          config.password,
        );
        await connectionPage.expectConnectionActive(connectionName);
      });

      await test.step("Edit form shows URI without password", async () => {
        await connectionPage.editConnection(connectionName);
        await expect(connectionPage.useUriCheckbox).toBeChecked();
        await expect(connectionPage.uriInput).toBeVisible();
        const storedUri = await connectionPage.uriInput.inputValue();
        expect(storedUri).toContain(config.host);
        expect(storedUri).not.toContain(config.password);
        await page.getByRole("button", { name: "Cancel" }).click();
      });
    });
  });
});
