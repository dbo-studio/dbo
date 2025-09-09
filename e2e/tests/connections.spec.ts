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

    await test.step('Switch to the first connection', async () => {
        await page.waitForTimeout(1000);
        await page.getByTestId('connection-item-local').click();

        await expect(page.getByRole('heading', { name: 'local | postgresql 16.1 : SQL' })).toBeVisible();
    });

    await test.step('Show connection context menu', async () => {
        await page.waitForTimeout(1000);

        await page.getByTestId('connection-item-local2').click({ button: 'right' });

        await expect(page.getByRole("menu").getByRole("menuitem", { name: "Edit" })).toBeVisible();
        await expect(page.getByRole("menu").getByRole("menuitem", { name: "Delete" })).toBeVisible();
        await expect(page.getByRole("menu").getByRole("menuitem", { name: "Refresh" })).toBeVisible();

        await page.locator('.MuiBackdrop-root').click()
    });

    await test.step("Edit the second connection", async () => {
        await page.waitForTimeout(1000);

        await page.getByTestId('connection-item-local2').click({ button: 'right' });
        await page.getByRole("menu").getByRole("menuitem", { name: "Edit" }).click();
        
        await expect(page.getByText('Edit connection')).toBeVisible();

        await expect(page.locator('input[name="name"]')).toHaveValue("local2");
        await expect(page.locator('input[name="host"]')).toHaveValue("sample-pgsql");
        await expect(page.locator('input[name="port"]')).toHaveValue("5432");
        await expect(page.locator('input[name="username"]')).toHaveValue("default");

        await page.locator('input[name="name"]').fill("local2-edited");

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
        await expect(page.getByTestId('connection-item-local2-edited')).toBeVisible();
    })

    await test.step('Delete the second connection', async () => {
        await page.waitForTimeout(2000);

        await page.getByTestId('connection-item-local2-edited').click({ button: 'right' });
        await page.getByRole("menu").getByRole("menuitem", { name: "Delete" }).click();
        
        await expect(page.getByRole("menu").getByRole("menuitem", { name: "Delete" })).toBeHidden();
        await expect(page.getByRole('heading', { name: 'Delete action!' })).toBeVisible()
        page.getByRole('button', { name: 'Yes' }).click()
        
        await expect(page.getByTestId('connection-item-local2-edited')).toBeHidden();
    });

    await test.step('Handle refresh connection', async () => {
        await page.waitForTimeout(2000);

        await page.getByTestId('connection-item-local').click({ button: 'right' });
       
        const refreshConnectionPromise = page.waitForResponse(response => 
            response.url().includes('connections') && response.status() === 200,
            { timeout: 10000 }
        );
        
        await page.getByRole("menu").getByRole("menuitem", { name: "Refresh" }).click();
        await refreshConnectionPromise;
    });
});