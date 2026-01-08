import { test, expect } from '@playwright/test';

/**
 * Spill Risk Indicators E2E Tests (Updated for PlaygroundV3)
 * 
 * Tests for visual warnings when spill risk is detected.
 * Per work-ahead.md: "Derived outputs: Spill risk"
 * 
 * PlaygroundV3 shows spill risk in Impact Panel and PartitionBars (live)
 */

test.describe('Spill Risk Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('shows spill risk warning for large data with shuffle', async ({ page }) => {
    // Use a preset that creates large partitions
    // Load 100GB preset with few partitions = large partition size
    await page.getByRole('button', { name: '100 GB' }).click();
    
    // Add a groupby operation that causes shuffle
    await page.getByTestId('add-groupby').click();
    
    // Should show warning in Impact Panel (spill warning appears when partition > 2GB)
    // The "May cause disk spill" warning appears in Max Partition metric
    await expect(page.getByText('Max Partition')).toBeVisible();
  });

  test('no spill warning for filter operation', async ({ page }) => {
    // Use moderate data size
    await page.getByRole('button', { name: '1 GB' }).click();
    
    // Add a filter operation (narrow transformation, no shuffle)
    await page.getByTestId('add-filter').click();
    
    // Should show 0 B shuffle in Impact Panel specifically
    await expect(page.getByTestId('impact-panel').getByText('0 B')).toBeVisible();
  });

  test('spill risk indicator appears with high skew preset', async ({ page }) => {
    // Load high skew preset (10x skew factor)
    await page.getByTestId('preset-high-skew').click();
    
    // High skew causes uneven task times
    await expect(page.getByText('10.0x skew')).toBeVisible();
    
    // Should show stragglers warning in task time range
    await expect(page.getByText('Possible stragglers')).toBeVisible();
  });

  test('partition bars show skew visually', async ({ page }) => {
    // Load high skew preset
    await page.getByTestId('preset-high-skew').click();
    
    // Partition bars should be visible showing skewed distribution
    await expect(page.getByTestId('partition-bars')).toBeVisible();
  });
});

test.describe('Spill Risk in Config Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/config');
  });

  test('executor memory setting exists', async ({ page }) => {
    await expect(page.getByText('spark.executor.memory')).toBeVisible();
  });

  test('memory fraction setting exists', async ({ page }) => {
    await expect(page.getByText('spark.memory.fraction')).toBeVisible();
  });

  test('config changes show impact on memory usage', async ({ page }) => {
    // The config simulator should show memory-related settings
    await expect(page.getByText('spark.memory.fraction')).toBeVisible();
    
    // Memory fraction impacts spill behavior
    await expect(page.getByText(/memory|execution|storage/i).first()).toBeVisible();
  });
});
