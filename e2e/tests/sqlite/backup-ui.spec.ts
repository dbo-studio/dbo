import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import { BackupPage } from "../../pages";
import {
  cleanupImportExportSqlite,
  setupImportExport,
} from "../../helpers/importExport";
import { withConnectionCleanup } from "../../helpers/safeCleanup";

test.describe("Backup dialog SQLite", () => {
  test("back up, list in history, and guard the restore", async ({
    page,
  }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `bk-ui-${suffix}`;
    const table = `e2e_bk_ui_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const pages = await setupImportExport(
        page,
        { connectionName, exportTable: table },
        "sqlite",
      );
      const backup = new BackupPage(page);

      try {
        await test.step("Open Backup & Restore from the connection menu", async () => {
          await backup.open(connectionName);
          await expect(
            page.getByText("A backup copies the whole database"),
          ).toBeVisible();
          await expect(
            page.getByText("No backups yet", { exact: true }),
          ).toBeVisible();
        });

        await test.step("Tool list shows sqlite3 and offers nothing silently", async () => {
          await expect(
            page.getByText("sqlite3", { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByText("Nothing is downloaded unless you ask"),
          ).toBeVisible();
        });

        await test.step("Back up now shows progress and a download", async () => {
          await backup.startBackup("ui note");
          await backup.expectJobMessage("Backup completed successfully");
          await expect(
            page.getByRole("button", { name: "Download File" }),
          ).toBeVisible();
          await backup.closeProgress();
        });

        await test.step("History lists the backup with its note and method", async () => {
          await expect(backup.historyRows()).toHaveCount(1);
          await expect(page.getByText("ui note")).toBeVisible();
          await expect(page.getByText(/Native tool: sqlite/)).toBeVisible();
        });

        await test.step("Restore stays disabled until the exact name is typed", async () => {
          await backup.openRestore();
          await expect(backup.restoreConfirmButton).toBeDisabled();
          await backup.confirmNameInput.fill("wrong");
          await expect(backup.restoreConfirmButton).toBeDisabled();
          await backup.confirmNameInput.fill(connectionName);
          await expect(backup.restoreConfirmButton).toBeEnabled();
        });

        await test.step("Cancelling the confirmation queues no restore", async () => {
          await page.getByRole("button", { name: "Cancel" }).last().click();
          await expect(backup.restoreDialog).toBeHidden();
          const response = await page.request.get("/api/jobs/2");
          expect(response.status()).toBe(404);
        });

        await test.step("Confirmed restore into a non-empty database fails visibly", async () => {
          await backup.openRestore();
          await backup.confirmNameInput.fill(connectionName);
          await backup.restoreConfirmButton.click();
          await backup.expectJobMessage(/not empty/);
          await backup.closeProgress();
        });
      } finally {
        cleanupImportExportSqlite(pages);
      }
    });
  });
});
