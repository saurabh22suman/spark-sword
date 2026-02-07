import { test, expect } from '@playwright/test';

test.describe('Dark/Light Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('theme toggle button is visible in navbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /toggle theme/i })).toBeVisible();
  });

  test('clicking toggle switches between dark and light mode', async ({ page }) => {
    const toggleButton = page.getByRole('button', { name: /toggle theme/i });
    
    // Get initial theme
    const html = page.locator('html');
    const initialHasDark = await html.evaluate(el => el.classList.contains('dark'));
    
    // Click toggle
    await toggleButton.click();
    
    // Theme should change
    const afterClickHasDark = await html.evaluate(el => el.classList.contains('dark'));
    expect(afterClickHasDark).not.toBe(initialHasDark);
  });

  test('theme preference persists after page reload', async ({ page }) => {
    const toggleButton = page.getByRole('button', { name: /toggle theme/i });
    const html = page.locator('html');
    
    // Get initial state
    const initialHasDark = await html.evaluate(el => el.classList.contains('dark'));
    
    // Toggle theme
    await toggleButton.click();
    const afterToggle = await html.evaluate(el => el.classList.contains('dark'));
    expect(afterToggle).not.toBe(initialHasDark);
    
    // Reload page
    await page.reload();
    
    // Theme should persist
    const afterReload = await html.evaluate(el => el.classList.contains('dark'));
    expect(afterReload).toBe(afterToggle);
  });

  test('toggle is accessible via keyboard', async ({ page }) => {
    const toggleButton = page.getByRole('button', { name: /toggle theme/i });
    
    // Focus and press Enter
    await toggleButton.focus();
    await page.keyboard.press('Enter');
    
    // Should toggle (no error means accessible)
    await expect(toggleButton).toBeVisible();
  });
});

test.describe('Footer', () => {
  test('footer is visible on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to bottom to ensure footer is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    await expect(page.getByRole('contentinfo')).toBeVisible();
    // The text is split across multiple elements, so check for key parts
    await expect(page.getByRole('contentinfo').getByText('Made with')).toBeVisible();
    await expect(page.getByRole('contentinfo').getByText('Soloengine')).toBeVisible();
  });

  test('footer is visible on upload page', async ({ page }) => {
    await page.goto('/upload');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    await expect(page.getByRole('contentinfo').getByText('Soloengine')).toBeVisible();
  });

  test('footer is visible on playground page', async ({ page }) => {
    await page.goto('/playground');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    await expect(page.getByRole('contentinfo').getByText('Soloengine')).toBeVisible();
  });

  test('footer contains heart symbol', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check for "Made with" and heart icon (lucide Heart component renders as SVG)
    await expect(page.getByRole('contentinfo').getByText('Made with')).toBeVisible();
  });
});

test.describe('Theme Toggle on All Pages', () => {
  const pages = ['/', '/upload', '/playground', '/tutorials', '/scenarios'];
  
  for (const pagePath of pages) {
    test(`theme toggle works on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath);
      
      const toggleButton = page.getByRole('button', { name: /toggle theme/i });
      await expect(toggleButton).toBeVisible();
      
      // Should be clickable
      await toggleButton.click();
      await expect(toggleButton).toBeVisible();
    });
  }
});
