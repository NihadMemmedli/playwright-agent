import { test, expect } from '@playwright/test';

test.describe('E-commerce Shopping Workflow', () => {
  test('Add Samsung galaxy s6 to cart and verify', async ({ page }) => {
    // Navigate to homepage
    await page.goto('https://demoblaze.com');

    // Navigate to product page
    await test.step('Navigate to Samsung galaxy s6 product page', async () => {
      await page.goto('https://demoblaze.com/prod.html?idp_=1');
    });

    // Verify product page loaded
    await test.step('Verify product page loads with product name', async () => {
      // Wait for product name to be visible
      await page.waitForSelector('h2', { timeout: 5000 });
      const productName = await page.getByRole('heading', { name: 'Samsung galaxy s6', level: 2 }).textContent();
      expect(productName).toBe('Samsung galaxy s6');
    });

    // Add product to cart
    await test.step('Add product to cart', async () => {
      // Handle the alert that appears when adding to cart
      const dialogPromise = page.waitForEvent('dialog');
      await page.getByRole('link', { name: 'Add to cart' }).click();
      const dialog = await dialogPromise;
      expect(dialog.message()).toContain('Product added');
      await dialog.accept();

      // Wait a moment for the cart to be updated
      await page.waitForTimeout(500);
    });

    // Navigate to cart
    await test.step('Navigate to cart', async () => {
      await page.getByRole('link', { name: 'Cart', exact: true }).click();
    });

    // Verify cart page
    await test.step('Verify cart page displays', async () => {
      const cartHeading = await page.getByRole('heading', { name: 'Products', level: 2 }).textContent();
      expect(cartHeading).toBe('Products');
    });

    // Verify product in cart
    await test.step('Verify product name is visible in cart', async () => {
      // Wait for cart table to load (data loads asynchronously)
      // The cart loads via AJAX, so we need to wait for the product row to appear
      await page.waitForSelector('tbody tr', { state: 'visible', timeout: 10000 });

      // Use locator with CSS selector since td elements don't have role="cell"
      const cartProductName = await page.locator('tbody tr td:nth-child(2)').textContent();
      expect(cartProductName).toBe('Samsung galaxy s6');
    });

    // Take screenshot for visual verification
    await page.screenshot({ path: 'screenshot_cart_page.png' });
  });
});