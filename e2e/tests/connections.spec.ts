import { expect, test } from '@playwright/test';

test('Connections', async ({page}) => {
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    await page.waitForTimeout(1000);

    await test.step('Create a new connection', async () => {
        await expect(page.getByText('New connection')).toBeVisible();

        await page.getByTestId('selected-connection-PostgreSQL').click();
        await page.getByTestId('select-connection').click();

        await page.locator('input[name="name"]').fill('local');
        await page.locator('input[name="host"]').fill('sample-pgsql');
        await page.locator('input[name="port"]').fill('5432');
        await page.locator('input[name="username"]').fill('default');
        await page.locator('input[name="password"]').fill('secret');

        const testConnectionPromise = page.waitForResponse(response => 
            response.url().includes('connections/ping') && response.status() === 200,
            { timeout: 10000 }
        );
        
        await page.getByTestId('test-connection').click();
        await testConnectionPromise;

        const createConnectionPromise = page.waitForResponse(response => 
            response.url().includes('connections') && response.status() === 200,
            { timeout: 10000 }
        );
        
        await page.getByTestId('create-connection').click();
        await createConnectionPromise;

        await expect(page.getByText('New connection')).toBeHidden();
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('connection-item-local')).toBeVisible();
    });

    await test.step('Create another connection', async () => {
        await page.waitForTimeout(1000);
        
        await page.waitForLoadState('networkidle');

        await page.getByTestId('add-connection').click();
        await expect(page.getByText('New connection')).toBeVisible();

        await page.getByTestId('selected-connection-PostgreSQL').click();
        await page.getByTestId('select-connection').click();

        await page.locator('input[name="name"]').fill('local2');
        await page.locator('input[name="host"]').fill('sample-pgsql');
        await page.locator('input[name="port"]').fill('5432');
        await page.locator('input[name="username"]').fill('default');
        await page.locator('input[name="password"]').fill('secret');

        const testConnectionPromise = page.waitForResponse(response => 
            response.url().includes('connections/ping') && response.status() === 200,
            { timeout: 10000 }
        );
        
        await page.getByTestId('test-connection').click();
        await testConnectionPromise;

        const createConnectionPromise = page.waitForResponse(response => 
            response.url().includes('connections') && response.status() === 200,
            { timeout: 10000 }
        );
        
        await page.getByTestId('create-connection').click();
        await createConnectionPromise;

        await expect(page.getByText('New connection')).toBeHidden();
        await page.waitForTimeout(1000);
        await expect(page.getByTestId('connection-item-local2')).toBeVisible();
    });

    test.step('Switch to the second connection', async () => {
        await page.getByTestId('connection-item-local2').click();
        await expect(page.getByTestId('connection-item-local2')).toBeVisible();

       await expect(page.getByRole('heading', { name: 'local2 | postgresql 16.1 : SQL' })).toBeVisible();
    });
});