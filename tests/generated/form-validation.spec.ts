import { test, expect } from '@playwright/test';

test.describe('Form Validation Error Handling', () => {
  test('should display appropriate error messages for invalid login attempts', async ({ page }) => {
    // Navigate to login page
    await test.step('Navigate to login page', async () => {
      await page.goto('https://the-internet.herokuapp.com/login');
    });

    // Verify login form is visible
    await test.step('Verify login form is visible', async () => {
      await expect(page.getByRole('heading', { name: 'Login Page' })).toBeVisible();
    });

    // Test 1: Submit with empty fields
    await test.step('Submit form with empty fields', async () => {
      await page.getByRole('textbox', { name: 'Username' }).fill('');
      await page.getByRole('textbox', { name: 'Password' }).fill('');
      await page.getByRole('button', { name: '\uf090 Login' }).click();
      
      // Verify error message appears
      const errorElement = page.locator('.flash');
      await expect(errorElement).toBeVisible();
    });

    // Test 2: Submit with username only
    await test.step('Submit form with username only', async () => {
      await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');
      await page.getByRole('button', { name: '\uf090 Login' }).click();
      
      // Verify error still appears
      const errorElement = page.locator('.flash');
      await expect(errorElement).toBeVisible();
    });

    // Test 3: Submit with wrong password
    await test.step('Submit form with wrong password', async () => {
      await page.getByRole('textbox', { name: 'Username' }).fill('tomsmith');
      await page.getByRole('textbox', { name: 'Password' }).fill('wrongpassword');
      await page.getByRole('button', { name: '\uf090 Login' }).click();
      
      // Verify invalid password error message
      const errorElement = page.locator('.flash');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('invalid');
    });

    // Capture screenshot of error state
    await test.step('Capture error state screenshot', async () => {
      await page.screenshot({ path: 'form-validation-error-state.png' });
    });
  });
});
