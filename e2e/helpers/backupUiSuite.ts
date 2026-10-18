import { expect, test } from "@playwright/test";
import type { DbEngine } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { BackupPage, ObjectTreePage } from "../pages";
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

export function defineBackupUiTests(engine: DbEngine): void {
  test.describe(`Backup dialog ${label(engine)}`, () => {
    test("back up, list in history, and guard the restore", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-ui-${suffix}`;
      const table = `e2e_bk_ui_${suffix}`;
      // SQLite has no database name, so the dialog asks for the connection name.
      const targetName = engine === "sqlite" ? connectionName : "default";

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(
          page,
          { connectionName, exportTable: table },
          engine,
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

          await test.step("Tool list is shown and offers nothing silently", async () => {
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

          await test.step("History lists the backup with its note", async () => {
            await expect(backup.historyRows()).toHaveCount(1);
            await expect(page.getByText("ui note")).toBeVisible();
            await expect(
              page.getByText(/Native tool: |Basic \(built-in\)/),
            ).toBeVisible();
          });

          await test.step("Restore stays disabled until the exact name is typed", async () => {
            await backup.openRestore();
            await expect(backup.restoreConfirmButton).toBeDisabled();
            await backup.confirmNameInput.fill("wrong");
            await expect(backup.restoreConfirmButton).toBeDisabled();
            await backup.confirmNameInput.fill(targetName);
            await expect(backup.restoreConfirmButton).toBeEnabled();
          });

          await test.step("Cancelling the confirmation queues no restore", async () => {
            await page.getByRole("button", { name: "Cancel" }).last().click();
            await expect(backup.restoreDialog).toBeHidden();
            const response = await page.request.get("/api/jobs/2");
            expect(response.status()).toBe(404);
          });

          if (engine === "sqlite") {
            await test.step("Confirmed restore into a non-empty database fails visibly", async () => {
              await backup.openRestore();
              await backup.confirmNameInput.fill(targetName);
              await backup.restoreConfirmButton.click();
              await backup.expectJobMessage(/not empty/);
              await backup.closeProgress();
            });
          }
        } finally {
          if (engine === "sqlite") {
            cleanupImportExportSqlite(pages);
          } else {
            // The dialog's backdrop blocks the SQL editor.
            await page.keyboard.press("Escape");
            await expect(backup.dialog).toBeHidden();
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });

    test("create, run, pause and delete a schedule", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-ui-sched-${suffix}`;
      const table = `e2e_bk_ui_sched_${suffix}`;
      const scheduleName = `nightly-${suffix}`;

      await withConnectionCleanup(page, connectionName, async () => {
        const pages = await setupImportExport(
          page,
          { connectionName, exportTable: table },
          engine,
        );
        const backup = new BackupPage(page);
        const row = page.getByTestId(`backup-schedule-${scheduleName}`);

        try {
          await backup.open(connectionName);

          await test.step("Create a daily schedule", async () => {
            await expect(page.getByText("No schedules yet")).toBeVisible();
            await page.getByRole("button", { name: "New schedule" }).click();
            await page
              .locator('input[name="schedule-name"]')
              .fill(scheduleName);
            await page.getByRole("button", { name: "Create schedule" }).click();
            await expect(row).toBeVisible();
            await expect(row.getByText(/Next run:/)).toBeVisible();
          });

          await test.step("Run now produces a completed backup", async () => {
            await row.getByRole("button", { name: "Run now" }).click();
            await backup.expectJobMessage("Backup completed successfully");
            await backup.closeProgress();
            await expect(
              page.getByText(`Schedule: ${scheduleName}`),
            ).toBeVisible();
          });

          await test.step("Pause hides the next run", async () => {
            await row.getByRole("button", { name: "Pause" }).click();
            await expect(row.getByText(/Paused/)).toBeVisible();
            await expect(
              row.getByRole("button", { name: "Resume" }),
            ).toBeVisible();
          });

          await test.step("Delete asks first and keeps the backup", async () => {
            await row.getByRole("button", { name: "Delete" }).click();
            await page
              .getByRole("button", { name: "Delete", exact: true })
              .last()
              .click();
            await expect(row).toBeHidden();
            await expect(
              page.getByText(`Schedule: ${scheduleName}`),
            ).toBeVisible();
          });
        } finally {
          if (engine === "sqlite") {
            cleanupImportExportSqlite(pages);
          } else {
            await page.keyboard.press("Escape");
            await expect(backup.dialog).toBeHidden();
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });

    if (engine !== "sqlite") {
      test("database tree node opens the dialog on that database", async ({
        page,
      }, testInfo) => {
        const connectionName = `bk-tree-${uniqueTestSuffix(testInfo)}`;

        await withConnectionCleanup(page, connectionName, async () => {
          await setupImportExport(page, { connectionName }, engine);
          const backup = new BackupPage(page);
          const tree = new ObjectTreePage(page);

          await test.step("Right-click the database node and pick Backup & Restore", async () => {
            await tree.openContextMenu("default");
            await tree.clickContextMenuAction("Backup & Restore");
            await expect(backup.dialog).toBeVisible();
          });

          await test.step("The database field is prefilled from the node", async () => {
            await expect(
              page.locator('input[name="backup-database"]'),
            ).toHaveValue("default");
          });

          await page.keyboard.press("Escape");
          await expect(backup.dialog).toBeHidden();
        });
      });
    }
  });
}
