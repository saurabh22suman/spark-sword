import { test, expect } from '@playwright/test';

/**
 * Learning Mode E2E Tests (Updated for PlaygroundV3 Revamp)
 * 
 * Tests for progressive disclosure - Learning mode vs Expert mode.
 * PlaygroundV3 Revamp uses Learning/Expert toggle via data-testid="mode-toggle".
 */
test.describe('Learning Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('playground page loads', async ({ page }) => {
    // Verify playground page loads by checking the heading
    await expect(page.getByRole('heading', { name: /DataFrame Shape Playground/i })).toBeVisible();
  });

  test('mode toggle is visible', async ({ page }) => {
    // Use test ID to find the mode toggle
    await expect(page.getByTestId('mode-toggle')).toBeVisible();
  });

  test('default mode is Learning', async ({ page }) => {
    // Learning mode should be the default
    await expect(page.getByTestId('mode-toggle')).toContainText('Learning');
  });

  test('clicking toggle switches to Expert mode', async ({ page }) => {
    // Click the toggle
    await page.getByTestId('mode-toggle').click();
    
    // Should switch to Expert mode
    await expect(page.getByTestId('mode-toggle')).toContainText('Expert');
  });
});

test.describe('Config Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/config');
  });

  test('config page loads', async ({ page }) => {
    // Check that the config page loads by checking heading
    await expect(page.getByRole('heading', { name: /Spark Config Simulator/i })).toBeVisible();
  });

  test('shows spark config options', async ({ page }) => {
    // Should show spark config options
    await expect(page.getByText(/shuffle\.partitions|spark\./i).first()).toBeVisible();
  });
});
