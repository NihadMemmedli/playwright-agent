import { test, expect } from '@playwright/test';

test.describe('Dynamic Content Loading', () => {
  test('should load and display dynamic content after clicking Start', async ({ page }) => {
    // Navigate to the dynamic loading page
    await test.step('Navigate to dynamic loading page', async () => {
      await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');
    });

    // Verify Hello World text is NOT visible initially
    await test.step('Verify Hello World text is not visible initially', async () => {
      const finishElement = page.locator('#finish');
      await expect(finishElement).not.toBeVisible();
    });

    // Click the Start button to trigger dynamic content loading
    await test.step('Click the Start button', async () => {
      await page.getByRole('button', { name: 'Start' }).click();
    });

    // Wait for the loading indicator to disappear
    await test.step('Wait for loading to complete', async () => {
      await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 10000 });
    });

    // Verify Hello World! text appears after loading completes
    await test.step('Verify Hello World! text appears', async () => {
      const finishElement = page.locator('#finish');
      await expect(finishElement).toBeVisible();
      await expect(finishElement).toContainText('Hello World!');
    });

    // Take a screenshot of the final state
    await test.step('Capture final state screenshot', async () => {
      await page.screenshot({ path: 'screenshot_final.png' });
    });
  });
});