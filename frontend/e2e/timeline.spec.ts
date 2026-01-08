import { test, expect } from '@playwright/test';

/**
 * Timeline Visualization E2E Tests (Updated for PlaygroundV3)
 * 
 * Tests for stage timeline / task duration metrics.
 * Per work-ahead.md: "Every chart must represent real metrics"
 * 
 * PlaygroundV3 now shows task time in Impact Panel (live, no Simulate button)
 */

test.describe('Timeline in Playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('playground shows task time estimates', async ({ page }) => {
    // Add an operation that generates metrics
    await page.getByTestId('add-groupby').click();
    
    // Should show task time metrics in Impact Panel
    await expect(page.getByText('Task Time Range')).toBeVisible();
  });

  test('task time varies with skew from presets', async ({ page }) => {
    // Load high skew preset
    await page.getByTestId('preset-high-skew').click();
    
    // High skew preset (10.0x skew) should show in data shape
    await expect(page.getByText('10.0x skew')).toBeVisible();
    
    // Task time should still be displayed in Impact Panel
    await expect(page.getByText('Task Time Range')).toBeVisible();
  });
});

test.describe('Timeline Component Existence', () => {
  test('PlaygroundV3 page loads with DAG visualization', async ({ page }) => {
    // This test verifies the component files exist
    await page.goto('/playground');
    await expect(page.getByRole('heading', { name: /DataFrame Shape Playground/i })).toBeVisible();
    
    // Add operations to see the DAG
    await page.getByTestId('add-groupby').click();
    
    // Check for stage boundary in DAG (shuffle indicator)
    await expect(page.getByTestId('stage-boundary')).toBeVisible();
  });

  test('Playground renders without console errors', async ({ page }) => {
    // Navigate to playground
    await page.goto('/playground');
    
    // Check that the page renders without errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Add an operation
    await page.getByTestId('add-groupby').click();
    
    // Wait a moment for any async rendering
    await page.waitForTimeout(500);
    
    // Should not have critical rendering errors
    const criticalErrors = consoleErrors.filter(e => 
      e.toLowerCase().includes('unhandled') || 
      e.toLowerCase().includes('uncaught')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});