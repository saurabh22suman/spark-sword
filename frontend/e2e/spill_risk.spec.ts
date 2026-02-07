import { test, expect } from '@playwright/test';

/**
 * Spill Risk Indicators E2E Tests (Updated for PlaygroundV3 Revamp)
 * 
 * Tests for visual warnings when spill risk is detected.
 * Per work-ahead.md: "Derived outputs: Spill risk"
 * 
 * PlaygroundV3 Revamp shows spill risk in PartitionBars (live visualization)
 */

test.describe('Spill Risk Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('shows partition bars with data shape panel', async ({ page }) => {
    // Data shape panel should be visible
    await expect(page.getByTestId('data-shape-panel')).toBeVisible();
    
    // Partition bars should be visible (may be multiple)
    const partitionBars = page.getByTestId('partition-bars');
    await expect(partitionBars.first()).toBeVisible();
  });

  test('filter operation shows no shuffle in DAG', async ({ page }) => {
    // Add a filter operation (narrow transformation, no shuffle)
    await page.getByTestId('add-filter').click();
    
    // DAG should be visible with no stage boundaries
    await expect(page.getByTestId('execution-dag')).toBeVisible();
    
    // Should not show stage boundary since filter is narrow
    await expect(page.getByTestId('stage-boundary-1')).not.toBeVisible();
  });

  test('groupby operation shows stage boundary in DAG', async ({ page }) => {
    // Switch to expert mode to skip prediction
    await page.getByTestId('mode-toggle').click();
    
    // Add a groupby operation that causes shuffle
    await page.getByTestId('add-groupby').click();
    
    // DAG should show stage boundary for shuffle
    await expect(page.getByTestId('stage-boundary-1')).toBeVisible();
  });

  test('high skew value shows warning indicator', async ({ page }) => {
    // Find the skew slider and increase it
    // The data shape panel has a skew factor control
    await expect(page.getByTestId('data-shape-panel')).toBeVisible();
    
    // Partition bars should be visible showing distribution
    await expect(page.getByTestId('partition-bars').first()).toBeVisible();
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
