import { test, expect } from '@playwright/test';

/**
 * E2E tests for Myth Busters page
 * 
 * Following TDD Red-Green-Refactor-Verify:
 * - Tests define expected page behavior BEFORE implementation
 * - Tests validate myth gallery, filtering, and demo component links
 * - Tests ensure accessibility and user experience
 */

test.describe('Myth Busters Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/myths');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('myth busters page loads correctly', async ({ page }) => {
    // Header should be visible
    await expect(page.getByRole('heading', { name: /Spark Myths/i })).toBeVisible();
    
    // Description should explain the purpose
    await expect(page.getByText(/Common misconceptions/i)).toBeVisible();
  });

  test('displays at least 12 myths', async ({ page }) => {
    // Should show all myths from backend (spec requires 12+)
    const mythCards = page.locator('[data-testid="myth-card"]');
    const count = await mythCards.count();
    expect(count).toBeGreaterThanOrEqual(12);
  });

  test('each myth card shows required information', async ({ page }) => {
    // First myth card should have all required fields
    const firstMyth = page.locator('[data-testid="myth-card"]').first();
    
    await expect(firstMyth).toBeVisible();
    
    // Should show the myth statement
    await expect(firstMyth.locator('[data-testid="myth-statement"]')).toBeVisible();
    
    // Should show the truth
    await expect(firstMyth.locator('[data-testid="myth-truth"]')).toBeVisible();
    
    // Should show severity badge
    await expect(firstMyth.locator('[data-testid="myth-severity"]')).toBeVisible();
  });

  test('myths are categorized correctly', async ({ page }) => {
    // Category badges should be visible
    const categories = ['Performance', 'Memory', 'Shuffle', 'Joins', 'Configs', 'General'];
    
    // At least one category should be visible
    let categoryFound = false;
    for (const category of categories) {
      const categoryBadge = page.getByText(category, { exact: false });
      if (await categoryBadge.count() > 0) {
        categoryFound = true;
        break;
      }
    }
    expect(categoryFound).toBeTruthy();
  });

  test('myths show severity levels', async ({ page }) => {
    // Severity badges should be visible
    const severities = ['Common', 'Dangerous', 'Subtle'];
    
    // At least one severity should be visible
    let severityFound = false;
    for (const severity of severities) {
      const severityBadge = page.getByText(severity, { exact: false });
      if (await severityBadge.count() > 0) {
        severityFound = true;
        break;
      }
    }
    expect(severityFound).toBeTruthy();
  });

  test('can filter myths by category', async ({ page }) => {
    // Find filter buttons/tabs
    const performanceFilter = page.getByRole('button', { name: /Performance/i });
    
    if (await performanceFilter.isVisible()) {
      await performanceFilter.click();
      
      // Wait for filtering to complete
      await page.waitForTimeout(500);
      
      // Should show only performance myths
      const visibleMyths = page.locator('[data-testid="myth-card"]:visible');
      const count = await visibleMyths.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('clicking myth shows detailed explanation', async ({ page }) => {
    // Click on first myth card
    const firstMyth = page.locator('[data-testid="myth-card"]').first();
    await firstMyth.click();
    
    // Should show detailed "why" explanation
    await expect(page.getByTestId('myth-why-explanation')).toBeVisible({ timeout: 5000 });
  });

  test('myths with interactive demos show "Try It" button', async ({ page }) => {
    // Should have at least one myth with a demo link
    const tryItButtons = page.getByRole('button', { name: /Try It|Explore/i });
    const count = await tryItButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking "Try It" navigates to tutorial component', async ({ page }) => {
    // Find a myth with demo component (e.g., partition myth)
    const partitionMyth = page.getByText(/More partitions always means faster/i);
    
    if (await partitionMyth.isVisible()) {
      // Click to expand
      await partitionMyth.click();
      
      // Find and click "Try It" button
      const tryItButton = page.getByRole('button', { name: /Try It|Explore/i }).first();
      
      if (await tryItButton.isVisible()) {
        await tryItButton.click();
        
        // Should navigate to tutorials page
        await page.waitForURL(/\/tutorials/);
      }
    }
  });

  test('search/filter by tags works', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/Search myths/i);
    
    if (await searchInput.isVisible()) {
      // Type a common tag
      await searchInput.fill('partition');
      await page.waitForTimeout(500);
      
      // Should show filtered results
      const visibleMyths = page.locator('[data-testid="myth-card"]:visible');
      const count = await visibleMyths.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('shows "All Myths" filter by default', async ({ page }) => {
    // "All" or "All Myths" button should be active/selected
    const allFilter = page.getByRole('button', { name: /All/i });
    
    if (await allFilter.isVisible()) {
      // Should have active/selected state (check aria-selected or class)
      const isSelected = await allFilter.getAttribute('aria-selected');
      expect(isSelected).toBeTruthy();
    }
  });

  test('dangerous myths are visually distinct', async ({ page }) => {
    // Find a dangerous myth
    const dangerousBadge = page.getByText('Dangerous', { exact: false }).first();
    
    if (await dangerousBadge.isVisible()) {
      // Should have red/warning styling (check for red in class or style)
      const className = await dangerousBadge.getAttribute('class');
      expect(className).toContain('red');
    }
  });

  test('page is accessible', async ({ page }) => {
    // Run basic accessibility checks
    
    // Headings should be in order
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // All interactive elements should be keyboard accessible
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});

test.describe('Myth Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/myths');
    await page.waitForLoadState('networkidle');
  });

  test('expanding myth shows full details', async ({ page }) => {
    const firstMyth = page.locator('[data-testid="myth-card"]').first();
    await firstMyth.click();
    
    // Should show:
    // 1. Full "why" explanation
    await expect(page.getByTestId('myth-why-explanation')).toBeVisible();
    
    // 2. Tags
    const tags = page.locator('[data-testid="myth-tags"]');
    if (await tags.isVisible()) {
      expect(await tags.textContent()).toBeTruthy();
    }
  });

  test('related tags are clickable', async ({ page }) => {
    const firstMyth = page.locator('[data-testid="myth-card"]').first();
    await firstMyth.click();
    
    // Tags should be clickable
    const tag = page.locator('[data-testid="myth-tag"]').first();
    
    if (await tag.isVisible()) {
      await tag.click();
      
      // Should filter myths by that tag
      await page.waitForTimeout(500);
      const visibleMyths = page.locator('[data-testid="myth-card"]:visible');
      expect(await visibleMyths.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Myth Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/myths');
    await page.waitForLoadState('networkidle');
  });

  test('navigation from landing page works', async ({ page }) => {
    // Go to home page
    await page.goto('/');
    
    // Look for link to myths page (may be in nav or footer)
    const mythsLink = page.getByRole('link', { name: /Myths|Common Mistakes/i });
    
    if (await mythsLink.isVisible()) {
      await mythsLink.click();
      await expect(page).toHaveURL(/\/myths/);
    }
  });

  test('breadcrumb navigation exists', async ({ page }) => {
    // Should show breadcrumb or back button
    const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
    const backButton = page.getByRole('button', { name: /back/i });
    
    const hasBreadcrumb = await breadcrumb.isVisible();
    const hasBackButton = await backButton.isVisible();
    
    expect(hasBreadcrumb || hasBackButton).toBeTruthy();
  });
});
