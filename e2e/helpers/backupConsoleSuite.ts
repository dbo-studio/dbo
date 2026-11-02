import { expect, test } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { BackupPage } from "../pages";
import {
  cleanupImportExportSqlite,
  dropTables,
  setupImportExport,
} from "./importExport";
import { withConnectionCleanup } from "./safeCleanup";

function label(engine: DbEngine): string {
  return engine === "postgresql"
    ? "PostgreSQL"
    : engine === "mysql"
      ? "MySQL"
      : "SQLite";
}

export function defineBackupConsoleTests(engine: DbEngine): void {
  test.describe(`Backup console ${label(engine)}`, () => {
    test("create a job with the wizard, run it, inspect its runs, pause and delete", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-console-${suffix}`;
      const table = `e2e_bk_console_${suffix}`;
      const jobName = `nightly-${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(
          page,
          { connectionName, exportTable: table },
          engine,
        );
        const backup = new BackupPage(page);
        const row = page.getByTestId(`backup-job-${jobName}`);

        try {
          await test.step("Open the Backup console from the header", async () => {
            await page.getByTestId("activity-backup").click();
            await page.getByTestId("backup-nav-schedules").click();
            await expect(page.getByTestId("backup-console")).toBeVisible();
            await expect(page.getByText(/No backup jobs yet/)).toBeVisible();
          });

          await test.step("Fill the one-page schedule form", async () => {
            await page.getByRole("button", { name: "New backup job" }).click();
            await expect(page.getByTestId("backup-job-wizard")).toBeVisible();
            // Nothing can be saved without a name.
            await expect(page.getByTestId("schedule-save")).toBeDisabled();
            await page.locator('input[name="job-name"]').fill(jobName);
            // The first connection is preselected; storage defaults to this machine.
            await expect(page.getByText("This machine only").first()).toBeVisible();
            await page
              .locator('input[name="job-passphrase"]')
              .fill("e2e-secret");
            await expect(page.getByText(/cannot be restored/)).toBeVisible();
            await expect(page.getByText(/Every day/).first()).toBeVisible();
            await page.getByTestId("schedule-save").click();
            await expect(row).toBeVisible();
            await expect(row.getByText("Not run")).toBeVisible();
            await expect(row.getByText(/Encrypted/)).toBeVisible();
          });

          await test.step("Run now completes and the row shows the result", async () => {
            await row.getByRole("button", { name: "Run now" }).click();
            await backup.expectJobMessage("Backup completed successfully");
            await backup.closeProgress();
            await expect(
              row.getByText("Completed", { exact: true }),
            ).toBeVisible();
            await expect(row.getByText("Never")).toHaveCount(0);
          });

          await test.step("Details lists the run with a download", async () => {
            await row.getByRole("button", { name: "Details" }).click();
            const detail = page.getByTestId("backup-job-detail");
            await expect(detail).toBeVisible();
            await expect(
              detail.getByRole("button", { name: "Download", exact: true }),
            ).toHaveCount(1);
            await expect(
              detail.getByRole("button", { name: "Restore…" }),
            ).toHaveCount(1);
          });

          await test.step("A run's log shows what happened", async () => {
            const detail = page.getByTestId("backup-job-detail");
            await detail
              .getByRole("button", { name: "Log", exact: true })
              .click();
            await expect(detail.getByText(/Wrote .* bytes/)).toBeVisible();
            await detail.getByRole("button", { name: "Hide log" }).click();
          });

          await test.step("Edit keeps the job and saves changes", async () => {
            const detail = page.getByTestId("backup-job-detail");
            await detail
              .getByRole("button", { name: "Edit", exact: true })
              .click();
            await expect(page.getByTestId("backup-job-wizard")).toBeVisible();
            await expect(page.locator('input[name="job-name"]')).toHaveValue(
              jobName,
            );
            await page.getByTestId("schedule-save").click();
            await expect(page.getByTestId("backup-job-detail")).toBeVisible();
          });

          await test.step("Verify checks the checksum, and the contents with the passphrase", async () => {
            const detail = page.getByTestId("backup-job-detail");
            await detail.getByRole("button", { name: "Verify" }).click();
            await expect(page.getByText(/contents not opened/)).toBeVisible();
            await detail
              .locator('input[name="verify-passphrase"]')
              .fill("e2e-secret");
            await detail.getByRole("button", { name: "Verify" }).click();
            await expect(page.getByText(/read back completely/)).toBeVisible();
          });

          await test.step("Restore asks for the passphrase before it can start", async () => {
            const detail = page.getByTestId("backup-job-detail");
            await detail.getByRole("button", { name: "Restore…" }).click();
            await expect(
              page.getByRole("heading", { name: "Restore backup" }),
            ).toBeVisible();
            await expect(
              page.locator('input[name="backup-restore-passphrase"]'),
            ).toBeVisible();
            await page.getByRole("button", { name: "Cancel" }).last().click();
            await expect(
              page.getByRole("heading", { name: "Restore backup" }),
            ).toBeHidden();
          });

          await test.step("Pause, then delete after confirming", async () => {
            const detail = page.getByTestId("backup-job-detail");
            await detail.getByRole("button", { name: "Pause" }).click();
            await expect(
              detail.getByRole("button", { name: "Resume" }),
            ).toBeVisible();
            await detail.getByRole("button", { name: "Delete" }).click();
            await page
              .getByRole("button", { name: "Delete", exact: true })
              .last()
              .click();
            await expect(page.getByText(/No backup jobs yet/)).toBeVisible();
          });
        } finally {
          if (engine === "sqlite") {
            cleanupImportExportSqlite(pages);
          } else {
            await backup.close();
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });
  });
}
