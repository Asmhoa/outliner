import { test, expect } from "@playwright/test";

test.describe("Page Navigation", () => {
  const page1Title = `Test Page 1 - ${Date.now()}`;
  const page2Title = `Test Page 2 - ${Date.now() + 1}`;

  test.beforeEach(async ({ page }) => {
    await page.goto("/db/playwright_test_db");
    await expect(page.getByTestId("add-page-button")).toBeVisible();
  });

  test("should switch between pages when navigating to different URLs", async ({ page }) => {
    // Create two pages
    await page.getByTestId("add-page-button").click();
    await page.getByLabel("Page Title").fill(page1Title);
    await page.getByRole("button", { name: "Create Page" }).click();
    // Wait for the page to appear in the sidebar and click it to navigate
    const page1Link = page.getByTestId("left-sidebar").getByText(page1Title);
    await expect(page1Link).toBeVisible();
    await page1Link.click();
    await expect(page).toHaveURL(new RegExp(`/db/playwright_test_db/pages/.*`));
    await expect(page.getByRole("heading", { name: page1Title })).toBeVisible();

    await page.getByTestId("add-page-button").click();
    await page.getByLabel("Page Title").fill(page2Title);
    await page.getByRole("button", { name: "Create Page" }).click();
    // Wait for the page to appear in the sidebar and click it to navigate
    const page2Link = page.getByTestId("left-sidebar").getByText(page2Title);
    await expect(page2Link).toBeVisible();
    await page2Link.click();
    await expect(page).toHaveURL(new RegExp(`/db/playwright_test_db/pages/.*`));
    await expect(page.getByRole("heading", { name: page2Title })).toBeVisible();

    // Navigate to the first page
    await page1Link.click();
    await expect(page).toHaveURL(new RegExp(`/db/playwright_test_db/pages/.*`));
    await expect(page.getByRole("heading", { name: page1Title })).toBeVisible();

    // Navigate to the second page
    await page2Link.click();
    await expect(page).toHaveURL(new RegExp(`/db/playwright_test_db/pages/.*`));
    await expect(page.getByRole("heading", { name: page2Title })).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Delete the pages
    // Navigate to the first page to delete it
    const page1Link = page.getByTestId("left-sidebar").getByText(page1Title);
    await expect(page1Link).toBeVisible();
    await page1Link.click();
    await page.getByTestId("page-menu-button").click();
    await page.getByRole("menuitem", { name: "Delete page" }).click();
    await expect(page.getByRole("heading", { name: page1Title })).not.toBeVisible();

    // Navigate to the second page to delete it
    const page2Link = page.getByTestId("left-sidebar").getByText(page2Title);
    await expect(page2Link).toBeVisible();
    await page2Link.click();
    await page.getByTestId("page-menu-button").click();
    await page.getByRole("menuitem", { name: "Delete page" }).click();
    await expect(page.getByRole("heading", { name: page2Title })).not.toBeVisible();
  });
});
