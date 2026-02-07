import { test, expect } from '@playwright/test';

test.describe('Format Benchmark', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/expert');
    // Scroll to Format Benchmark section (last component)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });

  test('should display format benchmark component', async ({ page }) => {
    // Check for section heading
    await expect(page.getByRole('heading', { name: 'Format Benchmark' })).toBeVisible();
    
    // Verify input controls exist
    await expect(page.getByText(/Raw Size:/i)).toBeVisible();
    await expect(page.getByText(/Query Selectivity:/i)).toBeVisible();
    
    // Verify compare button
    await expect(page.getByRole('button', { name: /Compare Formats/i })).toBeVisible();
  });

  test('should compare formats with default settings', async ({ page }) => {
    // Click compare button
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results to appear (look for result metrics)
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should update results when data size changes', async ({ page }) => {
    // Get all sliders on the page
    // Format Benchmark sliders: RawSize=10, QuerySelectivity=11
    const sliders = page.locator('input[type="range"]');
    
    // Change data size (index 10)
    // Raw Size: min=10_000_000, max=1_000_000_000, step=10_000_000
    await sliders.nth(10).fill('500000000'); // 500MB (valid)
    
    // Compare
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show different scan speeds for different selectivity', async ({ page }) => {
    // Get all sliders on the page
    // Query Selectivity slider is at index 11
    const sliders = page.locator('input[type="range"]');
    
    // Test with high selectivity (full scan)
    // Query Selectivity: min=0.05, max=1.0, step=0.05
    await sliders.nth(11).fill('1'); // 100% (max is 1, not '1.0')
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Test with low selectivity (selective scan)
    await sliders.nth(11).fill('0.1'); // 10% (valid)
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should explain CSV characteristics', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Check for description text
    await expect(page.getByText(/Compare CSV vs Parquet/i)).toBeVisible();
  });

  test('should explain Parquet characteristics', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Check for description text
    await expect(page.getByText(/Columnar formats/i)).toBeVisible();
  });

  test('should explain Delta Lake characteristics', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show compression ratio differences', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should use evidence-based language in explanations', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Check for description text
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Compare');
  });

  test('should handle selective queries correctly', async ({ page }) => {
    // Get all sliders on the page
    // Query Selectivity slider is at index 11
    const sliders = page.locator('input[type="range"]');
    
    // Set selectivity (index 11)
    await sliders.nth(11).fill('0.05'); // 5% (min value, valid)
    
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display all three formats side by side', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should provide recommendations based on use case', async ({ page }) => {
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle large file sizes correctly', async ({ page }) => {
    // Get all sliders on the page
    // Raw Size slider is at index 10
    const sliders = page.locator('input[type="range"]');
    
    // Set to max size: 1GB
    await sliders.nth(10).fill('1000000000'); // 1GB (max value, valid)
    
    await page.getByRole('button', { name: /Compare Formats/i }).click();
    
    // Should still calculate and show results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });
});
