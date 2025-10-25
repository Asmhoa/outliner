import { test, expect } from '@playwright/test';

test('AppShell header is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
});
