import { expect, type Page } from '@playwright/test';
import { ConnectionPage } from '../pages';

async function resetAppDbViaApi(): Promise<void> {
  const baseUrl = process.env.PLAYWRIGHT_API_URL;
  if (!baseUrl) {
    return;
  }
  try {
    await fetch(`${baseUrl}/config/reset`, { method: 'POST' });
  } catch (err) {
    console.warn('[e2e] API config/reset failed:', err);
  }
}

/** Best-effort connection delete so failed tests do not leave app-DB orphans. */
export async function safeDeleteConnection(page: Page, name: string | undefined): Promise<void> {
  if (!name) {
    return;
  }

  try {
    if (page.isClosed()) {
      await resetAppDbViaApi();
      return;
    }
    const connectionPage = new ConnectionPage(page);
    await connectionPage.goto();
    await connectionPage.waitForReady();
    // Settings `showSettings.open` is persisted in localStorage, so reload can reopen
    // the modal. MUI Modal uses role=presentation (not dialog) — dismiss via Escape.
    const modal = page.locator('.MuiModal-root');
    for (let i = 0; i < 3; i++) {
      if (!(await modal.first().isVisible().catch(() => false))) {
        break;
      }
      await page.keyboard.press('Escape');
      await expect(modal).toHaveCount(0, { timeout: 2000 }).catch(() => undefined);
    }
    if (await connectionPage.connectionExists(name)) {
      await connectionPage.deleteConnection(name);
    }
  } catch (err) {
    console.warn(`[e2e] safeDeleteConnection(${name}) failed, resetting app DB:`, err);
    await resetAppDbViaApi();
  }
}

/**
 * Run a test body and always attempt connection cleanup afterward.
 * Object-form helpers that drop DBs/tables should still be called inside `fn` when possible;
 * this guarantees the app connection row is removed even if earlier steps throw.
 */
export async function withConnectionCleanup(
  page: Page,
  connectionName: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } finally {
    await safeDeleteConnection(page, connectionName);
  }
}
