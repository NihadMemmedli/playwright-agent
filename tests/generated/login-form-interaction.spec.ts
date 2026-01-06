import { test, expect } from '@playwright/test';

test.describe('Login Form Interaction', () => {
  test('should successfully login to secure area', async ({ page }) => {
    // Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login');
      await page.waitForLoadState('networkidle');
    });

    // Enter username
    await test.step('Enter username', async () => {
      await page.getByLabel('Username').fill('tomsmith');
    });

    // Enter password
    await test.step('Enter password', async () => {
      await page.getByLabel('Password').fill('SuperSecretPassword!');
    });

    // Click Login button
    await test.step('Click Login button', async () => {
      await page.getByRole('button', { name: 'Login' }).click();
    });

    // Verify success message appears
    await test.step('Verify success message appears', async () => {
      await expect(page.getByText('You logged into a secure area!')).toBeVisible({ timeout: 10000 });
    });

    // Verify URL remains on login page (no redirect)
    await test.step('Verify URL remains on login page', async () => {
      await expect(page).toHaveURL('https://the-internet.herokuapp.com/login');
    });

    // Verify logout button is visible
    await test.step('Verify logout button is visible', async () => {
      await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
    });
  });
});