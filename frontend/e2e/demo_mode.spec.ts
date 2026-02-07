import { test, expect } from '@playwright/test';

/**
 * Demo Mode E2E Tests
 * 
 * Feature 6: Sample Canonical Spark Job
 * Tests the demo mode functionality for exploring Spark without uploading files.
 */
test.describe('Demo Mode', () => {
  test.describe('Home Page', () => {
    test('shows upload link on home page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Should have Upload Your Logs link
      await expect(page.getByText('Upload Your Logs')).toBeVisible();
    });

    test('upload link navigates to upload page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Click the upload link
      await page.getByText('Upload Your Logs').click();
      
      // Should navigate to /upload
      await expect(page).toHaveURL(/\/upload/);
    });
  });

  test.describe('Demo Endpoint Integration', () => {
    test('demo endpoint returns valid data', async ({ page }) => {
      // Call the API directly
      const response = await page.request.get('/api/demo');
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      
      // Check required fields
      expect(data.is_demo).toBe(true);
      expect(data.demo_label).toContain('Demo Data');
      expect(data.dag).toBeDefined();
      expect(data.insights).toBeDefined();
    });
  });

  test.describe('Analysis Page with Demo Data', () => {
    test('analysis page shows demo banner via API', async ({ page }) => {
      // First fetch demo data through the API
      const response = await page.request.get('/api/demo');
      const demoData = await response.json();
      
      // Navigate to home first to set up the domain context
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Set the sessionStorage
      await page.evaluate((data) => {
        window.sessionStorage.setItem('analysisResult', JSON.stringify(data));
      }, demoData);
      
      // Navigate to analysis
      await page.goto('/analysis', { waitUntil: 'networkidle' });
      
      // Should show demo banner
      await expect(page.getByText(/Demo Data/)).toBeVisible({ timeout: 10000 });
    });
  });
});
