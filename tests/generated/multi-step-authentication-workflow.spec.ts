import { test, expect } from '@playwright/test';

/**
 * Multi-Step Authentication Workflow Test
 * 
 * This test verifies the complete authentication cycle:
 * 1. Navigate to homepage and access login
 * 2. Submit valid credentials
 * 3. Verify secure area access
 * 4. Logout and return to login page
 */
test.describe('Multi-Step Authentication Workflow', () => {
  test('should complete full authentication cycle: login, verify secure area, logout', async ({ page }) => {
    
    // Step 1: Navigate to the homepage
    await test.step('Navigate to homepage', async () => {
      await page.goto('https://the-internet.herokuapp.com');
    });

    // Step 2: Access the Form Authentication page
    await test.step('Click Form Authentication link', async () => {
      await page.getByRole('link', { name: 'Form Authentication' }).click();
    });

    // Step 3: Verify we're on the login page
    await test.step('Verify login page is displayed', async () => {
      const heading = page.locator('h2');
      await expect(heading).toContainText('Login Page');
    });

    // Step 4-5: Fill in login credentials
    await test.step('Enter username and password', async () => {
      await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');
      await page.getByRole('textbox', { name: 'Password' }).fill('SuperSecretPassword!');
    });

    // Step 6: Submit the login form
    await test.step('Click Login button', async () => {
      await page.getByRole('button', { name: '\uf090 Login' }).click();
    });

    // Step 7-8: Verify successful login and secure area access
    await test.step('Verify secure page is loaded', async () => {
      await expect(page).toHaveURL(/.*\/secure/);
      
      const welcomeMessage = page.locator('h4');
      await expect(welcomeMessage).toContainText('Welcome to the Secure Area');
    });

    // Step 9: Logout from the secure area
    await test.step('Click Logout button', async () => {
      await page.getByRole('link', { name: 'Logout' }).click();
    });

    // Step 10-11: Verify return to login page
    await test.step('Verify return to login page', async () => {
      await expect(page).toHaveURL(/.*\/login/);
      
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    });
  });
});
