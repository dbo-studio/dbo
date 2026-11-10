import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { ConnectionPage } from "./ConnectionPage";

/** Backup & Restore workspace tab, opened from a connection's context menu or the header. */
export class BackupPage extends BasePage {
  get dialog(): Locator {
    return this.page.getByTestId("backup-panel");
  }

  get backupNowButton(): Locator {
    return this.page.getByRole("button", { name: "Back up now" });
  }

  get restoreDialog(): Locator {
    return this.page.getByRole("heading", { name: "Restore backup" });
  }

  get restoreConfirmButton(): Locator {
    // The confirmation modal mounts after the history rows, so its button is last.
    return this.page
      .getByRole("button", { name: "Restore", exact: true })
      .last();
  }

  async open(connectionName: string): Promise<void> {
    const connections = new ConnectionPage(this.page);
    await connections.openContextMenu(connectionName);
    await connections.clickContextMenuItem("Backup & Restore");
    await expect(this.dialog).toBeVisible();
  }

  /** Closes the Backup tab so the SQL editor tab is in front again. */
  async close(): Promise<void> {
    await this.page
      .getByTestId("workspace-tab-backup-&-restore")
      .locator("svg")
      .last()
      .click();
    await expect(this.dialog).toBeHidden();
  }

  historyRows(): Locator {
    // One Restore button per completed backup; the tool list also has Download buttons.
    return this.dialog.getByRole("button", { name: "Restore", exact: true });
  }

  async startBackup(note?: string): Promise<void> {
    if (note) {
      await this.page.locator('input[name="backup-note"]').fill(note);
    }
    await this.backupNowButton.click();
  }

  async expectJobMessage(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 60_000 });
  }

  async closeProgress(): Promise<void> {
    await this.page.getByRole("button", { name: "Close", exact: true }).click();
  }

  get confirmNameInput(): Locator {
    return this.page.locator('input[name="backup-confirm-name"]');
  }

  async openRestore(): Promise<void> {
    await this.historyRows().first().click();
    await expect(this.restoreDialog).toBeVisible();
  }
}
