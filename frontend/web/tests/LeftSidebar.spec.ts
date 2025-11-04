import { test, expect } from "./test-fixtures";

test.describe("Left Sidebar", () => {
  test("should be visible on large screens", async ({ page, dbId }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/db/${dbId}`);
    const leftSidebar = page.locator("nav");
    await expect(leftSidebar).toBeVisible();
  });

  test("should be hidden after two clicks on the toggle button", async ({
    page,
    dbId,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/db/${dbId}`);

    const leftSidebarToggle = page.getByTestId("left-sidebar-toggle");
    const leftSidebar = page.getByTestId("left-sidebar");

    // Initially, the sidebar should be in the viewport
    await expect(leftSidebar).toBeInViewport();

    // First click collapses the workspace view, but the main sidebar is still in the viewport
    await leftSidebarToggle.click();
    await expect(leftSidebar).toBeInViewport();

    // Second click collapses the entire sidebar, moving it out of the viewport
    await leftSidebarToggle.click();
    await expect(leftSidebar).not.toBeInViewport();
  });
});
