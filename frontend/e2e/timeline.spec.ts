import { test, expect } from '@playwright/test';

/**
 * Timeline Visualization E2E Tests (Updated for PlaygroundV3 Revamp)
 * 
 * Tests for history/timeline and DAG visualization.
 * Per playground-v3-full-revamp-spec.md: "Timeline / History / Reset"
 * 
 * PlaygroundV3 Revamp shows history snapshots in the bottom Timeline zone
 */

test.describe('Timeline in Playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('playground shows history section', async ({ page }) => {
    // History section should be visible
    await expect(page.getByText('History')).toBeVisible();
    
    // Should show initial message about snapshots
    await expect(page.getByText(/Click.*Snapshot/i)).toBeVisible();
  });

  test('snapshot button saves current state', async ({ page }) => {
    // Add an operation
    await page.getByTestId('add-groupby').click();
    
    // Click snapshot button
    await page.getByTestId('save-snapshot').click();
    
    // Should show snapshot entry
    await expect(page.getByText('Snapshot 1')).toBeVisible();
  });
});

test.describe('Timeline Component Existence', () => {
  test('PlaygroundV3 page loads with DAG visualization', async ({ page }) => {
    // This test verifies the component files exist
    await page.goto('/playground');
    await expect(page.getByRole('heading', { name: /DataFrame Shape Playground/i })).toBeVisible();
    
    // Execution DAG section should be visible
    await expect(page.getByTestId('execution-dag')).toBeVisible();
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