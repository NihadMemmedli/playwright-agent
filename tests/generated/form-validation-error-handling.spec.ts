import { test, expect } from '@playwright/test';

/**
 * Form Validation Error Handling Test
 * 
 * Tests various login form validation scenarios:
 * - Empty username and password fields
 * - Username only (missing password)
 * - Wrong password with correct username
 * 
 * Verifies appropriate error messages are displayed for each scenario.
 */
test.describe('Form Validation Error Handling', () => {
  test('should display appropriate error messages for invalid login attempts', async ({ page }) => {
    // Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle' });
    });

    // Verify login form is visible
    await test.step('Verify login form is visible', async () => {
      await expect(page.getByRole('heading', { name: 'Login Page' })).toBeVisible();
    });

    // Scenario 1: Empty fields
    await test.step('Test with empty username and password', async () => {
      // Leave both fields empty
      await page.getByRole('textbox', { name: 'Username' }).fill('');
      await page.getByRole('textbox', { name: 'Password' }).fill('');

      // Click login button
      await page.getByRole('button', { name: 'Login' }).click();

      // Verify error message for empty fields
      await expect(page.getByText('Your username is invalid!')).toBeVisible();
    });

    // Scenario 2: Username only (missing password)
    await test.step('Test with username only', async () => {
      // Enter username only
      await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');

      // Click login button
      await page.getByRole('button', { name: 'Login' }).click();

      // Verify error message still appears
      await expect(page.getByText('Your password is invalid!')).toBeVisible();
    });

    // Scenario 3: Wrong password
    await test.step('Test with correct username but wrong password', async () => {
      // Enter correct username and wrong password
      await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');
      await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');

      // Click login button
      await page.getByRole('button', { name: 'Login' }).click();

      // Verify error message indicates invalid credentials
      await expect(page.getByText('Your password is invalid!')).toBeVisible();
    });

    // Take screenshot of final error state
    await test.step('Capture error state', async () => {
      await page.screenshot({ path: 'screenshot_error_state.png' });
    });
  });
});