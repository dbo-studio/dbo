import type { Page } from '@playwright/test';
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

/** Close UI modal flags in persisted settings so reload does not reopen them. */
async function clearPersistedUiModals(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('settings');
      if (!raw) {
        return;
      }
      const data = JSON.parse(raw) as {
        state?: {
          ui?: {
            showSettings?: { open: boolean; tab: number };
            showAddConnection?: boolean;
            showEditConnection?: number | boolean;
            showConnectionPasswordPrompt?: boolean;
          };
        };
      };
      const ui = data.state?.ui;
      if (!ui) {
        return;
      }
      ui.showSettings = { open: false, tab: 0 };
      ui.showAddConnection = false;
      ui.showEditConnection = false;
      ui.showConnectionPasswordPrompt = false;
      localStorage.setItem('settings', JSON.stringify(data));
    } catch {
      // ignore corrupt settings blobs
    }
  }).catch(() => undefined);
}

/**
 * Best-effort dismiss of leftover MUI modals. Avoid expect()/waitFor() — timed-out
 * Playwright waits still show red in the report even when the rejection is caught.
 */
async function dismissOpenModals(page: Page): Promise<void> {
  const modal = page.locator('.MuiModal-root').first();
  for (let i = 0; i < 3; i++) {
    if (!(await modal.isVisible().catch(() => false))) {
      return;
    }
    await page.keyboard.press('Escape');
    const deadline = Date.now() + 1500;
    while (Date.now() < deadline) {
      if (!(await modal.isVisible().catch(() => false))) {
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
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
    // Patch before navigation so zustand rehydrates with modals closed.
    await clearPersistedUiModals(page);
    await connectionPage.goto();
    await connectionPage.waitForReady();
    await dismissOpenModals(page);
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
