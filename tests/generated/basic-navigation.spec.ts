import { test, expect } from '@playwright/test';

test.describe('Basic Navigation Test', () => {
  test('should navigate to example.com and verify heading', async ({ page }) => {
    // Step 1: Navigate to example.com
    await test.step('Navigate to example.com', async () => {
      await page.goto('https://example.com');
    });

    // Step 2: Verify the heading is visible
    await test.step('Verify heading visible', async () => {
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText('Example Domain');
    });

    // Step 3: Take screenshot of the page
    await test.step('Take screenshot of the page', async () => {
      await page.screenshot({ path: 'screenshot_1.png' });
    });
  });
});