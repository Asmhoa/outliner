import { test, expect } from '@playwright/test';

test.describe('Left Sidebar', () => {
  test('should be visible on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    const leftSidebar = page.locator('nav');
    await expect(leftSidebar).toBeVisible();
  });
});
