import { expect, test } from '@playwright/test';
import { getDbConfig } from '../../fixtures/dbConfigs';
import { uniqueTestSuffix } from '../../fixtures/uniqueSuffix';
import { withConnectionCleanup } from '../../helpers/safeCleanup';
import { ConnectionPage, SettingsPage } from '../../pages';

/**
 * AI chat cancel — AbortController on stream + HTTP fallback (no real LLM).
 */
test.describe('AI chat cancel', () => {
  test('cancel stops an in-flight chat request', async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);
    const connectionName = `ai-cancel-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig('postgresql', connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      let streamSeen = false;

      await page.route('**/api/ai/chat/stream', async (route) => {
        streamSeen = true;
        await new Promise(() => {
          /* hang until client aborts */
        });
      });

      await page.route('**/api/ai/chat', async (route) => {
        await new Promise(() => {
          /* fallback path — hang until abort */
        });
      });

      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step('Setup connection', async () => {
        await connectionPage.setupConnection(config);
      });

      await test.step('Open assistant composer', async () => {
        if (!(await settingsPage.rightSidebarTab().isVisible().catch(() => false))) {
          await settingsPage.toggleRightSidebar();
        }
        await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible({ timeout: 15000 });
      });

      await test.step('Send message and cancel while pending', async () => {
        const composer = page.getByPlaceholder(/ask anything/i);
        await composer.fill('cancel me');
        await composer.press('Enter');

        const cancel = page.getByTestId('ai-chat-cancel');
        await expect(cancel).toBeVisible({ timeout: 15000 });
        await cancel.click();

        await expect(cancel).toHaveCount(0, { timeout: 10000 });
        await expect(page.getByPlaceholder(/ask anything/i)).toBeEnabled();
      });

      expect(streamSeen).toBe(true);
    });
  });
});
