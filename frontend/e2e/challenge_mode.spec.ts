import { test, expect } from '@playwright/test';

/**
 * Challenge Mode E2E Tests
 * 
 * Tests the Challenge Mode feature that provides scaffolded goals
 * for users to achieve through the playground.
 * 
 * Core principles:
 * - Users learn by doing specific tasks
 * - Goals are specific and measurable
 * - Hints are progressive (start minimal, become more detailed)
 * - Success criteria are clear and validatable
 */
test.describe('Challenge Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('challenge mode can be enabled from playground', async ({ page }) => {
    // Challenge mode toggle should be visible
    await expect(page.getByTestId('challenge-mode-toggle')).toBeVisible();
    
    // Click to enable challenge mode
    await page.getByTestId('challenge-mode-toggle').click();
    
    // Challenge selector should appear
    await expect(page.getByTestId('challenge-selector')).toBeVisible();
  });

  test('challenge categories are displayed', async ({ page }) => {
    // Enable challenge mode
    await page.getByTestId('challenge-mode-toggle').click();
    
    // Categories should be visible
    await expect(page.getByTestId('challenge-category-basics')).toBeVisible();
    await expect(page.getByTestId('challenge-category-shuffle')).toBeVisible();
    await expect(page.getByTestId('challenge-category-joins')).toBeVisible();
    await expect(page.getByTestId('challenge-category-skew')).toBeVisible();
  });

  test('selecting a challenge loads goal and constraints', async ({ page }) => {
    // Enable challenge mode
    await page.getByTestId('challenge-mode-toggle').click();
    
    // Select the first challenge
    await page.getByTestId('challenge-minimize-shuffle').click();
    
    // Goal should be displayed
    await expect(page.getByTestId('challenge-goal')).toBeVisible();
    await expect(page.getByTestId('challenge-goal')).toContainText('minimize shuffle');
    
    // Success criteria should be shown
    await expect(page.getByTestId('challenge-criteria')).toBeVisible();
  });

  test('hints are progressive and can be revealed', async ({ page }) => {
    // Enable challenge mode and select a challenge
    await page.getByTestId('challenge-mode-toggle').click();
    await page.getByTestId('challenge-minimize-shuffle').click();
    
    // Initial hint should be minimal
    await expect(page.getByTestId('hint-level-1')).toBeVisible();
    
    // More detailed hints are hidden initially
    await expect(page.getByTestId('hint-level-2')).not.toBeVisible();
    
    // Click to reveal next hint
    await page.getByTestId('reveal-hint-button').click();
    
    // Second hint should now be visible
    await expect(page.getByTestId('hint-level-2')).toBeVisible();
  });

  test('challenge validates success criteria', async ({ page }) => {
    // Enable challenge mode
    await page.getByTestId('challenge-mode-toggle').click();
    
    // Select a simple challenge
    await page.getByTestId('challenge-filter-only').click();
    
    // Add a filter operation (correct)
    await page.getByTestId('add-filter').click();
    
    // Success indicator should appear
    await expect(page.getByTestId('challenge-success')).toBeVisible();
  });

  test('challenge tracks partial progress', async ({ page }) => {
    // Enable challenge mode
    await page.getByTestId('challenge-mode-toggle').click();
    
    // Select a multi-step challenge
    await page.getByTestId('challenge-broadcast-join').click();
    
    // Progress bar should show 0%
    await expect(page.getByTestId('challenge-progress')).toHaveAttribute('aria-valuenow', '0');
    
    // Add filter operation (first step)
    await page.getByTestId('add-filter').click();
    
    // Progress should increase
    await expect(page.getByTestId('challenge-progress')).toHaveAttribute('aria-valuenow', '33');
  });

  test('challenge can be reset', async ({ page }) => {
    // Enable challenge mode and select a challenge
    await page.getByTestId('challenge-mode-toggle').click();
    await page.getByTestId('challenge-minimize-shuffle').click();
    
    // Add some operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Reset challenge
    await page.getByTestId('reset-challenge').click();
    
    // Operations should be cleared
    await expect(page.locator('[data-testid^="chain-op-"]')).toHaveCount(0);
  });

  test('exiting challenge mode shows confirmation if incomplete', async ({ page }) => {
    // Enable challenge mode and select a challenge
    await page.getByTestId('challenge-mode-toggle').click();
    await page.getByTestId('challenge-minimize-shuffle').click();
    
    // Add partial work
    await page.getByTestId('add-filter').click();
    
    // Try to exit challenge mode
    await page.getByTestId('challenge-mode-toggle').click();
    
    // Confirmation dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/progress will be lost/i)).toBeVisible();
  });

  test('challenge mode works with learning mode', async ({ page }) => {
    // Enable both challenge mode and learning mode
    await page.getByTestId('challenge-mode-toggle').click();
    await expect(page.getByTestId('mode-toggle')).toContainText('Learning');
    
    // Select a challenge
    await page.getByTestId('challenge-minimize-shuffle').click();
    
    // Hints should be more detailed in learning mode
    await expect(page.getByTestId('hint-level-1')).toContainText(/.{20,}/); // At least 20 chars
  });
});
