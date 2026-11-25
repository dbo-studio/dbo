import { once } from "node:events";
import { createConnection } from "node:net";
import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { createNoSqlConnection, redisHost, redisPort } from "../../helpers/nosql";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

test("Redis Server shows status and connected clients in the shared grid", async ({ page }, testInfo) => {
  const name = `redis-server-${uniqueTestSuffix(testInfo)}`;
  await withConnectionCleanup(page, name, async () => {
    const connection = new ConnectionPage(page);
    await test.step("Open Server from the Redis connection menu", async () => {
      await createNoSqlConnection(page, "redis", name);
      await expect(page.getByTestId("connection-switcher-panel")).toBeHidden();
      await connection.openSwitcher();
      await connection.getConnectionItem(name).click({ button: "right" });
      await page.getByRole("menuitem", { name: "Server", exact: true }).click();
    });

    await test.step("Check the version and see the client-list columns", async () => {
      const tool = page.getByTestId("server-tool");
      await expect(tool.getByRole("row").filter({ hasText: "Version" })).toContainText(/\d+\.\d+/);
      const client = createConnection({ host: redisHost, port: Number(redisPort) });
      try {
        await once(client, "connect");
        await tool.getByTestId("server-tabs-operations").click();
        await expect(tool.getByRole("columnheader", { name: "Command" })).toBeVisible();
      } finally {
        client.destroy();
      }
    });
  });
});
