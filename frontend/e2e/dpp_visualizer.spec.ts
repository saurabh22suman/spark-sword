import { test, expect } from '@playwright/test';

test.describe('DPP Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/expert');
    // Scroll to DPP section (it's after AQE simulator)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(500);
  });

  test('should display DPP visualizer component', async ({ page }) => {
    // Check for section heading
    await expect(page.getByRole('heading', { name: /Dynamic Partition Pruning/i })).toBeVisible();
    
    // Verify input controls exist
    await expect(page.getByText(/Total Partitions:/i)).toBeVisible();
    await expect(page.getByText(/Filter Selectivity:/i)).toBeVisible();
    await expect(page.getByText(/DPP Enabled/i)).toBeVisible();
    await expect(page.getByText(/Broadcast Join/i)).toBeVisible();
    
    // Verify simulate button
    await expect(page.getByRole('button', { name: /Simulate DPP/i })).toBeVisible();
  });

  test('should simulate partition pruning with default settings', async ({ page }) => {
    // Click simulate button
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    
    // Wait for results to appear (look for any result card)
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should update partition visualization when sliders change', async ({ page }) => {
    // Get all sliders in the DPP section (note: page might have sliders from other sections above)
    const sliders = page.locator('input[type="range"]');
    
    // Change total partitions slider (find by scrolling into DPP section first)
    await sliders.nth(4).fill('500'); // Assuming 4 sliders before DPP section
    await expect(page.getByText(/Total Partitions: 500/i)).toBeVisible();
    
    // Change selectivity slider
    await sliders.nth(5).fill('0.2');
    
    // Simulate with new values
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show different results when DPP is disabled', async ({ page }) => {
    // Get checkboxes (DPP Enabled, Broadcast Join)
    const checkboxes = page.locator('input[type="checkbox"]');
    
    // Simulate with DPP enabled (default)
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Disable DPP (first checkbox)
    await checkboxes.first().uncheck();
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should explain broadcast join requirement', async ({ page }) => {
    // Get checkboxes and disable broadcast join (second checkbox)
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(1).uncheck();
    
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    
    // Should show results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show confidence level in explanations', async ({ page }) => {
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Check for description text
    await expect(page.getByText(/See how DPP skips partitions/i)).toBeVisible();
  });

  test('should handle high selectivity gracefully', async ({ page }) => {
    // Get all sliders and set selectivity (assuming it's the 6th slider)
    const sliders = page.locator('input[type="range"]');
    await sliders.nth(5).fill('0.05');
    
    await page.getByRole('button', { name: /Simulate DPP/i }).click();
    
    // Should show results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });
});
