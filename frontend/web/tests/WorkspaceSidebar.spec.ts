import { test, expect } from '@playwright/test';

test.describe('Workspace Sidebar', () => {
  test('should be hidden when left sidebar is collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    const leftSidebarToggle = page.getByTestId('left-sidebar-toggle');
    const workspaceSidebar = page.getByTestId('workspace-sidebar');

    await expect(workspaceSidebar).toBeVisible();

    await leftSidebarToggle.click();

    await expect(workspaceSidebar).not.toBeVisible();
  });

  test('should have at least one workspace tab visible on load', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    const workspaceTabs = page.getByRole('tab');
    await expect(workspaceTabs.first()).toBeVisible();
  });
});
