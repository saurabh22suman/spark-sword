import { test, expect } from '@playwright/test';

test.describe('DAG Explorer', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check main title is visible (use heading role for the h1 on homepage)
    await expect(page.getByRole('heading', { name: 'Spark-Sword' })).toBeVisible();
    
    // Check philosophy section
    await expect(page.getByText('Our Philosophy')).toBeVisible();
    
    // Check CTA buttons
    await expect(page.getByRole('link', { name: 'Upload Event Log' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'DataFrame Playground' })).toBeVisible();
  });

  test('tagline elements are visible', async ({ page }) => {
    await page.goto('/');
    
    // Use more specific locators for the tagline cards
    await expect(page.locator('.font-semibold').filter({ hasText: 'Explain' })).toBeVisible();
    await expect(page.locator('.font-semibold').filter({ hasText: 'Simulate' })).toBeVisible();
    await expect(page.locator('.font-semibold').filter({ hasText: 'Suggest' })).toBeVisible();
  });
});
