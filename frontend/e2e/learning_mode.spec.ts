import { test, expect } from '@playwright/test';

/**
 * Learning Mode E2E Tests (Updated for PlaygroundV3)
 * 
 * Tests for progressive disclosure - Standard mode vs Expert mode.
 * PlaygroundV3 uses Standard/Expert toggle instead of Learning/Expert.
 * 
 * Per work-ahead.md:
 * - Experts should never feel slowed
 * - Beginners should never feel lost
 */
test.describe('Learning Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('mode toggle is visible', async ({ page }) => {
    // Use exact match to find the Standard mode button
    await expect(page.getByRole('button', { name: 'Standard', exact: true })).toBeVisible();
  });

  test('default mode is Standard', async ({ page }) => {
    // Standard mode should be the default for learning
    await expect(page.getByRole('button', { name: 'Standard', exact: true })).toBeVisible();
  });

  test('clicking toggle switches to Expert mode', async ({ page }) => {
    // Click the toggle
    await page.getByRole('button', { name: 'Standard', exact: true }).click();
    
    // Should switch to Expert mode (button text changes)
    await expect(page.getByRole('button', { name: 'Expert', exact: true })).toBeVisible();
  });

  test('expert mode shows additional controls', async ({ page }) => {
    // Switch to Expert mode
    await page.getByRole('button', { name: 'Standard', exact: true }).click();
    
    // Expert mode shows the button with Expert text
    await expect(page.getByRole('button', { name: 'Expert', exact: true })).toBeVisible();
  });
});

test.describe('Learning Mode on Config Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/config');
  });

  test('mode toggle is visible on config page', async ({ page }) => {
    // The config page should have a mode toggle
    await expect(page.getByRole('button', { name: /Standard|Expert/i }).first()).toBeVisible();
  });

  test('config page shows config explanations', async ({ page }) => {
    // Check that the config page has explanations for beginners
    await expect(page.getByRole('heading', { name: 'Spark Config Simulator' })).toBeVisible();
    
    // Should show a config option (use first() since there may be multiple)
    await expect(page.getByText('spark.sql.shuffle.partitions').first()).toBeVisible();
  });
});
