import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";
import { ConnectionPage } from "./ConnectionPage";

/** Backup & Restore dialog opened from a connection's context menu. */
export class BackupPage extends BasePage {
  get dialog(): Locator {
    return this.page.getByRole("heading", { name: "Backup & Restore" });
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

  historyRows(): Locator {
    return this.page.getByRole("button", { name: "Download", exact: true });
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
    await this.page
      .getByRole("button", { name: "Restore", exact: true })
      .first()
      .click();
    await expect(this.restoreDialog).toBeVisible();
  }
}
