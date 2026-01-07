import { test, expect } from '@playwright/test';

test.describe('CI Smoke Test (Self-Healing)', () => {
  test('demonstrates self-healing selector recovery', async ({ page }) => {
    // Step 1: Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login');
    });

    // Step 2: Click login button (self-healed from invalid selector)
    await test.step('Click login button using role-based selector', async () => {
      // Note: Original selector was invalid, self-healed to role-based
      await page.getByRole('button', { name: 'Login' }).click();
    });

    // Step 3: Verify login page heading is visible
    await test.step('Verify login page is still visible', async () => {
      const heading = page.locator('h2');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText('Login Page');
    });
  });
});
