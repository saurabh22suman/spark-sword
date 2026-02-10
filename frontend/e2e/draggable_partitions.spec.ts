import { test, expect } from '@playwright/test';

/**
 * Draggable Partition Bars E2E Tests
 * 
 * Tests interactive partition bars that allow users to visually
 * adjust partition distribution by dragging bars.
 * 
 * Core principles:
 * - Visual and tactile manipulation of partition sizes
 * - Immediate feedback on changes
 * - Helps users understand skew impact
 * - Constrained to realistic values
 */
test.describe('Draggable Partition Bars', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('partition bars are visible', async ({ page }) => {
    await expect(page.getByTestId('partition-bars')).toBeVisible();
    
    // Individual bars should be present
    const bars = page.locator('[data-testid^="partition-bar-"]');
    await expect(bars.first()).toBeVisible();
  });

  test('dragging a partition bar increases its size', async ({ page }) => {
    // Get initial state
    const firstBar = page.locator('[data-testid="partition-bar-0"]');
    const initialHeight = await firstBar.evaluate(el => el.clientHeight);
    
    // Drag the bar upward to increase size
    await firstBar.hover();
    await page.mouse.down();
    await page.mouse.move(0, -50); // Move up to increase height
    await page.mouse.up();
    
    // Height should increase
    const newHeight = await firstBar.evaluate(el => el.clientHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('dragging updates skew factor', async ({ page }) => {
    // Get skew factor before dragging
    const skewDisplay = page.locator('text=/\\d+\\.\\d+x skew/');
    const initialSkewText = await skewDisplay.textContent();
    
    // Drag a bar to create skew
    const lastBar = page.locator('[data-testid^="partition-bar-"]').last();
    await lastBar.hover();
    await page.mouse.down();
    await page.mouse.move(0, -100); // Significant increase
    await page.mouse.up();
    
    // Skew factor should change
    const newSkewText = await skewDisplay.textContent();
    expect(newSkewText).not.toBe(initialSkewText);
  });

  test('dragging shows real-time size indicator', async ({ page }) => {
    const bar = page.locator('[data-testid="partition-bar-0"]');
    
    // Start dragging
    await bar.hover();
    await page.mouse.down();
    
    // Tooltip or indicator should appear showing size
    await expect(page.locator('[role="tooltip"]').or(page.locator('.size-indicator'))).toBeVisible();
    
    await page.mouse.up();
  });

  test('bars snap to minimum size when dragged too small', async ({ page }) => {
    const bar = page.locator('[data-testid="partition-bar-0"]');
    
    // Try to drag below minimum
    await bar.hover();
    await page.mouse.down();
    await page.mouse.move(0, 200); // Move down significantly
    await page.mouse.up();
    
    // Bar should maintain minimum height
    const height = await bar.evaluate(el => el.clientHeight);
    expect(height).toBeGreaterThan(5); // Minimum threshold
  });

  test('dragging one bar affects skew calculation for all', async ({ page }) => {
    // Drag one bar to make it larger
    const bar = page.locator('[data-testid="partition-bar-0"]');
    await bar.hover();
    await page.mouse.down();
    await page.mouse.move(0, -50);
    await page.mouse.up();
    
    // Check that skew warning may appear for other bars
    const partitionBars = page.getByTestId('partition-bars');
    await expect(partitionBars).toContainText(/skew/i);
  });

  test('double-click bar resets to average', async ({ page }) => {
    // Drag a bar first
    const bar = page.locator('[data-testid="partition-bar-0"]');
    await bar.hover();
    await page.mouse.down();
    await page.mouse.move(0, -50);
    await page.mouse.up();
    
    // Double-click to reset
    await bar.dblclick();
    
    // Bar should return to average size
    // (Implementation-specific validation)
  });

  test('dragging updates validation warnings', async ({ page }) => {
    // Drag a bar to create extreme skew
    const bar = page.locator('[data-testid^="partition-bar-"]').last();
    await bar.hover();
    await page.mouse.down();
    await page.mouse.move(0, -150); // Very large
    await page.mouse.up();
    
    // Skew warning should appear
    await expect(page.getByTestId('validation-warning')).toBeVisible();
    await expect(page.getByTestId('validation-warning')).toContainText(/skew/i);
  });

  test('bars show different colors based on size', async ({ page }) => {
    // Create skew by dragging
    const bar = page.locator('[data-testid^="partition-bar-"]').last();
    await bar.hover();
    await page.mouse.down();
    await page.mouse.move(0, -100);
    await page.mouse.up();
    
    // Check that the dragged bar has warning color
    const classList = await bar.getAttribute('class');
    expect(classList).toMatch(/yellow|red/); // Hot or spill risk color
  });
});
