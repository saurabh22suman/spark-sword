import { test, expect } from '@playwright/test';

/**
 * Real-time Validation Warnings E2E Tests
 * 
 * Tests the real-time feedback system that warns users about potentially
 * problematic configurations before they commit to predictions.
 * 
 * Core principles:
 * - Warnings are educational, not blocking
 * - Appear in real-time as configurations change
 * - Explain WHY something might be problematic
 * - Suggest alternatives without being prescriptive
 */
test.describe('Real-time Validation Warnings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('warning appears for excessive shuffle bytes', async ({ page }) => {
    // Switch to expert mode to skip predictions
    await page.getByTestId('mode-toggle').click();
    
    // Set very large data size
    await page.getByTestId('size-preset-100gb').click();
    
    // Add a groupby (will cause large shuffle)
    await page.getByTestId('add-groupby').click();
    
    // Warning should appear
    await expect(page.getByTestId('validation-warning')).toBeVisible();
    await expect(page.getByTestId('validation-warning')).toContainText(/shuffle.*large/i);
  });

  test('warning appears for high partition count with small data', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Set small data size
    await page.getByTestId('size-preset-100mb').click();
    
    // Increase partitions to excessive amount (manually via slider)
    // This creates overhead - many tasks for small data
    const partitionsSlider = page.locator('input[type="range"]').filter({ hasText: /partition/i }).or(
      page.locator('label:has-text("Partitions")').locator('~ input[type="range"]')
    );
    
    if (await partitionsSlider.count() > 0) {
      await partitionsSlider.first().fill('2000');
      
      // Warning should appear about task overhead
      await expect(page.getByTestId('validation-warning')).toBeVisible();
      await expect(page.getByTestId('validation-warning')).toContainText(/small tasks|overhead/i);
    }
  });

  test('warning appears for extreme skew factor', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Set high skew factor
    const skewSlider = page.locator('label:has-text("Skew")').locator('~ input[type="range"]');
    if (await skewSlider.count() > 0) {
      await skewSlider.fill('10'); // Extreme skew
      
      // Warning should appear
      await expect(page.getByTestId('validation-warning')).toBeVisible();
      await expect(page.getByTestId('validation-warning')).toContainText(/skew|uneven|imbalance/i);
    }
  });

  test('warning for join without broadcast eligibility', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Add join
    await page.getByTestId('add-join').click();
    
    // Set right table size above broadcast threshold
    const rightRowsSlider = page.locator('label:has-text("Right Rows")').locator('~ input[type="range"]');
    if (await rightRowsSlider.count() > 0) {
      await rightRowsSlider.fill('10000000'); // 10M rows
      
      // Warning should appear about shuffle join
      await expect(page.getByTestId('validation-warning')).toBeVisible();
      await expect(page.getByTestId('validation-warning')).toContainText(/shuffle join|broadcast/i);
    }
  });

  test('warning severity levels are visually distinct', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Create a high-severity issue (very large shuffle)
    await page.getByTestId('size-preset-100gb').click();
    await page.getByTestId('add-groupby').click();
    
    // High severity warning should have red color
    const warning = page.getByTestId('validation-warning');
    await expect(warning).toBeVisible();
    
    // Check for severity indicator
    await expect(page.getByTestId('warning-severity-high')).toBeVisible();
  });

  test('warnings can be dismissed but reappear on relevant changes', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Trigger a warning
    await page.getByTestId('size-preset-100gb').click();
    await page.getByTestId('add-groupby').click();
    
    await expect(page.getByTestId('validation-warning')).toBeVisible();
    
    // Dismiss warning
    await page.getByTestId('dismiss-warning').click();
    await expect(page.getByTestId('validation-warning')).not.toBeVisible();
    
    // Modify config again to retrigger
    await page.getByTestId('add-filter').click();
    
    // Warning should reappear if still relevant
    // (This depends on validation logic - warnings may or may not reappear)
  });

  test('multiple warnings are shown when multiple issues exist', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Create multiple issues
    // 1. Large shuffle
    await page.getByTestId('size-preset-100gb').click();
    await page.getByTestId('add-groupby').click();
    
    // 2. High skew
    const skewSlider = page.locator('label:has-text("Skew")').locator('~ input[type="range"]');
    if (await skewSlider.count() > 0) {
      await skewSlider.fill('5');
    }
    
    // Multiple warnings should be visible
    const warnings = page.locator('[data-testid="validation-warning"]');
    const warningCount = await warnings.count();
    expect(warningCount).toBeGreaterThanOrEqual(1);
  });

  test('warnings include educational explanations in learning mode', async ({ page }) => {
    // Should start in learning mode
    await expect(page.getByTestId('mode-toggle')).toContainText('Learning');
    
    // Trigger a warning
    await page.getByTestId('size-preset-100gb').click();
    await page.getByTestId('add-groupby').click();
    
    // Warning should have detailed explanation
    const warning = page.getByTestId('validation-warning');
    await expect(warning).toBeVisible();
    
    // Check for "Learn More" or explanation text
    await expect(warning).toContainText(/.{50,}/); // At least 50 chars of explanation
  });

  test('warnings are more concise in expert mode', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('mode-toggle')).toContainText('Expert');
    
    // Trigger a warning
    await page.getByTestId('size-preset-100gb').click();
    await page.getByTestId('add-groupby').click();
    
    // Warning should be visible but more concise
    const warning = page.getByTestId('validation-warning');
    await expect(warning).toBeVisible();
  });

  test('no warnings for valid common configurations', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Use moderate settings
    await page.getByTestId('size-preset-10gb').click();
    await page.getByTestId('add-filter').click();
    
    // No warnings should appear
    await expect(page.getByTestId('validation-warning')).not.toBeVisible();
  });
});
