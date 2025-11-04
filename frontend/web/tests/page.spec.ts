import { test, expect } from "./test-fixtures";
import { getPagesDbDbIdPagesGet } from "../src/api-client";

test.describe("Page Navigation", () => {
  const page1Title = `Test Page 1 - ${Date.now()}`;
  const page2Title = `Test Page 2 - ${Date.now() + 1}`;
  let page1Id: string | undefined;
  let page2Id: string | undefined;

  test.beforeEach(async ({ page, dbId }) => {
    await page.goto(`/db/${dbId}`);
    await expect(page.getByTestId("add-page-button")).toBeVisible();
  });

  test("should switch between pages when navigating to different URLs", async ({
    page,
    dbId,
  }) => {
    // Create a page (stay on base URL)
    await page.getByTestId("add-page-button").click();
    await page.getByLabel("Page Title").fill(page1Title);
    await page.getByRole("button", { name: "Create Page" }).click();
    
    // Wait for the page to appear in the sidebar
    await expect(page.getByTestId("left-sidebar").getByText(page1Title)).toBeVisible();
    
    // Create another different page (stay on base URL)
    await page.getByTestId("add-page-button").click();
    await page.getByLabel("Page Title").fill(page2Title);
    await page.getByRole("button", { name: "Create Page" }).click();
    
    // Wait for the page to appear in the sidebar
    await expect(page.getByTestId("left-sidebar").getByText(page2Title)).toBeVisible();

    // Get all pages using the API to get their IDs
    const pagesResponse = await getPagesDbDbIdPagesGet({ path: { db_id: dbId } });
    if (pagesResponse.data) {
      const page1 = pagesResponse.data.find(p => p.title === page1Title);
      const page2 = pagesResponse.data.find(p => p.title === page2Title);
      if (page1) page1Id = page1.page_id;
      if (page2) page2Id = page2.page_id;
    }

    // Navigate to URL for page 1
    await page.goto(`/db/${dbId}/pages/${page1Id}`);
    await expect(page.getByRole("heading", { name: page1Title })).toBeVisible();

    // Navigate to URL for page 2
    await page.goto(`/db/${dbId}/pages/${page2Id}`);
    await expect(page.getByRole("heading", { name: page2Title })).toBeVisible();
  });

  test.afterEach(async ({ page, dbId }) => {
    // Clean up by navigating to each page and deleting it
    if (page1Id) {
      try {
        await page.goto(`/db/${dbId}/pages/${page1Id}`);
        await page.getByTestId("page-menu-button").click();
        await page.getByRole("menuitem", { name: "Delete page" }).click();
      } catch (e) {
        // If page doesn't exist or can't be deleted, continue
      }
    }
    
    if (page2Id) {
      try {
        await page.goto(`/db/${dbId}/pages/${page2Id}`);
        await page.getByTestId("page-menu-button").click();
        await page.getByRole("menuitem", { name: "Delete page" }).click();
      } catch (e) {
        // If page doesn't exist or can't be deleted, continue
      }
    }
  });
});
