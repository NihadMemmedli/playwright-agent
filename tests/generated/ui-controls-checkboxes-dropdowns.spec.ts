import { test, expect } from '@playwright/test';

test.describe('UI Controls (Checkboxes & Dropdowns)', () => {
  test('checkbox and dropdown interactions', async ({ page }) => {
    // Navigate to checkboxes page and verify heading
    await test.step('Navigate to checkboxes page', async () => {
      await page.goto('https://the-internet.herokuapp.com/checkboxes');
      await expect(page.getByRole('heading', { name: 'Checkboxes' })).toBeVisible();
    });

    // Interact with checkboxes
    await test.step('Check checkbox 1', async () => {
      await page.getByRole('checkbox').first().check();
    });

    await test.step('Uncheck checkbox 2', async () => {
      await page.getByRole('checkbox').nth(1).uncheck();
    });

    // Verify checkbox states
    await test.step('Verify checkbox 1 is checked', async () => {
      const checkbox1 = page.locator('input[type="checkbox"]').first();
      await expect(checkbox1).toBeChecked();
    });

    await test.step('Verify checkbox 2 is unchecked', async () => {
      const checkbox2 = page.locator('input[type="checkbox"]').nth(1);
      await expect(checkbox2).not.toBeChecked();
    });

    // Navigate to dropdown page and verify heading
    await test.step('Navigate to dropdown page', async () => {
      await page.goto('https://the-internet.herokuapp.com/dropdown');
      await expect(page.getByRole('heading', { name: 'Dropdown List' })).toBeVisible();
    });

    // Select Option 1 from dropdown
    await test.step('Select Option 1 from dropdown', async () => {
      const dropdown = page.locator('#dropdown');
      await dropdown.selectOption('1');
      await expect(dropdown).toHaveValue('1');
    });

    // Select Option 2 from dropdown
    await test.step('Select Option 2 from dropdown', async () => {
      const dropdown = page.locator('#dropdown');
      await dropdown.selectOption('2');
      await expect(dropdown).toHaveValue('2');
    });
  });
});
