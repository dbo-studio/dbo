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
        const next = page.getByRole("button", { name: "Next", exact: true });

        try {
          await test.step("Open the Backup console from the header", async () => {
            await page.getByTestId("backup-console-open").click();
            await expect(
              page.getByRole("heading", { name: "Backup console" }),
            ).toBeVisible();
            await expect(page.getByText(/No backup jobs yet/)).toBeVisible();
          });

          await test.step("Walk the five wizard steps", async () => {
            await page.getByRole("button", { name: "New backup job" }).click();
            await expect(page.getByTestId("backup-job-wizard")).toBeVisible();
            await expect(next).toBeDisabled();
            await page.locator('input[name="job-name"]').fill(jobName);
            await next.click(); // Destination
            await expect(page.getByText("Local folder").first()).toBeVisible();
            await next.click(); // Source: first connection is preselected
            await next.click(); // Schedule
            await next.click(); // Options
            await expect(page.getByText(/Runs Every day/)).toBeVisible();
            await page.getByRole("button", { name: "Create schedule" }).click();
            await expect(row).toBeVisible();
            await expect(row.getByText("Not run")).toBeVisible();
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
            // Focus can be lost after the confirm modal closes; refocus the console.
            await page.getByRole("heading", { name: "Backup console" }).click();
            await page.keyboard.press("Escape");
            await expect(
              page.getByRole("heading", { name: "Backup console" }),
            ).toBeHidden();
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });
  });
}
