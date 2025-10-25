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

  test('should add, edit, and delete a workspace', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await page.getByTestId('add-workspace-button').click();

    await expect(page.getByText('Create New Workspace')).toBeVisible();

    const workspaceName = `WS${Date.now().toString().slice(-5)}`;
    await page.getByLabel('Workspace Name').fill(workspaceName);
    await page.getByRole('button', { name: 'Create Workspace' }).click();

    await expect(page.getByRole('tab', { name: workspaceName })).toBeVisible();

    // Edit the workspace
    await page.getByRole('tab', { name: workspaceName }).dblclick();
    await expect(page.getByText('Edit Workspace')).toBeVisible();

    const updatedWorkspaceName = `WS${Date.now().toString().slice(-5)}`;
    await page.getByLabel('Workspace Name').fill(updatedWorkspaceName);
    await page.getByLabel('Workspace Color').fill('#fa5252');
    await page.getByLabel('Workspace Name').click(); // Close the color picker
    await page.getByRole('button', { name: 'Update Workspace' }).click();

    await expect(
      page.getByRole('tab', { name: updatedWorkspaceName }),
    ).toBeVisible();

    // Delete the workspace
    await page.getByRole('tab', { name: updatedWorkspaceName }).dblclick();
    await expect(page.getByText('Edit Workspace')).toBeVisible();
    await page.getByRole('button', { name: 'Delete Workspace' }).click();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    await expect(
      page.getByRole('tab', { name: updatedWorkspaceName }),
    ).not.toBeVisible();
  });
});
