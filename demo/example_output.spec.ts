import { test, expect } from '@playwright/test';

test.describe('UI Controls (Checkboxes & Dropdowns)', () => {
  test('interacts with checkboxes and dropdown controls', async ({ page }) => {
    // Navigate to checkboxes page
    await test.step('Navigate to checkboxes page', async () => {
      await page.goto('https://the-internet.herokuapp.com/checkboxes');
    });

    // Verify page heading
    await test.step('Verify the heading Checkboxes is visible', async () => {
      await expect(page.locator('h3')).toContainText('Checkboxes');
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

    // Navigate to dropdown page
    await test.step('Navigate to dropdown page', async () => {
      await page.goto('https://the-internet.herokuapp.com/dropdown');
    });

    // Verify dropdown page heading
    await test.step('Verify the heading Dropdown List is visible', async () => {
      await expect(page.locator('h3')).toContainText('Dropdown List');
    });

    // Interact with dropdown - select Option 1
    await test.step('Select Option 1 from the dropdown', async () => {
      await page.locator('#dropdown').selectOption('Option 1');
    });

    // Verify Option 1 is selected
    await test.step('Verify Option 1 is currently selected', async () => {
      const dropdown = page.locator('#dropdown');
      await expect(dropdown).toHaveValue('1');
    });

    // Interact with dropdown - select Option 2
    await test.step('Select Option 2 from the dropdown', async () => {
      await page.locator('#dropdown').selectOption('Option 2');
    });

    // Verify Option 2 is selected
    await test.step('Verify Option 2 is currently selected', async () => {
      const dropdown = page.locator('#dropdown');
      await expect(dropdown).toHaveValue('2');
    });
  });
});
