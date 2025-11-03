import { test, expect } from '@playwright/test';

test('AppShell header is visible', async ({ page }) => {
  await page.goto('/db/playwright_test_db');
  await expect(page.getByRole('banner')).toBeVisible();
});
