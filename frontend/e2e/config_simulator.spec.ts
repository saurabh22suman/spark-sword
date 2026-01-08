import { test, expect } from '@playwright/test';

/**
 * Config Simulator E2E Tests
 * 
 * Tests the Spark configuration impact simulator UI.
 */
test.describe('Config Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/config');
  });

  test('config page loads with category filters', async ({ page }) => {
    // Category buttons should be visible - use exact matching
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shuffle', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Joins', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adaptive', exact: true })).toBeVisible();
  });

  test('config cards are displayed', async ({ page }) => {
    // Check for common Spark configs - use more specific locators within the config explorer section
    const configExplorer = page.locator('.lg\\:col-span-2').filter({ hasText: 'spark.sql.shuffle.partitions' }).first();
    await expect(configExplorer.getByText('spark.sql.shuffle.partitions')).toBeVisible();
    await expect(page.locator('.font-mono.text-blue-400').filter({ hasText: 'spark.sql.autoBroadcastJoinThreshold' })).toBeVisible();
    await expect(page.locator('.font-mono.text-blue-400').filter({ hasText: 'spark.sql.adaptive.enabled' })).toBeVisible();
  });

  test('impact summary section exists', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Impact Summary' })).toBeVisible();
  });

  test('clicking a config card expands it', async ({ page }) => {
    // Click on shuffle partitions config - use role within the Configuration Explorer section
    await page.getByRole('button', { name: /spark\.sql\.shuffle\.partitions.*Shuffle.*Number of partitions/ }).click();
    
    // Expanded content should show
    await expect(page.getByText('Select Value')).toBeVisible();
    await expect(page.getByText('Benefits', { exact: true })).toBeVisible();
    await expect(page.getByText('Trade-offs', { exact: true })).toBeVisible();
  });

  test('selecting a value updates impact summary', async ({ page }) => {
    // Expand a config
    await page.getByRole('button', { name: /spark\.sql\.shuffle\.partitions.*Shuffle.*Number of partitions/ }).click();
    
    // Click a different value (1000)
    await page.getByText('Large data (>100GB)').click();
    
    // Impact summary should update
    await expect(page.getByText('1 changes')).toBeVisible();
  });

  test('reset to defaults button works', async ({ page }) => {
    // Make a change
    await page.getByRole('button', { name: /spark\.sql\.shuffle\.partitions.*Shuffle.*Number of partitions/ }).click();
    await page.getByText('Large data (>100GB)').click();
    
    // Verify change shows
    await expect(page.getByText('1 changes')).toBeVisible();
    
    // Click reset
    await page.getByRole('button', { name: 'Reset to Defaults' }).click();
    
    // Changes should be gone
    await expect(page.getByText('1 changes')).not.toBeVisible();
  });

  test('filtering by category works', async ({ page }) => {
    // Click on Joins category - use exact matching
    await page.getByRole('button', { name: 'Joins', exact: true }).click();
    
    // Should see join-related config
    await expect(page.locator('.font-mono.text-blue-400').filter({ hasText: 'spark.sql.autoBroadcastJoinThreshold' })).toBeVisible();
    
    // Click on Memory category
    await page.getByRole('button', { name: 'Memory', exact: true }).click();
    
    // Should see memory-related config
    await expect(page.locator('.font-mono.text-blue-400').filter({ hasText: 'spark.memory.fraction' })).toBeVisible();
  });

  test('config descriptions are visible', async ({ page }) => {
    // Descriptions should be visible even when collapsed
    await expect(page.getByText('Number of partitions used for shuffles')).toBeVisible();
    await expect(page.getByText('Maximum size (bytes) for broadcast joins')).toBeVisible();
  });

  test('relevant for tags are shown when expanded', async ({ page }) => {
    // Expand shuffle partitions
    await page.getByRole('button', { name: /spark\.sql\.shuffle\.partitions.*Shuffle.*Number of partitions/ }).click();
    
    // Should show relevant operations
    await expect(page.getByText('Relevant For')).toBeVisible();
    // Use locator to find within the config card
    await expect(page.locator('.bg-slate-700').filter({ hasText: 'groupBy' })).toBeVisible();
  });
});

test.describe('Before/After Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/config');
  });

  test('what-if scenarios section is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'What-If Scenarios' })).toBeVisible();
  });

  test('shows scenarios based on sample metrics', async ({ page }) => {
    // Should show at least one scenario card - use first() to handle duplicates
    await expect(page.getByText('Coalesce Output Partitions').first()).toBeVisible();
    await expect(page.getByText('Use Broadcast Join')).toBeVisible();
  });

  test('clicking a scenario shows comparison details', async ({ page }) => {
    // Click on a scenario - be more specific with the button name
    await page.getByRole('button', { name: /Coalesce Output Partitions.*Reduce output partitions/ }).click();
    
    // Should show comparison details
    await expect(page.getByText('Configuration Changes')).toBeVisible();
    await expect(page.getByText('Important Notes')).toBeVisible();
  });

  test('comparison shows before/after metrics', async ({ page }) => {
    // Click on a scenario
    await page.getByRole('button', { name: /Coalesce Output Partitions.*Reduce output partitions/ }).click();
    
    // Should show metric columns - use exact matching
    await expect(page.getByText('Metric')).toBeVisible();
    await expect(page.getByText('Change', { exact: true })).toBeVisible();
  });

  test('scenarios show confidence levels', async ({ page }) => {
    // Confidence badges should be visible on scenario cards
    await expect(page.locator('text=high').first()).toBeVisible();
  });

  test('comparison includes trade-off warnings', async ({ page }) => {
    // Look for trade-off indicators
    await expect(page.getByText('estimates')).toBeVisible();
  });
});
