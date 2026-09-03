import { expect, type Locator, type Page } from "@playwright/test";
import { SAFE_MODE_PASSWORD } from "../fixtures/safeMode";
import {
  API_DB_TIMEOUT,
  apiRoute,
  pendingResponse,
  waitForResponseDuring,
} from "../helpers/network";
import { BasePage } from "./BasePage";
import { SqlEditorPage } from "./SqlEditorPage";

export type SafeModeValue =
  | "silent"
  | "alert"
  | "alert_write"
  | "safe"
  | "safe_write";

/**
 * Page Object for Safe Mode header menu + confirm / password gates.
 */
export class SafeModePage extends BasePage {
  readonly menuButton: Locator;
  readonly confirmTitle: Locator;
  readonly runAnywayButton: Locator;
  readonly cancelButton: Locator;
  readonly passwordPrompt: Locator;
  readonly setupTitle: Locator;
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly passwordSaveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.menuButton = page.getByTestId("safe-mode-menu");
    this.confirmTitle = page.getByRole("heading", {
      name: "Safe Mode confirmation",
    });
    this.runAnywayButton = page.getByRole("button", { name: "Run anyway" });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.passwordPrompt = page.getByTestId("safe-mode-password-prompt");
    this.setupTitle = page.getByRole("heading", {
      name: "Set Safe Mode password",
    });
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmInput = page.locator('input[name="confirm"]');
    this.passwordSaveButton = page.getByTestId("safe-mode-password-save");
  }

  option(mode: SafeModeValue): Locator {
    return this.page.getByTestId(`safe-mode-option-${mode}`);
  }

  async openMenu(): Promise<void> {
    await expect(this.menuButton).toBeEnabled({ timeout: 15000 });
    await this.menuButton.click();
    await expect(this.option("silent")).toBeVisible({ timeout: 10000 });
  }

  async expectOptionSelected(mode: SafeModeValue): Promise<void> {
    await expect(this.option(mode)).toHaveClass(/Mui-selected/);
  }

  private async expectModeUpdated(): Promise<void> {
    await expect(this.page.getByText("Safe Mode updated").first()).toBeVisible({
      timeout: 10000,
    });
  }

  private async submitSetupPassword(password: string): Promise<void> {
    await expect(this.setupTitle).toBeVisible({ timeout: 15000 });
    await this.passwordInput.fill(password);
    await this.confirmInput.fill(password);
    const setPromise = pendingResponse(this.page, apiRoute.safeModePassword);
    await this.passwordSaveButton.click();
    await setPromise;
    await expect(this.passwordPrompt).toHaveCount(0, { timeout: 15000 });
  }

  async selectMode(mode: SafeModeValue): Promise<void> {
    await this.openMenu();
    const updatePromise = pendingResponse(this.page, apiRoute.connectionsUpdate);
    await this.option(mode).click();

    const outcome = await Promise.race([
      updatePromise.then(() => "updated" as const),
      this.setupTitle.waitFor({ state: "visible", timeout: 15000 }).then(() => "setup" as const),
    ]);
    if (outcome === "setup") {
      await this.submitSetupPassword(SAFE_MODE_PASSWORD);
      await updatePromise;
    }

    await this.expectModeUpdated();
    await expect(this.option(mode)).toHaveCount(0, { timeout: 10000 });
  }

  /**
   * Switch to Silent Mode when a password prompt is required.
   */
  async selectSilentWithPassword(password: string): Promise<void> {
    if (!password) {
      await this.selectMode("silent");
      return;
    }

    await this.openMenu();
    const updatePromise = pendingResponse(
      this.page,
      apiRoute.connectionsUpdate,
    );
    await this.option("silent").click();
    await this.submitPassword(password);
    await updatePromise;
    await this.expectModeUpdated();
  }

  async expectConfirmVisible(): Promise<void> {
    await expect(this.confirmTitle).toBeVisible({ timeout: 15000 });
    await expect(this.runAnywayButton).toBeVisible();
  }

  async confirmRunAnyway(): Promise<void> {
    await this.expectConfirmVisible();
    await waitForResponseDuring(
      this.page,
      apiRoute.queryRaw,
      () => this.runAnywayButton.click(),
    );
    await expect(this.confirmTitle).toBeHidden({ timeout: 10000 });
  }

  async cancelConfirm(): Promise<void> {
    await this.expectConfirmVisible();
    await this.cancelButton.click();
    await expect(this.confirmTitle).toBeHidden({ timeout: 10000 });
  }

  async expectPasswordPromptVisible(): Promise<void> {
    await expect(this.passwordPrompt).toBeVisible({ timeout: 15000 });
    await expect(this.passwordInput).toBeVisible();
  }

  async submitPassword(password: string): Promise<void> {
    await this.expectPasswordPromptVisible();
    await this.passwordInput.fill(password);
    await this.passwordSaveButton.click();
    await expect(this.passwordPrompt).toHaveCount(0, { timeout: 15000 });
  }

  /**
   * Run SQL that should pass without any Safe Mode gate.
   */
  async runWithoutGate(sql: string): Promise<void> {
    const sqlEditor = new SqlEditorPage(this.page);
    await sqlEditor.typeQuery(sql);
    await sqlEditor.runQuery();
  }

  /**
   * Run SQL expecting the Alert confirm gate, then confirm.
   */
  async runWithConfirm(sql: string): Promise<void> {
    const sqlEditor = new SqlEditorPage(this.page);
    await sqlEditor.typeQuery(sql);
    await sqlEditor.clickRun();
    await this.confirmRunAnyway();
  }

  /**
   * Run SQL expecting the Safe Mode password gate, then submit password.
   */
  async runWithPassword(sql: string, password: string): Promise<void> {
    const sqlEditor = new SqlEditorPage(this.page);
    await sqlEditor.typeQuery(sql);

    const retryPromise = pendingResponse(
      this.page,
      apiRoute.queryRaw,
      API_DB_TIMEOUT,
    );

    await sqlEditor.clickRun();
    await this.submitPassword(password);
    await retryPromise;
  }

  /**
   * Run SQL expecting confirm, then cancel (query should not complete).
   */
  async runAndCancelConfirm(sql: string): Promise<void> {
    const sqlEditor = new SqlEditorPage(this.page);
    await sqlEditor.typeQuery(sql);
    await sqlEditor.clickRun();
    await this.cancelConfirm();
  }
}
