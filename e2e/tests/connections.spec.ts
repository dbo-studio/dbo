import { expect, test } from '@playwright/test';


test('Connections', async ({ page }) => {

    test.step('Create a new connection flow', async () => {
        await page.goto('/');

        const addConnectionModal = page.getByText('New connection');
        if (await addConnectionModal.isVisible()) {
            await addConnectionModal.click();
            await expect(page.getByText('New connection')).toBeVisible();
        }


        await page.getByTestId('selected-connection-PostgreSQL').click();
        await page.getByTestId('select-connection').click();

        await page.locator('input[name="name"]').fill('local');
        await page.locator('input[name="host"]').fill('sample-pgsql');
        await page.locator('input[name="port"]').fill('5432');
        await page.locator('input[name="username"]').fill('default');
        await page.locator('input[name="password"]').fill('secret');

        await page.getByTestId('test-connection').click();
        await page.waitForResponse(response => response.url().includes('connections/ping') && response.status() === 200);

        await page.getByTestId('create-connection').click();

        await expect(addConnectionModal).toBeHidden();
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('connection-item-local')).toBeVisible();
    });
   

    test.step('Create a new connection flow', async () => {
        await page.goto('/');

        const addConnectionModal = page.getByText('New connection');
        if (await addConnectionModal.isVisible()) {
            await addConnectionModal.click();
            await expect(page.getByText('New connection')).toBeVisible();
        }
    });
});