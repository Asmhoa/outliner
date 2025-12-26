import { test, expect } from "./test-fixtures";
import { getPagesDbDbIdPagesGet, addPageDbDbIdPagesPost, deletePageDbDbIdPagesPageIdDelete } from "../src/api-client";

test.describe("All Pages View", () => {
  test.beforeEach(async ({ page, dbId }) => {
    // Clean up all existing pages before each test
    const response = await getPagesDbDbIdPagesGet({ path: { db_id: dbId } });
    if (response.data) {
      for (const page of response.data) {
        await deletePageDbDbIdPagesPageIdDelete({
          path: { db_id: dbId, page_id: page.page_id }
        });
      }
    }

    // Navigate to the all pages view
    await page.goto(`/db/${dbId}/all-pages`);
  });

  test("shows 'No pages found' when there are 0 pages", async ({ page, dbId }) => {
    // Verify we're on the all pages route
    await expect(page).toHaveURL(new RegExp(`/db/${dbId}/all-pages`));
    
    // Wait for the page to load and check for the "No pages found" message
    await expect(page.getByText("No pages found in this database.")).toBeVisible();
    
    // Also verify that we see the correct count "0 pages in this database"
    await expect(page.getByText("0 pages in this database")).toBeVisible();
    
    // Verify that the title is "All Pages"
    await expect(page.getByRole("heading", { name: "All Pages" })).toBeVisible();
  });

  test("shows 1 page when there is 1 page", async ({ page, dbId }) => {
    // First, create a page using the API
    const pageTitle = `Test Page - ${Date.now()}`;
    const response = await addPageDbDbIdPagesPost({
      path: { db_id: dbId },
      body: { title: pageTitle }
    });
    
    expect(response.error).toBeUndefined();
    expect(response.data?.page_id).toBeDefined();
    
    const pageId = response.data?.page_id as string;
    
    // Navigate to the all pages view
    await page.goto(`/db/${dbId}/all-pages`);
    
    // Wait for the page to load and check for the page in the grid
    await expect(page.getByText(pageTitle)).toBeVisible();
    
    // Verify that we see the correct count "1 page in this database"
    await expect(page.getByText("1 page in this database")).toBeVisible();
    
    // Verify that the title is "All Pages"
    await expect(page.getByRole("heading", { name: "All Pages" })).toBeVisible();
    
    // Verify the page card is visible - find the Paper component containing the page title
    const pageCard = page.locator(".mantine-Paper-root").filter({ hasText: pageTitle }).first();
    await expect(pageCard).toBeVisible();
    
    // Click on the page card to navigate to that page
    await pageCard.click();
    
    // Verify we've navigated to the correct page
    await expect(page).toHaveURL(new RegExp(`/db/${dbId}/pages/${pageId}`));
    await expect(page.getByRole("heading", { name: pageTitle })).toBeVisible();
  });

  test("shows multiple pages when there are multiple pages", async ({ page, dbId }) => {
    // Create multiple pages using the API
    const pageTitle1 = `Test Page 1 - ${Date.now()}`;
    const pageTitle2 = `Test Page 2 - ${Date.now() + 1}`;
    
    const response1 = await addPageDbDbIdPagesPost({
      path: { db_id: dbId },
      body: { title: pageTitle1 }
    });
    
    const response2 = await addPageDbDbIdPagesPost({
      path: { db_id: dbId },
      body: { title: pageTitle2 }
    });
    
    expect(response1.error).toBeUndefined();
    expect(response1.data?.page_id).toBeDefined();
    expect(response2.error).toBeUndefined();
    expect(response2.data?.page_id).toBeDefined();
    
    // Navigate to the all pages view
    await page.goto(`/db/${dbId}/all-pages`);
    
    // Wait for the page to load and check for both pages in the grid
    await expect(page.getByText(pageTitle1)).toBeVisible();
    await expect(page.getByText(pageTitle2)).toBeVisible();
    
    // Verify that we see the correct count "2 pages in this database"
    await expect(page.getByText("2 pages in this database")).toBeVisible();
    
    // Verify that the title is "All Pages"
    await expect(page.getByRole("heading", { name: "All Pages" })).toBeVisible();
  });
});