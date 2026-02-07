import { test, expect } from '@playwright/test';

test.describe('DAG Explorer', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check main hero title is visible
    await expect(page.getByText('See How Spark')).toBeVisible();
    await expect(page.getByText('Actually Executes')).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: /Enter Playground/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View Scenarios/i })).toBeVisible();
  });

  test('tagline elements are visible', async ({ page }) => {
    await page.goto('/');
    
    // Check the philosophy tagline elements (exact match to avoid multiple hits)
    await expect(page.getByText('Explain', { exact: true })).toBeVisible();
    await expect(page.getByText('Simulate', { exact: true })).toBeVisible();
    await expect(page.getByText('Understand', { exact: true })).toBeVisible();
  });
});
