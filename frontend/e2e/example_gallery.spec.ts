import { test, expect } from '@playwright/test';

/**
 * Example Gallery E2E Tests
 * 
 * Tests the Example Gallery feature that provides pre-configured examples
 * organized by category for quick learning and experimentation.
 * 
 * Core principles:
 * - Examples are categorized for easy discovery
 * - Each example teaches a specific concept
 * - Examples can be loaded instantly
 * - Gallery is searchable/filterable
 */
test.describe('Example Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('example gallery can be opened', async ({ page }) => {
    // Gallery button should be visible
    await expect(page.getByTestId('open-gallery')).toBeVisible();
    
    // Click to open gallery
    await page.getByTestId('open-gallery').click();
    
    // Gallery modal should appear
    await expect(page.getByTestId('example-gallery')).toBeVisible();
  });

  test('examples are organized by categories', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Categories should be visible
    await expect(page.getByTestId('category-basics')).toBeVisible();
    await expect(page.getByTestId('category-shuffle')).toBeVisible();
    await expect(page.getByTestId('category-joins')).toBeVisible();
    await expect(page.getByTestId('category-performance')).toBeVisible();
  });

  test('selecting a category filters examples', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Select a category
    await page.getByTestId('category-joins').click();
    
    // Only join examples should be visible
    await expect(page.getByTestId('example-broadcast-join')).toBeVisible();
    await expect(page.getByTestId('example-sort-merge-join')).toBeVisible();
    
    // Non-join examples should not be visible
    await expect(page.getByTestId('example-simple-filter')).not.toBeVisible();
  });

  test('loading an example populates playground state', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Load an example
    await page.getByTestId('example-broadcast-join').click();
    
    // Gallery should close
    await expect(page.getByTestId('example-gallery')).not.toBeVisible();
    
    // Playground should have the example loaded
    await expect(page.getByTestId('chain-op-filter')).toBeVisible();
    await expect(page.getByTestId('chain-op-join')).toBeVisible();
  });

  test('examples show preview before loading', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Hover over example (or click to preview)
    const example = page.getByTestId('example-broadcast-join');
    await example.hover();
    
    // Preview should show description and operations
    await expect(page.getByTestId('example-preview')).toBeVisible();
    await expect(page.getByTestId('example-preview')).toContainText(/broadcast/i);
  });

  test('gallery can be searched', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Search for specific example
    await page.getByTestId('gallery-search').fill('skew');
    
    // Only skew-related examples should be visible
    await expect(page.getByTestId('example-skewed-groupby')).toBeVisible();
    
    // Other examples should be hidden
    await expect(page.getByTestId('example-simple-filter')).not.toBeVisible();
  });

  test('examples have difficulty indicators', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Each example should show difficulty
    const example = page.getByTestId('example-simple-filter');
    await expect(example.getByText(/beginner/i)).toBeVisible();
  });

  test('loading example shows confirmation if current work exists', async ({ page }) => {
    // Add some operations first
    await page.getByTestId('add-filter').click();
    
    // Open gallery and try to load example
    await page.getByTestId('open-gallery').click();
    await page.getByTestId('example-broadcast-join').click();
    
    // Confirmation dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/current work will be lost/i)).toBeVisible();
  });

  test('examples include expected outcome description', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Select example to see details
    await page.getByTestId('example-broadcast-join').click({ force: true });
    
    // Example should include what the user will learn
    // (Either in preview or after loading)
  });

  test('gallery shows example count per category', async ({ page }) => {
    // Open gallery
    await page.getByTestId('open-gallery').click();
    
    // Categories should show count
    const category = page.getByTestId('category-joins');
    await expect(category).toContainText(/\d+ example/i);
  });
});
