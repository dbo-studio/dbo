import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

/**
 * Wave 1: MariaDB is a MySQL-protocol alias. Smoke against sample-mysql
 * (protocol-compatible stand-in) — create type=mariadb, ping, open tree.
 */
test.describe("MariaDB alias", () => {
  test("Create MariaDB connection against MySQL-compatible host", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `mariadb-alias-${uniqueTestSuffix(testInfo)}`;
    const config = {
      ...getDbConfig("mysql", connectionName),
      type: "MariaDB" as const,
    };

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create MariaDB-typed connection", async () => {
        await connectionPage.createConnection(config);
        await expect(
          connectionPage.getConnectionItem(connectionName),
        ).toBeVisible();
      });

      await test.step("Tree opens (MySQL stack via alias)", async () => {
        await connectionPage.expectConnectionActive(connectionName);
        await expect(page.getByRole("treeitem").first()).toBeVisible({
          timeout: 30_000,
        });
      });
    });
  });
});
