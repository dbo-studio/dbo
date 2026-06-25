import { expect, test } from '@playwright/test';
import { ConnectionPage } from '../pages';

test.describe('AI Chat', () => {
  test('opens assistant panel and shows composer', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const connectionName = `ai-chat-${Date.now()}`;
    const config = connectionPage.getConnectionConfig(connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.setupConnection(config);

    await page.getByRole('tab', { name: /assistant/i }).click();
    await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible();
  });
});
