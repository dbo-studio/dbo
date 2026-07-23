import { expect, test } from '@playwright/test';
import { getDbConfig } from '../fixtures/dbConfigs';
import { ConnectionPage, SettingsPage } from '../pages';

test.describe('AI Chat', () => {
  test('opens assistant panel and shows composer', async ({ page }) => {
    const connectionPage = new ConnectionPage(page);
    const settingsPage = new SettingsPage(page);
    const connectionName = `ai-chat-${Date.now()}`;
    const config = getDbConfig('postgresql', connectionName);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.setupConnection(config);

    if (!(await settingsPage.isRightSidebarVisible())) {
      await settingsPage.toggleRightSidebar();
    }

    await expect(page.getByRole('tab', { name: 'Assistant' })).toBeVisible();
    await expect(page.getByPlaceholder(/ask anything/i)).toBeVisible();
  });
});
