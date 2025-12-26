import { test as base, expect } from "@playwright/test";

// Define a custom fixture to get the database ID by name
const test = base.extend<{
  dbId: string;
}>({
  // Define the dbId fixture that will be available to all tests
  dbId: async ({ page }, use) => {
    // Create a new database if needed (or use existing)
    // For now, we assume the test setup has already created the database

    // Get all databases and find the ID for 'playwright_test_db'
    // Using the backend API server which should be running on port 8000
    const response = await page.request.get("http://127.0.0.1:8001/databases");
    const databases = await response.json();

    // Find the database with name 'playwright_test_db'
    const testDb = databases.find(
      (db: any) => db.name === "playwright_test_db",
    );

    if (!testDb) {
      throw new Error(
        "Test database 'playwright_test_db' not found. Please run test setup first.",
      );
    }

    // Use the database ID in the tests
    await use(testDb.id);
  },
});

export { test, expect };
