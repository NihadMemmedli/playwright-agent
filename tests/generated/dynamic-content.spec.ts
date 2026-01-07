import { test, expect } from '@playwright/test';

test.describe('Dynamic Content Loading', () => {
  test('should load and display Hello World text after clicking Start', async ({ page }) => {
    // Navigate to the dynamic loading page
    await test.step('Navigate to dynamic loading page', async () => {
      await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');
    });

    // Verify that Hello World text is NOT visible initially
    await test.step('Verify Hello World text is not visible initially', async () => {
      const finishElement = page.locator('#finish');
      await expect(finishElement).not.toBeVisible();
    });

    // Click the Start button to trigger dynamic content loading
    await test.step('Click Start button to load content', async () => {
      await page.getByRole('button', { name: 'Start' }).click();
    });

    // Wait for the loading indicator to disappear and Hello World to appear
    await test.step('Wait for loading to complete and Hello World to appear', async () => {
      const finishElement = page.locator('#finish');
      // Wait for the finish element to become visible with increased timeout
      await expect(finishElement).toBeVisible({ timeout: 10000 });
    });

    // Verify that Hello World text appears after loading completes
    await test.step('Verify Hello World text is now visible', async () => {
      const finishElement = page.locator('#finish');
      await expect(finishElement).toContainText('Hello World!');
    });
  });
});
