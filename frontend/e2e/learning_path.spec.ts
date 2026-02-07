/**
 * E2E tests for Learning Path UI
 *
 * Tests progressive unlocking, visual state, and user interactions
 * with the tutorial group progression system.
 */

import { test, expect } from '@playwright/test';

test.describe('Learning Path', () => {
  test('shows all 10 tutorial groups in correct order', async ({ page }) => {
    await page.goto('/learn');

    // Verify all 10 groups are present
    const groups = page.locator('[data-testid^="group-"]');
    await expect(groups).toHaveCount(10);

    // Verify group numbers are sequential
    await expect(page.locator('[data-testid="group-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="group-10"]')).toBeVisible();
  });

  test('shows Group 1 unlocked for new user', async ({ page }) => {
    await page.goto('/learn');

    // Group 1 should be unlocked (not have locked visual indicator)
    const group1 = page.locator('[data-testid="group-1"]');
    await expect(group1).toBeVisible();
    await expect(group1.locator('[data-testid="lock-icon"]')).not.toBeVisible();
    await expect(group1.locator('[data-testid="unlock-icon"]')).toBeVisible();
  });

  test('shows Groups 2-10 locked for new user', async ({ page }) => {
    await page.goto('/learn');

    // All other groups should be locked
    for (let i = 2; i <= 10; i++) {
      const group = page.locator(`[data-testid="group-${i}"]`);
      await expect(group.locator('[data-testid="lock-icon"]')).toBeVisible();
    }
  });

  test('displays group metadata correctly', async ({ page }) => {
    await page.goto('/learn');

    const group1 = page.locator('[data-testid="group-1"]');

    // Check title, subtitle, icon presence
    await expect(group1.locator('[data-testid="group-title"]')).toContainText('Spark Mental Model');
    await expect(group1.locator('[data-testid="group-subtitle"]')).toContainText('Foundation');
    await expect(group1.locator('[data-testid="group-icon"]')).toBeVisible();
  });

  test('shows progress bar for groups', async ({ page }) => {
    await page.goto('/learn');

    const group1 = page.locator('[data-testid="group-1"]');
    const progressBar = group1.locator('[data-testid="progress-bar"]');
    
    await expect(progressBar).toBeVisible();
    
    // For new user, progress should be 0%
    const progressFill = progressBar.locator('[data-testid="progress-fill"]');
    await expect(progressFill).toHaveCSS('width', '0%');
  });

  test('locked groups show unlock requirements on hover', async ({ page }) => {
    await page.goto('/learn');

    const group2 = page.locator('[data-testid="group-2"]');
    
    // Hover to reveal tooltip
    await group2.hover();
    
    const tooltip = page.locator('[data-testid="unlock-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('80%'); // Shows 80% requirement
  });

  test('clicking unlocked group navigates to group page', async ({ page }) => {
    await page.goto('/learn');

    const group1 = page.locator('[data-testid="group-1"]');
    await group1.click();

    // Should navigate to group detail page
    await expect(page).toHaveURL(/\/learn\/spark-mental-model/);
  });

  test('clicking locked group shows unlock modal', async ({ page }) => {
    await page.goto('/learn');

    const group2 = page.locator('[data-testid="group-2"]');
    await group2.click();

    // Should show modal explaining unlock requirements
    const modal = page.locator('[data-testid="unlock-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Complete 80%');
    await expect(modal).toContainText('Spark Mental Model'); // Previous group name
  });

  test('visual distinction between unlocked, in-progress, and locked groups', async ({ page }) => {
    await page.goto('/learn');

    // Unlocked group (Group 1) - should have bright colors, clickable
    const group1 = page.locator('[data-testid="group-1"]');
    await expect(group1).not.toHaveClass(/opacity-50/);

    // Locked group (Group 2) - should be dimmed
    const group2 = page.locator('[data-testid="group-2"]');
    await expect(group2).toHaveClass(/opacity-50/);
  });

  test('completion badge shown for 100% completed groups', async ({ page }) => {
    // Mock user with completed group 1
    await page.route('**/api/tutorials/learning-path-status', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'spark-mental-model',
            number: 1,
            title: 'Spark Mental Model',
            subtitle: 'Foundation',
            icon: 'Brain',
            color: 'blue',
            unlocked: true,
            completed: true,
            progress_percentage: 100.0,
            total_tutorials: 2,
            completed_tutorials: 2
          },
          // ... other groups locked
        ]
      });
    });

    await page.goto('/learn');

    const group1 = page.locator('[data-testid="group-1"]');
    await expect(group1.locator('[data-testid="completion-badge"]')).toBeVisible();
    await expect(group1.locator('[data-testid="completion-badge"]')).toContainText('✓');
  });

  test('responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/learn');

    // Groups should stack vertically
    const groups = page.locator('[data-testid^="group-"]');
    await expect(groups.first()).toBeVisible();
    
    // Should be able to scroll through all groups
    await page.locator('[data-testid="group-10"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="group-10"]')).toBeVisible();
  });

  test('sequential unlocking flow simulation', async ({ page }) => {
    // Mock scenario where user completed 80% of group 1
    await page.route('**/api/tutorials/learning-path-status', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'spark-mental-model',
            number: 1,
            unlocked: true,
            completed: false,
            progress_percentage: 80.0,
            completed_tutorials: 2,
            total_tutorials: 2
          },
          {
            id: 'data-partitioning',
            number: 2,
            unlocked: true, // Should unlock at 80%
            completed: false,
            progress_percentage: 0,
            completed_tutorials: 0,
            total_tutorials: 2
          },
          // Groups 3-10 locked...
        ]
      });
    });

    await page.goto('/learn');

    // Group 2 should now be unlocked
    const group2 = page.locator('[data-testid="group-2"]');
    await expect(group2.locator('[data-testid="lock-icon"]')).not.toBeVisible();
    await expect(group2.locator('[data-testid="unlock-icon"]')).toBeVisible();
  });
});
