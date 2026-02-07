import { test, expect } from '@playwright/test';

/**
 * Upload Page E2E Tests
 * 
 * Tests the event log and notebook upload functionality.
 * Feature 5: Notebook Upload (Static Intent Extraction)
 */
test.describe('Upload Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload', { waitUntil: 'networkidle' });
  });

  test('upload page loads correctly', async ({ page }) => {
    // Check title - h1 element with new text
    await expect(page.getByText('Upload Artifacts')).toBeVisible();
    
    // Check upload area
    await expect(page.getByText('Click to upload or drag and drop')).toBeVisible();
  });

  test('shows supported file formats', async ({ page }) => {
    // Check that file format info is visible
    await expect(page.getByText('.json', { exact: true })).toBeVisible();
    await expect(page.getByText('.ipynb', { exact: true })).toBeVisible();
  });

  test('shows file size limit', async ({ page }) => {
    await expect(page.getByText(/Max file size.*100MB|100MB/i)).toBeVisible();
  });

  test('has navigation back to home', async ({ page }) => {
    // Check for the Spark Sword brand link in navbar (first one, not footer)
    await expect(page.getByRole('navigation').getByText('Spark Sword')).toBeVisible();
  });

  test('shows description mentioning notebooks and event logs', async ({ page }) => {
    // Updated description mentioning both types
    await expect(page.getByText(/event logs/i).first()).toBeVisible();
  });
});

