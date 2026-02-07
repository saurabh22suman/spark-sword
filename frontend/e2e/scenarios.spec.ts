import { test, expect } from '@playwright/test';

/**
 * E2E tests for Scenarios page
 * 
 * Tests the learning scenarios functionality - simplified for new UI.
 */

test.describe('Scenarios Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scenarios');
    // Wait for scenarios to load - using new header text
    await page.waitForSelector('text=Learning Scenarios', { timeout: 10000 });
  });

  test('scenarios page loads correctly', async ({ page }) => {
    // Header is visible with new text
    await expect(page.getByText('Learning Scenarios')).toBeVisible();
    
    // Description is visible
    await expect(page.getByText(/Master Spark optimization/i)).toBeVisible();
  });

  test('shows available lessons section', async ({ page }) => {
    // Check that Available Lessons section is shown
    await expect(page.getByText('Available Lessons')).toBeVisible();
  });

  test('shows scenario cards', async ({ page }) => {
    // Check that scenario cards are loaded (using button elements for scenario cards)
    const scenarioCards = page.locator('button').filter({ hasText: /.+/ });
    const count = await scenarioCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('scenarios show difficulty level badges', async ({ page }) => {
    // BASIC level should be visible
    await expect(page.getByText('BASIC').first()).toBeVisible();
  });

  test('clicking scenario shows detail panel', async ({ page }) => {
    // First scenario is auto-selected on load, just wait for detail to appear
    await expect(page.getByText('Learner Scenario')).toBeVisible({ timeout: 10000 });
    
    // Also verify the scenario title is shown
    await expect(page.getByRole('heading', { name: 'Simple Filter', level: 2 })).toBeVisible();
  });
});

test.describe('Scenario Detail View', () => {
  test('scenario detail shows learner scenario label', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForSelector('text=Learning Scenarios', { timeout: 10000 });
    
    // First scenario auto-loads, just wait for detail panel
    await expect(page.getByText('Learner Scenario')).toBeVisible({ timeout: 10000 });
  });

  test('scenario detail shows story context', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForSelector('text=Learning Scenarios', { timeout: 10000 });
    
    // Wait for context section (first scenario auto-loads)
    await expect(page.getByText('The Context')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scenario Navigation', () => {
  test('has navbar with home link', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForSelector('text=Learning Scenarios', { timeout: 10000 });
    
    // Spark Sword brand link should be visible in navbar (use navigation role)
    const brandLink = page.getByRole('navigation').getByRole('link', { name: /Spark Sword/i });
    await expect(brandLink).toBeVisible();
    
    // Click and verify navigation
    await brandLink.click();
    await expect(page).toHaveURL('/');
  });

  test('has link to playground in detail view', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForSelector('text=Learning Scenarios', { timeout: 10000 });
    
    // Select a scenario (not theme toggle)
    const firstScenario = page.locator('button:has-text("Simple Filter")').first();
    await firstScenario.click();
    
    // Wait for detail panel and check playground link
    await expect(page.getByText(/Try in Playground|Open in Playground|Playground/i).first()).toBeVisible({ timeout: 10000 });
  });
});
