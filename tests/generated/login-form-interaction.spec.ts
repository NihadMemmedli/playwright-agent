import { test, expect } from '@playwright/test';

test.describe('Login Form Interaction', () => {
  test('should log in with valid credentials and redirect to secure area', async ({ page }) => {
    // Navigate to login page
    await test.step('Go to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login');
    });

    // Enter username
    await test.step('Enter username', async () => {
      await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');
    });

    // Enter password
    await test.step('Enter password to the page', async () => {
      await page.getByRole('textbox', { name: 'Password' }).fill('SuperSecretPassword!');
    });

    // Click login button
    await test.step('Click the Login button', async () => {
      await page.getByRole('button', { name: '\uf090 Login' }).click();
    });

    // Verify success message appears
    await test.step('Verify success message appears', async () => {
      await expect(page.getByText('You logged into a secure area!')).toBeVisible();
    });

    // Verify redirected to secure page
    await test.step('Verify redirected to secure page', async () => {
      expect(page.url()).toContain('/secure');
    });
  });
});
