import { expect, test } from "@playwright/test";
import { getDbConfig } from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { ensureSqliteDbFile, removeSqliteDbFile } from "../../helpers/objectFormSqliteLifecycle";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

test.use({ viewport: { width: 1440, height: 900 } });

/** A connection with no open tab shows the next step, the shortcuts and a few features. */
test("empty workspace shows actions, shortcuts and tips", async ({ page }, testInfo) => {
  const name = `empty-ws-${uniqueTestSuffix(testInfo)}`;
  const dbPath = `/tmp/dbo-e2e-${name}.db`;
  ensureSqliteDbFile(dbPath);

  try {
    await withConnectionCleanup(page, name, async () => {
      const connectionPage = new ConnectionPage(page);
      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.setupConnection(getDbConfig("sqlite", name, dbPath));

      const empty = page.getByTestId("workspace-empty");
      await expect(empty).toBeVisible();
      await expect(empty).toContainText("Shortcuts");
      await expect(empty).toContainText("Good to know");

      await empty.getByRole("button", { name: "Open editor" }).click();
      await expect(empty).toBeHidden();
    });
  } finally {
    removeSqliteDbFile(dbPath);
  }
});
