import { test, expect } from './test-fixtures';

test.describe('DatabaseSelector', () => {
  test('should create a new database and switch between databases', async ({ page, dbId }) => {
    // Navigate to the application with the initial database
    await page.goto(`/db/${dbId}`);
    
    // Wait for the page to load completely
    await expect(page.getByRole('banner')).toBeVisible();
    
    // Find and click the DatabaseSelector button to open the dropdown menu
    const databaseSelectorButton = page.locator('button').filter({ hasText: 'playwright_test_db' }).first();
    await expect(databaseSelectorButton).toBeVisible();
    await databaseSelectorButton.click();
    
    // Verify that the dropdown menu is open and contains the "Create New Database" option
    const createDatabaseOption = page.getByText('Create New Database');
    await expect(createDatabaseOption).toBeVisible();
    
    // Click the "Create New Database" option to open the modal
    await createDatabaseOption.click();
    
    // Wait for the modal to appear
    const modal = page.getByRole('dialog', { name: 'Create a new database' });
    await expect(modal).toBeVisible();
    
    // Fill in the database name in the input field
    const databaseNameInput = page.getByLabel('Database Name');
    await expect(databaseNameInput).toBeVisible();
    const newDatabaseName = `Test Database ${Date.now()}`;
    await databaseNameInput.fill(newDatabaseName);
    
    // Click the "Create" button
    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    
    // Wait for the modal to disappear and verify navigation to the new database
    await expect(modal).not.toBeVisible();

    // Wait for navigation to the new database and verify the URL contains the new database ID
    // The new database should be created and we should be navigated to it
    await page.waitForURL('**/db/**');
    const newUrl = page.url();
    expect(newUrl).toMatch(/\/db\/[a-zA-Z0-9-]+/); // Should match /db/{dbId}

    // Wait a moment for the UI to update with the new database
    await page.waitForTimeout(500);

    // Redefine the database selector button as it now shows the new database name
    const newDatabaseSelectorButton = page.locator('button').filter({ hasText: newDatabaseName }).first();
    await expect(newDatabaseSelectorButton).toBeVisible();

    // Click the DatabaseSelector again to open the dropdown and verify the new database exists
    await newDatabaseSelectorButton.click();

    // The new database should appear in the list of databases and be selected
    const newDatabaseMenuItem = page.getByText(newDatabaseName);
    await expect(newDatabaseMenuItem).toBeVisible();

    // Find the button text to confirm it shows the new database name
    const updatedDatabaseSelectorButton = page.locator('button').filter({ hasText: newDatabaseName }).first();
    await expect(updatedDatabaseSelectorButton).toBeVisible();
    
    // Click on the original database to switch back to it
    const originalDatabaseMenuItem = page.getByText('playwright_test_db');  // The original test database name from fixtures
    await expect(originalDatabaseMenuItem).toBeVisible();
    await originalDatabaseMenuItem.click();

    // Wait for navigation and verify we're back on the original database
    await page.waitForURL(`**/db/${dbId}`);
    const finalUrl = page.url();
    expect(finalUrl).toContain(`/db/${dbId}`);

    // Wait briefly for UI to update after switching
    await page.waitForTimeout(300);

    // Verify the database selector button now shows the original database name again
    const originalDatabaseSelectorButton = page.locator('button').filter({ hasText: 'playwright_test_db' }).first();
    await expect(originalDatabaseSelectorButton).toBeVisible();
  });
});