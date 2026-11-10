import { expect, test } from "@playwright/test";
import { type DbEngine, getDbConfig } from "../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { BackupPage, ObjectTreePage } from "../pages";
import {
  cleanupImportExportSqlite,
  dropTables,
  engineLabel,
  setupImportExport,
} from "./importExport";
import { withConnectionCleanup } from "./safeCleanup";

export function defineBackupUiTests(engine: DbEngine): void {
  test.describe(`Backup tab ${engineLabel(engine)}`, () => {
    test("back up, list in history, and guard the restore", async ({
      page,
    }, testInfo) => {
      const suffix = uniqueTestSuffix(testInfo);
      const connectionName = `bk-ui-${suffix}`;
      const table = `e2e_bk_ui_${suffix}`;
      // SQLite has no database name, so the dialog asks for the connection name.
      const dbName = getDbConfig(engine, connectionName).database;
      const targetName = engine === "sqlite" ? connectionName : dbName;

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
            await page.getByTestId("backup-nav-tools").click();
            await expect(
              page.getByText("sqlite3", { exact: true }).first(),
            ).toBeVisible();
            await expect(
              page.getByText("Nothing is downloaded unless you ask"),
            ).toBeVisible();
            await page.getByTestId("backup-nav-backups").click();
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
            const response = await page.request.get("/api/jobs/active");
            expect(response.status()).toBe(200);
            const active = (await response.json()) as { data: unknown[] | null };
            expect(active.data ?? []).toHaveLength(0);
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
            await backup.close();
            await dropTables(pages.sqlEditor, [table]);
          }
        }
      });
    });

    // SQLite has no database node; SQL Server shows its schemas directly under the connection.
    if (engine !== "sqlite" && engine !== "mssql") {
      test("database tree node opens the Backup tab on that database", async ({
        page,
      }, testInfo) => {
        const connectionName = `bk-tree-${uniqueTestSuffix(testInfo)}`;

        await withConnectionCleanup(page, connectionName, async () => {
          await setupImportExport(page, { connectionName }, engine);
          const backup = new BackupPage(page);
          const tree = new ObjectTreePage(page);

          await test.step("Right-click the database node and pick Backup & Restore", async () => {
            await tree.openContextMenu(getDbConfig(engine, connectionName).database);
            await tree.clickContextMenuAction("Backup & Restore");
            await expect(backup.dialog).toBeVisible();
          });

          await test.step("The database field is prefilled from the node", async () => {
            const database = getDbConfig(engine, connectionName).database;
            // PostgreSQL/MySQL show a database field; ClickHouse carries the scope silently,
            // so the restore dialog is where the target database becomes visible.
            if (engine === "clickhouse") {
              await backup.startBackup("tree scope");
              await backup.expectJobMessage("Backup completed successfully");
              await backup.closeProgress();
              await backup.openRestore();
              await expect(page.getByText("Type the database name to confirm: " + database)).toBeVisible();
              await page.getByRole("button", { name: "Cancel" }).last().click();
            } else {
              await expect(page.locator('input[name="backup-database"]')).toHaveValue(database!);
            }
          });

          await backup.close();
        });
      });
    }
  });
}
