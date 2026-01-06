import { test, expect } from '@playwright/test';

test.describe('Complex Healing Test', () => {
  test('Complex Healing Test', async ({ page }) => {
    // Step 1: Navigate to dynamic loading page
    await test.step('Navigate to dynamic loading page', async () => {
      await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');
    });

    // Step 2: Click Start button with selector healing
    await test.step('Click Start button with wrong ID selector', async () => {
      // Healed: Wrong ID to role selector
      await page.getByRole('button', { name: 'Start' }).click();
    });

    // Step 3: Wait for loading bar to disappear
    await test.step('Wait for loading bar to disappear', async () => {
      // Loading bar disappeared after 5s
      await page.waitForTimeout(5000);
    });

    // Step 4: Verify Hello World text appears with selector healing
    await test.step('Verify Hello World text appears with wrong class selector', async () => {
      // Healed: Wrong class to role selector
      await expect(page.getByRole('heading', { name: 'Hello World!' })).toBeVisible();
    });
  });
});
