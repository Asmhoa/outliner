import { test as base, expect, Locator } from './test-fixtures';

const test = base.extend<{
  workspaceWithLongName: { name: string; locator: Locator };
}>({
  workspaceWithLongName: async ({ page, dbId }, use) => {
    // Set up
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/db/${dbId}`);
    const uniqueId = `WS${Date.now().toString().slice(-5)}`;
    const longWorkspaceName = `${uniqueId} This is a very long workspace name that should overflow`;
    await page.getByTestId('add-workspace-button').click();
    await page.getByLabel('Workspace Name').fill(longWorkspaceName);
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    const workspaceTab = page.getByRole('tab', {
      name: new RegExp(`^${uniqueId}`),
    });
    await expect(workspaceTab).toBeVisible();

    await use({ name: longWorkspaceName, locator: workspaceTab });

    // Tear down
    await workspaceTab.dblclick();
    await expect(page.getByText('Edit Workspace')).toBeVisible();
    await page.getByRole('button', { name: 'Delete Workspace' }).click();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    await expect(workspaceTab).not.toBeVisible();
  },
});

test.describe('Workspace Sidebar', () => {
  test('should be hidden when left sidebar is collapsed', async ({ page, dbId }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/db/${dbId}`);

    const leftSidebarToggle = page.getByTestId('left-sidebar-toggle');
    const workspaceSidebar = page.getByTestId('workspace-sidebar');

    await expect(workspaceSidebar).toBeVisible();

    await leftSidebarToggle.click();

    await expect(workspaceSidebar).not.toBeVisible();
  });

  test('should have at least one workspace tab visible on load', async ({
    page,
    dbId,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/db/${dbId}`);

    const workspaceTabs = page.getByRole('tab');
    await expect(workspaceTabs.first()).toBeVisible();
  });

  test('should add, edit, and delete a workspace', async ({
    page,
    dbId,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/db/${dbId}`);

    const workspaceName = `WS${Date.now().toString().slice(-5)}`;
    let updatedWorkspaceName = ' ';

    try {
      await page.getByTestId('add-workspace-button').click();

      await expect(page.getByText('Create New Workspace')).toBeVisible();

      await page.getByLabel('Workspace Name').fill(workspaceName);
      await page.getByRole('button', { name: 'Create Workspace' }).click();

      await expect(page.getByRole('tab', { name: workspaceName })).toBeVisible();

      // Edit the workspace
      await page.getByRole('tab', { name: workspaceName }).dblclick();
      await expect(page.getByText('Edit Workspace')).toBeVisible();

      updatedWorkspaceName = `WS${Date.now().toString().slice(-5)}`;
      await page.getByLabel('Workspace Name').fill(updatedWorkspaceName);
      await page.getByLabel('Workspace Color').fill('#fa5252');
      await page.getByLabel('Workspace Name').click(); // Close the color picker
      await page.getByRole('button', { name: 'Update Workspace' }).click();

      await expect(
        page.getByRole('tab', { name: updatedWorkspaceName }),
      ).toBeVisible();
    } finally {
      // Delete the workspace
      await page.getByRole('tab', { name: updatedWorkspaceName }).dblclick();
      await expect(page.getByText('Edit Workspace')).toBeVisible();
      await page.getByRole('button', { name: 'Delete Workspace' }).click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await expect(
        page.getByRole('tab', { name: updatedWorkspaceName }),
      ).not.toBeVisible();
    }
  });

  test('should scroll long workspace names on hover', async ({
    page,
    workspaceWithLongName,
  }) => {
    const { name: longWorkspaceName, locator: workspaceTab } =
      workspaceWithLongName;

    // 2. Check for scrolling on hover
    const tabLabel = workspaceTab.locator('span').first();

    // Initially, the text should be truncated and not have the animation.
    const initialName = await tabLabel.innerText();
    expect(initialName).not.toEqual(longWorkspaceName);
    expect(initialName.length).toBeLessThan(longWorkspaceName.length);

    // Hover over the tab
    await workspaceTab.hover();

    // After hover, the full text should be visible in a span with the scroll animation.
    const animatedSpan = workspaceTab.getByText(longWorkspaceName);
    await expect(animatedSpan).toBeVisible();
  });
});
