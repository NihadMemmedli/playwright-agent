import { test, expect } from '@playwright/test';

/**
 * Simple Navigation Test
 * 
 * This test verifies basic navigation to example.com,
 * checks the page title, and captures a screenshot.
 */
test.describe('Simple Navigation', () => {
  test('should navigate to example.com and verify the page title', async ({ page }) => {
    // Step 1: Navigate to example.com
    await test.step('Navigate to example.com', async () => {
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    });

    // Step 2: Verify the page title contains 'Example Domain'
    await test.step('Verify page title contains "Example Domain"', async () => {
      await page.waitForLoadState('domcontentloaded');
      const title = await page.evaluate(() => document.title);
      expect(title).toContain('Example Domain');
    });

    // Step 3: Take a screenshot of the page
    await test.step('Take a screenshot of the page', async () => {
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('simple-navigation-home.png');
    });
  });
});
