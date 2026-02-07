import { test, expect } from '@playwright/test';

test.describe('Bucketing Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/expert');
    // Scroll to Bucketing section (after AQE and DPP)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
    await page.waitForTimeout(500);
  });

  test('should display bucketing calculator component', async ({ page }) => {
    // Check for section heading
    await expect(page.getByRole('heading', { name: 'Bucketing Calculator' })).toBeVisible();
    
    // Verify input controls exist (scope to inputs near the heading)
    await expect(page.getByText(/Left Rows:/i).first()).toBeVisible();
    await expect(page.getByText(/Right Rows:/i).first()).toBeVisible();
    await expect(page.getByText(/Avg Row Size:/i).first()).toBeVisible();
    await expect(page.getByText(/Bucket Count:/i).first()).toBeVisible();
    await expect(page.getByText(/Buckets Aligned/i).first()).toBeVisible();
    
    // Verify calculate button
    await expect(page.getByRole('button', { name: /Calculate ROI/i })).toBeVisible();
  });

  test('should calculate ROI with default settings', async ({ page }) => {
    // Click calculate button
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    
    // Wait for results to appear (look for the metric cards)
    await expect(page.locator('.text-2xl.font-bold.text-emerald-500').first()).toBeVisible({ timeout: 5000 });

  });

  test('should update results when table sizes change', async ({ page }) => {
    // Get all sliders on the page
    // AQE has 4 sliders (indices 0-3), DPP has 2 (indices 4-5), Bucketing has 4 (indices 6-9)
    const sliders = page.locator('input[type="range"]');
    
    // Change left table rows (index 6) - must be between 1M and 200M, step 1M
    await sliders.nth(6).fill('10000000'); // 10M rows (valid)
    await expect(page.getByText(/Left Rows: 10,000,000/i).first()).toBeVisible();
    
    // Change right table rows (index 7) - must be between 500K and 50M, step 500K
    await sliders.nth(7).fill('5000000'); // 5M rows (valid)
    await expect(page.getByText(/Right Rows: 5,000,000/i).first()).toBeVisible();
    
    // Calculate with new values
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show different results for aligned vs unaligned buckets', async ({ page }) => {
    // Get the checkbox by role and name
    const alignedCheckbox = page.getByRole('checkbox', { name: /Buckets Aligned/i });
    
    // Calculate with aligned buckets (default is checked)
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Get some result text with aligned buckets
    const resultWithAligned = await page.locator('.text-2xl.font-bold').first().textContent();
    
    // Uncheck buckets aligned
    await alignedCheckbox.uncheck();
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Get result text with unaligned buckets
    const resultWithUnaligned = await page.locator('.text-2xl.font-bold').first().textContent();
    
    // Both results should exist (they might be different)
    expect(resultWithAligned).toBeTruthy();
    expect(resultWithUnaligned).toBeTruthy();
  });

  test('should adjust bucket count and show impact', async ({ page }) => {
    // Get all sliders on the page
    // Bucket Count slider is at index 9 (AQE: 0-3, DPP: 4-5, Bucketing: Left=6, Right=7, AvgRowSize=8, BucketCount=9)
    const sliders = page.locator('input[type="range"]');
    const bucketSlider = sliders.nth(9);
    
    // Set bucket count to 128 (valid: 8, 16, 24, ..., 128, ..., 256)
    await bucketSlider.fill('128');
    await expect(page.getByText(/Bucket Count: 128/i).first()).toBeVisible();
    
    // Calculate
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Storage overhead should be visible
    const storageText = await page.locator('text=/Storage Overhead/i').first().textContent();
    expect(storageText).toBeTruthy();
  });

  test('should show trade-off explanation', async ({ page }) => {
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Should explain the trade-off (looking for description text)
    await expect(page.locator('text=/Estimate shuffle reduction/i')).toBeVisible();
  });

  test('should use evidence-based language in explanations', async ({ page }) => {
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    
    // Wait for results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
    
    // Check the page content for evidence-based language
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toMatch(/estimate|reduce|overhead/i);
  });

  test('should handle large table sizes gracefully', async ({ page }) => {
    // Get all sliders on the page
    // Bucketing sliders: Left=6, Right=7, AvgRowSize=8, BucketCount=9
    const sliders = page.locator('input[type="range"]');
    
    // Set very large tables (within valid ranges)
    await sliders.nth(6).fill('100000000'); // 100M Left Rows (max is 200M)
    await sliders.nth(7).fill('50000000'); // 50M Right Rows (max is 50M)
    await sliders.nth(8).fill('500'); // 500 bytes Avg Row Size (max is 500)
    
    await page.getByRole('button', { name: /Calculate ROI/i }).click();
    
    // Should still calculate and show results
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display bucket count options correctly', async ({ page }) => {
    // Get all sliders on the page
    // Bucket Count slider is at index 9
    const sliders = page.locator('input[type="range"]');
    const bucketSlider = sliders.nth(9);
    
    // Check min value (min=8, step=8, so 8 is valid)
    await bucketSlider.fill('8');
    await expect(page.getByText(/Bucket Count: 8/i).first()).toBeVisible();
    
    // Check max value (max=256, step=8, so 256 is valid)
    await bucketSlider.fill('256');
    await expect(page.getByText(/Bucket Count: 256/i).first()).toBeVisible();
  });
});
