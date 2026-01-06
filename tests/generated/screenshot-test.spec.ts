import { test, expect } from '@playwright/test';

test.describe('Screenshot Test', () => {
  test('Screenshot Test', async ({ page }) => {
    // Step 1: Navigate to example.com
    await test.step('Navigate to example.com', async () => {
      await page.goto('https://example.com');
    });

    // Step 2: Take a screenshot of the page
    await test.step('Take a screenshot of the page', async () => {
      await page.screenshot({ fullPage: true });
    });

    // Step 3: Verify the title contains 'Example'
    await test.step('Verify the title contains \'Example\'', async () => {
      await expect(page).toHaveTitle(/Example/);
    });

    // Step 4: Take another screenshot
    await test.step('Take another screenshot', async () => {
      await page.screenshot({ fullPage: true });
    });
  });
});
