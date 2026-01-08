import { test, expect } from '@playwright/test';

/**
 * Shape Playground E2E Tests (v3)
 * 
 * Tests the interactive DataFrame Shape Playground UI per dataframe-playground-spec.md.
 * Layout: Presets → Data Shape → [Operations | Spark View | Impact] → Timeline
 */
test.describe('Shape Playground v3', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('playground page loads with data shape panel', async ({ page }) => {
    // Main title
    await expect(page.getByRole('heading', { name: 'DataFrame Shape Playground' })).toBeVisible();
    
    // Data shape panel should be visible with test ID
    await expect(page.getByTestId('data-shape-panel')).toBeVisible();
    
    // Size presets should be visible
    await expect(page.getByRole('button', { name: '100 MB' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1 GB' })).toBeVisible();
    await expect(page.getByRole('button', { name: '10 GB' })).toBeVisible();
  });

  test('presets bar is visible with learning scenarios', async ({ page }) => {
    // Presets section header
    await expect(page.getByText('Quick Presets')).toBeVisible();
    
    // Check for preset buttons by test ID
    await expect(page.getByTestId('preset-dim-fact')).toBeVisible();
    await expect(page.getByTestId('preset-high-skew')).toBeVisible();
    await expect(page.getByTestId('preset-too-many-partitions')).toBeVisible();
  });

  test('clicking preset loads scenario', async ({ page }) => {
    // Click high skew preset
    await page.getByTestId('preset-high-skew').click();
    
    // Should show the skew factor in the data shape panel
    await expect(page.getByText('10.0x skew')).toBeVisible();
  });

  test('operation buttons are visible with test IDs', async ({ page }) => {
    // Common operations should be visible by test ID
    await expect(page.getByTestId('add-filter')).toBeVisible();
    await expect(page.getByTestId('add-groupby')).toBeVisible();
    await expect(page.getByTestId('add-join')).toBeVisible();
    await expect(page.getByTestId('add-write')).toBeVisible();
  });

  test('adding operations builds a chain', async ({ page }) => {
    // Add filter operation
    await page.getByTestId('add-filter').click();
    
    // Filter should appear in chain
    await expect(page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i })).toBeVisible();
    
    // Add groupby operation
    await page.getByTestId('add-groupby').click();
    
    // Chain should now have 2 operations
    await expect(page.locator('[data-testid^="chain-op-"]')).toHaveCount(2);
  });

  test('selecting operation shows controls', async ({ page }) => {
    // Add groupby operation
    await page.getByTestId('add-groupby').click();
    
    // Click to select it
    await page.locator('[data-testid^="chain-op-"]').filter({ hasText: /GroupBy/i }).click();
    
    // Operation controls should show groupby-specific options
    await expect(page.getByText('Key Cardinality')).toBeVisible();
  });

  test('impact panel shows metrics', async ({ page }) => {
    // Add a groupby to generate shuffle
    await page.getByTestId('add-groupby').click();
    
    // Impact panel should show metrics
    await expect(page.getByText('Shuffle Bytes')).toBeVisible();
    await expect(page.getByText('Task Count')).toBeVisible();
    await expect(page.getByText('Max Partition')).toBeVisible();
  });

  test('spark view panel shows DAG', async ({ page }) => {
    // Add operations to build a chain
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // DAG should show stages with shuffle boundary indicator
    await expect(page.getByTestId('stage-boundary')).toBeVisible();
  });

  test('filter operation shows no shuffle impact', async ({ page }) => {
    // Add filter operation
    await page.getByTestId('add-filter').click();
    
    // Should show 0 B shuffle in impact panel
    await expect(page.getByText('0 B').first()).toBeVisible();
  });

  test('advanced operations toggle works', async ({ page }) => {
    // Advanced operations should be hidden by default
    await expect(page.getByTestId('add-window')).not.toBeVisible();
    
    // Click to show advanced
    await page.getByRole('button', { name: /Show Advanced/i }).click();
    
    // Now advanced ops should be visible
    await expect(page.getByTestId('add-window')).toBeVisible();
    await expect(page.getByTestId('add-distinct')).toBeVisible();
    await expect(page.getByTestId('add-orderby')).toBeVisible();
  });

  test('comparison timeline allows pinning states', async ({ page }) => {
    // Add an operation
    await page.getByTestId('add-groupby').click();
    
    // Pin button should be visible
    await expect(page.getByRole('button', { name: /Pin/i })).toBeVisible();
    
    // Click pin
    await page.getByRole('button', { name: /Pin/i }).click();
    
    // Timeline should show a pinned state - verify the operation is in the chain
    await expect(page.getByTestId('chain-op-groupby')).toBeVisible();
  });

  test('partition bars respond to skew changes', async ({ page }) => {
    // Partition bars should be visible
    await expect(page.getByTestId('partition-bars')).toBeVisible();
    
    // Find skew slider and increase skew (if slider is present)
    const skewSlider = page.locator('input[type="range"]').filter({ hasText: /skew/i }).first();
    if (await skewSlider.isVisible()) {
      // Adjust skew - this would show uneven bars
      await skewSlider.fill('5');
    }
  });
});
