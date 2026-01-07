import { test, expect } from '@playwright/test';

test.describe('Visual Regression Test', () => {
  test('captures full page screenshot for visual regression', async ({ page }) => {
    // Navigate to example.com
    await test.step('Navigate to example.com', async () => {
      await page.goto('https://example.com');
      await page.waitForLoadState('networkidle');
    });

    // Capture visual layout of the page for regression testing
    await test.step('Capture visual layout of the page', async () => {
      await expect(page).toHaveScreenshot({ fullPage: true });
    });
  });
});