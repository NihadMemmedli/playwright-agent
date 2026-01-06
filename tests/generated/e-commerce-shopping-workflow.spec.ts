import { test, expect } from '@playwright/test';

test.describe('E-commerce Shopping Workflow', () => {
  test('Complete shopping workflow from product selection to cart verification', async ({ page }) => {
    // Step 1: Navigate to the e-commerce site
    await test.step('Navigate to demoblaze.com', async () => {
      await page.goto('https://demoblaze.com');
    });

    // Step 2: Filter to Phones category and select Samsung galaxy s6
    await test.step('Select Phones category and choose Samsung galaxy s6', async () => {
      await page.getByRole('link', { name: 'Phones' }).click();
      await page.getByRole('link', { name: 'Samsung galaxy s6' }).click();
    });

    // Step 3: Verify product page loads with correct product name
    await test.step('Verify product page displays Samsung galaxy s6', async () => {
      await expect(page.getByRole('heading', { name: 'Samsung galaxy s6' })).toBeVisible();
    });

    // Step 4-5: Add product to cart and handle alert confirmation
    await test.step('Add product to cart and confirm success', async () => {
      // Handle the alert dialog that appears after adding to cart
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Product added');
        await dialog.accept();
      });
      
      await page.getByRole('link', { name: 'Add to cart' }).click();
    });

    // Step 6: Navigate to cart
    await test.step('Navigate to cart page', async () => {
      await page.getByRole('link', { name: 'Cart', exact: true }).click();
    });

    // Step 7-8: Verify cart page displays and contains the product
    await test.step('Verify cart displays selected product', async () => {
      await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
      await expect(page.getByText('Samsung galaxy s6')).toBeVisible();
    });

    // Step 9: Capture screenshot of final cart state
    await test.step('Capture cart page screenshot', async () => {
      await page.screenshot({ path: 'cart-confirmation.png' });
    });
  });
});