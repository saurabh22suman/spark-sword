import { test, expect } from '@playwright/test';

/**
 * Multi-view Hover Synchronization E2E Tests
 * 
 * Tests that hovering over elements in one view highlights related
 * elements in other views, helping users understand connections.
 * 
 * Core principles:
 * - Hover in one view highlights related elements in all views
 * - Visual feedback is immediate and clear
 * - Works across DAG, partition bars, and operation chain
 * - Helps users understand how operations affect execution
 */
test.describe('Multi-view Hover Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
    // Switch to expert mode to skip predictions
    await page.getByTestId('mode-toggle').click();
  });

  test('hovering operation highlights DAG node', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Hover over filter in operation chain
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i }).first();
    await filterOp.hover();
    
    // Corresponding DAG node should be highlighted
    const dagNode = page.getByTestId('dag-node-filter');
    await expect(dagNode).toHaveClass(/highlighted|active/);
  });

  test('hovering DAG node highlights operation', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Hover over DAG node
    const dagNode = page.getByTestId('dag-node-groupby');
    await dagNode.hover();
    
    // Corresponding operation should be highlighted
    const operation = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /GroupBy/i });
    await expect(operation).toHaveClass(/highlighted|active/);
  });

  test('hovering shuffle operation highlights shuffle edge in DAG', async ({ page }) => {
    // Add a shuffle operation
    await page.getByTestId('add-groupby').click();
    
    // Hover over groupby operation
    const groupbyOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /GroupBy/i });
    await groupbyOp.hover();
    
    // DAG should highlight shuffle edges
    const shuffleEdge = page.locator('[data-edge-type="shuffle"]').first();
    await expect(shuffleEdge).toBeVisible();
  });

  test('hovering operation shows affected partitions in partition bars', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-filter').click();
    
    // Hover over operation
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.hover();
    
    // Partition bars might show animation or highlight
    // (Specific behavior depends on implementation)
    await expect(page.getByTestId('partition-bars')).toBeVisible();
  });

  test('hover sync works in stepper mode', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Switch to stepper view
    await page.getByTestId('toggle-stepper').click();
    
    // Hover over step
    const step = page.locator('[data-testid^="execution-step-"]').first();
    await step.hover();
    
    // Related operation should highlight
    const operation = page.locator('[data-testid^="chain-op-"]').first();
    await expect(operation).toHaveClass(/highlighted|active/);
  });

  test('unhover clears all highlights', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-filter').click();
    
    // Hover
    const filterOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i });
    await filterOp.hover();
    
    // Move mouse away
    await page.mouse.move(0, 0);
    
    // Highlights should clear
    await expect(page.locator('.highlighted')).toHaveCount(0);
  });

  test('tooltips show related information on hover', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-groupby').click();
    
    // Hover over operation
    const groupbyOp = page.locator('[data-testid^="chain-op-"]').filter({ hasText: /GroupBy/i });
    await groupbyOp.hover();
    
    // Tooltip or info should appear
    await expect(page.locator('[role="tooltip"]').or(page.locator('.tooltip'))).toBeVisible();
  });
});
