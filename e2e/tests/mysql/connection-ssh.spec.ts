import net from "node:net";
import { expect, test } from "@playwright/test";
import { getDbConfig, getSshBastionConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

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
 * MySQL through the SSH bastion (sample-sshd resolves sample-mysql by name).
 * Prerequisites: docker compose -p dbo -f docker-compose.dev.yml up -d sample-mysql sample-sshd
 */
test("MySQL connection reaches a DB only visible from the bastion", async ({
  page,
}, testInfo) => {
  const bastion = getSshBastionConfig();
  test.skip(
    !(await canReach(bastion.host, Number(bastion.port))),
    `SSH sample not reachable at ${bastion.host}:${bastion.port}.`,
  );

  const connectionPage = new ConnectionPage(page);
  const name = `conn-ssh-mysql-${uniqueTestSuffix(testInfo)}`;

  await withConnectionCleanup(page, name, async () => {
    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.createConnection({
      ...getDbConfig("mysql", name),
      host: "sample-mysql",
      port: "3306",
      ssh: { ...bastion, authMethod: "password" },
    });
    await expect(connectionPage.getConnectionItem(name)).toBeVisible();
    await connectionPage.deleteConnection(name);
  });
});
