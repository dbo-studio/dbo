import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  ensureSqliteDbFile,
  removeSqliteDbFile,
} from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage, SafeModePage } from "../../pages";

test("Safe Mode is disabled for SQLite", async ({ page }, testInfo) => {
  const connectionPage = new ConnectionPage(page);
  const safeMode = new SafeModePage(page);
  const suffix = uniqueTestSuffix(testInfo);
  const connectionName = `safe-mode-sqlite-off-${suffix}`;
  const sqlitePath = `/tmp/dbo-e2e-safe-off-${suffix}.db`;
  ensureSqliteDbFile(sqlitePath);
  const config = getDbConfig("sqlite", connectionName, sqlitePath);

  await withConnectionCleanup(page, connectionName, async () => {
    try {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create and activate connection", async () => {
        await connectionPage.setupConnection(config);
        await connectionPage.expectConnectionActive(connectionName);
      });

      await test.step("Safe Mode menu stays disabled", async () => {
        await expect(safeMode.menuButton).toBeVisible();
        await expect(safeMode.menuButton).toBeDisabled();
      });
    } finally {
      removeSqliteDbFile(sqlitePath);
    }
  });
});
