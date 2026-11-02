import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { setupImportExport } from "../../helpers/importExport";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { BackupPage } from "../../pages";

test.describe("Backup notification", () => {
  test("a finished backup lands in the notification bell", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `bk-notify-${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      await setupImportExport(page, { connectionName, exportTable: `e2e_bk_notify_${suffix}` }, "sqlite");
      const backup = new BackupPage(page);

      await backup.open(connectionName);
      await backup.startBackup("notify note");
      await backup.expectJobMessage("Backup completed successfully");
      await backup.closeProgress();

      // The backup dialog covers the header, so the bell can only be clicked once it is closed.
      await page.keyboard.press("Escape");
      await expect(page.getByText("A backup copies the whole database")).toBeHidden();

      await expect(page.getByTestId("notification-unread")).toHaveText("1", { timeout: 30_000 });
      await page.getByTestId("notification-bell").click();

      const item = page.getByTestId("notification-item");
      await expect(item).toHaveCount(1);
      await expect(item).toHaveAttribute("data-kind", "job_completed");
      await expect(item).toContainText("Backup finished");
    });
  });
});
