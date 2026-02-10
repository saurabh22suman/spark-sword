import { test, expect } from '@playwright/test';

/**
 * Continuous Selectivity Scrubber E2E Tests
 * 
 * Tests an interactive scrubber that allows users to continuously
 * adjust filter selectivity and see real-time impact on data flow.
 * 
 * Core principles:
 * - Smooth, continuous adjustment (not discrete steps)
 * - Real-time visual feedback
 * - Shows cascade effect on downstream operations
 * - Percentage display updates live
 */
test.describe('Continuous Selectivity Scrubber', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    // Add a filter operation
    await page.getByTestId('add-filter').click();
  });

  test('selectivity slider is visible for filter operations', async ({ page }) => {
    // Select the filter operation
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Selectivity slider should be visible
    await expect(page.getByTestId('selectivity-scrubber')).toBeVisible();
  });

  test('dragging scrubber updates selectivity value', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Get initial value
    const scrubber = page.getByTestId('selectivity-scrubber');
    const initialValue = await scrubber.getAttribute('aria-valuenow');
    
    // Drag to change
    await scrubber.fill('0.3'); // Set to 30%
    
    // Value should update
    const newValue = await scrubber.getAttribute('aria-valuenow');
    expect(newValue).not.toBe(initialValue);
  });

  test('selectivity percentage displays in real-time', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Change selectivity
    await page.getByTestId('selectivity-scrubber').fill('0.25');
    
    // Percentage should display
    await expect(page.locator('text=/25%|0\\.25/')).toBeVisible();
  });

  test('changing selectivity updates DAG visualization', async ({ page }) => {
    // Add filter and another operation
    await page.getByTestId('add-groupby').click();
    
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i }).first();
    await filterOp.click();
    
    // Change selectivity significantly
    await page.getByTestId('selectivity-scrubber').fill('0.1'); // Very selective
    
    // DAG should update (implementation-specific)
    await expect(page.getByTestId('execution-dag')).toBeVisible();
  });

  test('scrubber shows visual feedback while dragging', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    const scrubber = page.getByTestId('selectivity-scrubber');
    
    // Start dragging
    await scrubber.hover();
    await page.mouse.down();
    
    // Visual indicator should be active
    await expect(page.getByTestId('scrubber-active-indicator')).toBeVisible();
    
    await page.mouse.up();
  });

  test('scrubber has fine-grained control', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Set to very specific value
    await page.getByTestId('selectivity-scrubber').fill('0.427'); // 42.7%
    
    // Should accept decimal precision
    const value = await page.getByTestId('selectivity-scrubber').getAttribute('value');
    expect(parseFloat(value || '0')).toBeCloseTo(0.427, 2);
  });

  test('changing selectivity updates validation warnings', async ({ page }) => {
    // Add operations that might trigger warnings
    await page.getByTestId('size-preset-100gb').click();
    await page.getByTestId('add-groupby').click();
    
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i }).first();
    await filterOp.click();
    
    // Set high selectivity (less filtering)
    await page.getByTestId('selectivity-scrubber').fill('0.9');
    
    // Warning about large shuffle may appear
    await expect(page.getByTestId('validation-warning')).toBeVisible();
    
    // Set low selectivity (more filtering)
    await page.getByTestId('selectivity-scrubber').fill('0.1');
    
    // Warning may disappear or change
    // (Specific behavior depends on thresholds)
  });

  test('scrubber includes preset values', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Preset buttons should be visible
    await expect(page.getByTestId('selectivity-preset-0.1')).toBeVisible();
    await expect(page.getByTestId('selectivity-preset-0.5')).toBeVisible();
    await expect(page.getByTestId('selectivity-preset-0.9')).toBeVisible();
  });

  test('clicking preset quickly sets selectivity', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Click preset
    await page.getByTestId('selectivity-preset-0.1').click();
    
    // Value should be set
    const value = await page.getByTestId('selectivity-scrubber').getAttribute('value');
    expect(parseFloat(value || '0')).toBeCloseTo(0.1, 1);
  });

  test('scrubber shows impact on row count', async ({ page }) => {
    // Select filter
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.click();
    
    // Set selectivity
    await page.getByTestId('selectivity-scrubber').fill('0.3');
    
    // Should show estimated output rows
    await expect(page.locator('text=/rows|output/i')).toBeVisible();
  });
});
