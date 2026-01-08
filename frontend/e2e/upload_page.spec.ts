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
    // Check title - h2 element (updated text)
    await expect(page.getByText('Upload Spark Files')).toBeVisible();
    
    // Check upload area
    await expect(page.getByText('Drop your file here')).toBeVisible();
    await expect(page.getByText('or click to browse')).toBeVisible();
  });

  test('shows supported file formats for event logs', async ({ page }) => {
    await expect(page.getByText('Event Logs (analyze past runs)')).toBeVisible();
    await expect(page.getByText('.json')).toBeVisible();
    await expect(page.getByText('.txt')).toBeVisible();
    await expect(page.getByText('.log')).toBeVisible();
  });

  test('shows supported file formats for notebooks', async ({ page }) => {
    // Feature 5: Notebook upload support
    await expect(page.getByText('Notebooks (extract intent)')).toBeVisible();
    await expect(page.getByText('.ipynb')).toBeVisible();
    await expect(page.getByText('.py')).toBeVisible();
  });

  test('shows file size limit', async ({ page }) => {
    await expect(page.getByText('Max 100MB')).toBeVisible();
  });

  test('shows help section for finding event logs', async ({ page }) => {
    await expect(page.getByText('Where to find event logs')).toBeVisible();
    await expect(page.getByText('Databricks')).toBeVisible();
    await expect(page.getByText('Local Spark')).toBeVisible();
  });

  test('shows privacy notice', async ({ page }) => {
    await expect(page.getByText(/Your data stays private/)).toBeVisible();
  });

  test('has link back to home', async ({ page }) => {
    // Check for the Spark-Sword brand link
    await expect(page.locator('h1').filter({ hasText: 'Spark-Sword' })).toBeVisible();
  });

  test('shows description mentioning notebooks and event logs', async ({ page }) => {
    // Feature 5: Updated description mentioning both types
    await expect(page.getByText(/event logs to analyze/i)).toBeVisible();
    await expect(page.getByText(/notebooks to.*extract intent/i)).toBeVisible();
  });
});
