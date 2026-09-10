import { expect, test } from '@playwright/test';
import { getDbConfig } from '../../fixtures/dbConfigs';
import { uniqueTestSuffix } from '../../fixtures/uniqueSuffix';
import { withConnectionCleanup } from '../../helpers/safeCleanup';
import { ConnectionPage, SqlEditorPage } from '../../pages';

const TAB_QUERIES_STORAGE_KEY = 'dbo_tab_queries';

/**
 * One-time migration: localStorage dbo_tab_queries → IndexedDB tabQueries cache.
 */
test.describe('Tab query persistence migration', () => {
  test('migrates legacy localStorage tab SQL into the editor', async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);
    const sqlEditor = new SqlEditorPage(page);
    const connectionName = `tab-query-migrate-${uniqueTestSuffix(testInfo)}`;
    const config = getDbConfig('postgresql', connectionName);
    const migratedSql = `SELECT 'e2e_tab_query_migrate_${uniqueTestSuffix(testInfo)}';`;

    await withConnectionCleanup(page, connectionName, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step('Setup connection and open query tab', async () => {
        await connectionPage.setupConnection(config);
        await sqlEditor.open();
        await sqlEditor.selectContext('default', 'public');
      });

      const tabId = await test.step('Read active tab id from persisted tab store', async () => {
        const id = await page.evaluate((): string | undefined => {
          const raw = localStorage.getItem('tabs');
          if (!raw) return undefined;
          const parsed = JSON.parse(raw) as { state?: { selectedTabId?: string } };
          return parsed.state?.selectedTabId;
        });
        expect(id).toBeTruthy();
        return id as string;
      });

      await test.step('Seed legacy localStorage payload and reload', async () => {
        await page.evaluate(
          ({ key, tabId, query }) => {
            localStorage.setItem(key, JSON.stringify({ [tabId]: query }));
          },
          { key: TAB_QUERIES_STORAGE_KEY, tabId, query: migratedSql }
        );
        await page.reload();
        await connectionPage.waitForReady();
        await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15000 });
      });

      await test.step('Editor shows migrated SQL and legacy key is removed', async () => {
        await expect(page.locator('.monaco-editor')).toContainText(migratedSql.slice(0, 40), {
          timeout: 15000
        });
        const legacy = await page.evaluate(
          (key) => localStorage.getItem(key),
          TAB_QUERIES_STORAGE_KEY
        );
        expect(legacy).toBeNull();
      });
    });
  });
});
