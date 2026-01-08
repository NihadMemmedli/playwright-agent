import { test, expect } from '@playwright/test';

test.describe('UI Controls (Checkboxes & Dropdowns)', () => {
  test('checkbox toggling and dropdown selection', async ({ page }) => {
    // Test checkbox interactions
    await test.step('Navigate to checkboxes page and verify heading', async () => {
      await page.goto('https://the-internet.herokuapp.com/checkboxes');
      await expect(page.getByText('Checkboxes')).toBeVisible();
    });

    await test.step('Toggle checkboxes', async () => {
      // Check checkbox 1
      await page.getByRole('checkbox').first().check();
      
      // Uncheck checkbox 2
      await page.getByRole('checkbox').nth(1).uncheck();
    });

    await test.step('Verify checkbox states', async () => {
      // Verify checkbox 1 is checked
      const checkbox1 = page.locator('input[type="checkbox"]').first();
      await expect(checkbox1).toBeChecked();
      
      // Verify checkbox 2 is unchecked
      const checkbox2 = page.locator('input[type="checkbox"]').nth(1);
      await expect(checkbox2).not.toBeChecked();
    });

    // Test dropdown interactions
    await test.step('Navigate to dropdown page and verify heading', async () => {
      await page.goto('https://the-internet.herokuapp.com/dropdown');
      await expect(page.getByText('Dropdown List')).toBeVisible();
    });

    await test.step('Select Option 1 from dropdown', async () => {
      const dropdown = page.locator('#dropdown');
      await dropdown.selectOption('1');
      
      // Verify Option 1 is selected
      await expect(dropdown).toHaveValue('1');
    });

    await test.step('Select Option 2 from dropdown', async () => {
      const dropdown = page.locator('#dropdown');
      await dropdown.selectOption('2');
      
      // Verify Option 2 is selected
      await expect(dropdown).toHaveValue('2');
    });
  });
});
