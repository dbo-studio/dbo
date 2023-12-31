import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByText('Add Tab').click();
});

test('should render the action bar', async ({ page }) => {
  const actionBar = await page.locator('#action-bar');
  expect(actionBar).toBeVisible();
});

test('should toggle query preview when code icon is clicked', async ({ page }) => {
  const codeIcon = await page.locator('.toggle-code-preview');
  await codeIcon.click();
  expect(await page.locator('.query-preview')).toBeVisible();
});

test('should toggle filters when filter icon is clicked', async ({ page }) => {
  const filterIcon = await page.locator('.toggle-filters');
  await filterIcon.click();
  expect(await page.locator('.add-filter-btn')).toBeVisible();
});
