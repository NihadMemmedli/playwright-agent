import { test, expect } from '@playwright/test';

test.describe('Healing Test', () => {
  test('Login page interaction with self-healing selector', async ({ page }) => {
    // Step 1: Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login');
    });

    // Step 2: Click login button (self-healed from fake ID selector to role-based)
    await test.step('Click login button with self-healing selector', async () => {
      await page.getByRole('button', { name: ' Login' }).click();
    });

    // Step 3: Verify error message appears
    await test.step('Verify error message appears', async () => {
      // Evaluate page state to confirm error message visibility
      const errorMessageVisible = await page.evaluate(() => {
        const errorElement = document.querySelector('.flash.error');
        return errorElement !== null && window.getComputedStyle(errorElement).display !== 'none';
      });
      expect(errorMessageVisible).toBe(true);
    });
  });
});
