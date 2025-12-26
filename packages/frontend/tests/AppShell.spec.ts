import { test, expect } from './test-fixtures';

test('AppShell header is visible', async ({ page, dbId }) => {
  await page.goto(`/db/${dbId}`);
  await expect(page.getByRole('banner')).toBeVisible();
});
