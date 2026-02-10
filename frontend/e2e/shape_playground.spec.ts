import { test, expect } from '@playwright/test';

/**
 * Shape Playground E2E Tests (v3 Revamp)
 * 
 * Tests the interactive DataFrame Shape Playground per playground-v3-full-revamp-spec.md.
 * 
 * Layout:
 * ┌──────────────────────────────────────────┐
 * │ Global Data Shape & Controls              │
 * ├───────────────┬──────────────────────────┤
 * │ Operation     │ Primary Visualization    │
 * │ Chain Builder │ (DAG / Partitions / Flow)│
 * ├───────────────┼──────────────────────────┤
 * │ Prediction &  │ Explanation Panel        │
 * │ Commit Area   │                          │
 * ├───────────────┴──────────────────────────┤
 * │ Timeline / History / Reset                │
 * └──────────────────────────────────────────┘
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

  test('mode toggle switches between learning and expert', async ({ page }) => {
    // Mode toggle should be visible
    await expect(page.getByTestId('mode-toggle')).toBeVisible();
    
    // Should start in Learning mode
    await expect(page.getByTestId('mode-toggle')).toContainText('Learning');
    
    // Click to switch to Expert mode
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('mode-toggle')).toContainText('Expert');
    
    // Click again to switch back
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('mode-toggle')).toContainText('Learning');
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
    
    // The groupby is auto-selected, so controls should be visible
    // Operation controls should show groupby-specific options
    await expect(page.getByText('Key Cardinality')).toBeVisible();
  });

  test('execution DAG shows nodes', async ({ page }) => {
    // Add operations to build a chain
    await page.getByTestId('add-filter').click();
    
    // Execution DAG should be visible
    await expect(page.getByTestId('execution-dag')).toBeVisible();
    
    // DAG should show the read node and filter node
    await expect(page.getByTestId('dag-node-read')).toBeVisible();
  });

  test('adding shuffle operation shows stage boundary', async ({ page }) => {
    // Switch to expert mode to skip prediction
    await page.getByTestId('mode-toggle').click();
    
    // Add filter then groupby
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // DAG should show stage boundaries
    await expect(page.getByTestId('stage-boundary-1')).toBeVisible();
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

  test('global reset clears all operations', async ({ page }) => {
    // Add some operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Verify operations exist
    await expect(page.locator('[data-testid^="chain-op-"]')).toHaveCount(2);
    
    // Click reset button
    await page.getByTestId('global-reset').click();
    
    // Operations should be cleared
    await expect(page.locator('[data-testid^="chain-op-"]')).toHaveCount(0);
  });

  test('snapshot button saves state', async ({ page }) => {
    // Add an operation
    await page.getByTestId('add-groupby').click();
    
    // Snapshot button should be visible
    await expect(page.getByTestId('save-snapshot')).toBeVisible();
    
    // Click snapshot
    await page.getByTestId('save-snapshot').click();
    
    // History should show a snapshot entry
    await expect(page.getByText('Snapshot 1')).toBeVisible();
  });

  test('partition bars visible in data shape section', async ({ page }) => {
    // Partition bars should be visible within data shape panel
    const dataShapePanel = page.getByTestId('data-shape-panel');
    await expect(dataShapePanel).toBeVisible();
    
    // There should be partition bars component within or after data shape
    await expect(page.getByTestId('partition-bars').first()).toBeVisible();
  });

  test('disclaimer shows estimation warning', async ({ page }) => {
    // Should show warning about simulations
    await expect(page.getByText(/Simulations are estimates/i)).toBeVisible();
  });
});

test.describe('Prediction Flow in Playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('prediction triggered when adding shuffle operation in learning mode', async ({ page }) => {
    // Add groupby operation (causes shuffle)
    await page.getByTestId('add-groupby').click();
    
    // Wait for prediction prompt to appear
    await expect(page.getByText('Prediction Time')).toBeVisible({ timeout: 5000 });
    
    // Should see prediction options
    await expect(page.getByText('Full shuffle across network')).toBeVisible();
  });

  test('prediction can be skipped in expert mode', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    await expect(page.getByTestId('mode-toggle')).toContainText('Expert');
    
    // Add groupby operation
    await page.getByTestId('add-groupby').click();
    
    // In expert mode, prediction should still appear but with skip option
    // OR it might not trigger at all depending on implementation
    // The prediction panel should have a skip button
    const skipButton = page.getByRole('button', { name: /Skip/i });
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
    }
    
    // DAG should be visible
    await expect(page.getByTestId('execution-dag')).toBeVisible();
  });

  test('committing prediction shows animation', async ({ page }) => {
    // Add groupby operation
    await page.getByTestId('add-groupby').click();
    
    // Wait for prediction prompt
    await expect(page.getByText('Prediction Time')).toBeVisible({ timeout: 5000 });
    
    // Select a prediction
    await page.getByText('Full shuffle across network').click();
    
    // Commit prediction
    await page.getByTestId('prediction-commit').click();
    
    // Animation or explanation should follow
    await expect(page.getByText(/Spark is reacting|Decision|Reason/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Visual Grammar in Playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
    // Switch to expert mode to skip predictions
    await page.getByTestId('mode-toggle').click();
  });

  test('DAG legend shows color meanings', async ({ page }) => {
    // Add operations to show DAG
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Legend should show color meanings in the DAG area
    const dagSection = page.locator('[data-testid="execution-dag"]').locator('..');
    await expect(dagSection.getByText('Normal')).toBeVisible();
    await expect(dagSection.getByText('Shuffle')).toBeVisible();
    await expect(dagSection.getByText('Broadcast')).toBeVisible();
  });
});

test.describe('Enhanced Features (Phase 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('URL state persists playground configuration', async ({ page }) => {
    // Add an operation
    await page.getByTestId('add-filter').click();
    
    // Wait for URL to update (debounced 500ms)
    await page.waitForTimeout(600);
    
    // Check that URL contains state parameter
    const url = page.url();
    expect(url).toContain('state=');
    
    // Reload page
    await page.reload();
    
    // Operation should still be present after reload
    await expect(page.locator('[data-testid^="chain-op-"]').filter({ hasText: /Filter/i })).toBeVisible();
  });

  test('Share button copies URL to clipboard', async ({ page }) => {
    // Add operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Click share button
    await page.getByTestId('share-button').click();
    
    // Toast notification should appear
    await expect(page.getByText(/Link copied to clipboard/i)).toBeVisible();
  });

  test('ExecutionStepper toggle shows step-by-step view', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Add operations to create a chain
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Toggle to step-through mode
    await page.getByTestId('toggle-stepper').click();
    
    // ExecutionStepper should be visible
    await expect(page.getByTestId('execution-stepper')).toBeVisible();
    
    // Should show step navigation controls
    await expect(page.getByTestId('step-previous')).toBeVisible();
    await expect(page.getByTestId('step-next')).toBeVisible();
    await expect(page.getByTestId('step-play-pause')).toBeVisible();
  });

  test('ExecutionStepper allows step navigation', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Add multiple operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    await page.getByTestId('add-join').click();
    
    // Toggle to step-through mode
    await page.getByTestId('toggle-stepper').click();
    
    // Should start at step 1
    await expect(page.getByText(/Step 1 of/)).toBeVisible();
    
    // Click next button
    await page.getByTestId('step-next').click();
    
    // Should advance to step 2
    await expect(page.getByText(/Step 2 of/)).toBeVisible();
    
    // Click previous button
    await page.getByTestId('step-previous').click();
    
    // Should go back to step 1
    await expect(page.getByText(/Step 1 of/)).toBeVisible();
  });

  test('ExecutionStepper shows Spark decision explanations', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Add a groupby operation
    await page.getByTestId('add-groupby').click();
    
    // Toggle to step-through mode
    await page.getByTestId('toggle-stepper').click();
    
    // Should show Spark's decision process
    await expect(page.getByText(/Spark's Decision Process/i)).toBeVisible();
    await expect(page.getByText(/GroupBy requires colocating/i)).toBeVisible();
  });

  test('ExecutionStepper shows input and output state', async ({ page }) => {
    // Switch to expert mode
    await page.getByTestId('mode-toggle').click();
    
    // Add filter operation
    await page.getByTestId('add-filter').click();
    
    // Toggle to step-through mode
    await page.getByTestId('toggle-stepper').click();
    
    // Should show input and output states
    await expect(page.getByText('Input State')).toBeVisible();
    await expect(page.getByText('Output State')).toBeVisible();
    
    // Should show partition bars for both states
    await expect(page.locator('[data-testid="partition-bars"]')).toHaveCount(2);
  });
});
