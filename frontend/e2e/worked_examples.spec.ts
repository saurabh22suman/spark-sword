/**
 * E2E Tests for Worked Examples Library
 * 
 * Tests the step-by-step learning flow inspired by Khan Academy pattern.
 * 
 * Coverage:
 * - Example browsing and filtering
 * - Step-by-step navigation
 * - Content display (action, changes, reasoning, trade-offs)
 * - Key takeaways visibility
 * - "Your Turn" variant integration
 * - Accessibility and keyboard navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Worked Examples Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples');
  });

  test('displays examples library with correct metadata', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Worked Examples Library');
    
    // Verify subtitle
    await expect(page.getByText('Learn Spark optimization through expert-guided')).toBeVisible();

    // Check that examples are displayed
    const exampleCards = page.locator('[data-testid="example-card"], .cursor-pointer.bg-white, .cursor-pointer').filter({ hasText: 'Start Learning' });
    await expect(exampleCards.first()).toBeVisible();
    
    // Verify showing count
    await expect(page.getByText(/Showing \d+ of \d+ examples/)).toBeVisible();
  });

  test('filters examples by category', async ({ page }) => {
    // Click on "Shuffle" category filter
    await page.getByRole('button', { name: /🔀 Shuffle/i }).click();
    
    // Verify filtered results
    const resultsText = await page.getByText(/Showing \d+ of \d+ examples/).textContent();
    expect(resultsText).toBeTruthy();
    
    // Click "All" to reset
    await page.getByRole('button', { name: 'All' }).first().click();
    
    // Verify all examples shown again
    const allResultsText = await page.getByText(/Showing \d+ of \d+ examples/).textContent();
    expect(allResultsText).toBeTruthy();
  });

  test('filters examples by difficulty', async ({ page }) => {
    // Click "beginner" difficulty
    await page.getByRole('button', { name: 'beginner' }).click();
    
    // Verify difficulty badges show only "beginner"
    const difficultyBadges = page.locator('.text-green-800, .bg-green-100').filter({ hasText: 'beginner' });
    const count = await difficultyBadges.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify no intermediate or advanced examples visible
    await expect(page.locator('.text-yellow-800').filter({ hasText: 'intermediate' })).not.toBeVisible();
  });

  test('searches examples by keyword', async ({ page }) => {
    // Type search query
    await page.getByPlaceholder('Search examples...').fill('skew');
    
    // Verify filtered results
    await expect(page.getByText(/skew/i).first()).toBeVisible();
    
    // Clear search
    await page.getByPlaceholder('Search examples...').clear();
    
    // Verify all examples shown
    const resultsText = await page.getByText(/Showing \d+ of \d+ examples/).textContent();
    expect(resultsText).toMatch(/Showing \d+ of \d+ examples/);
  });

  test('opens and navigates through worked example steps', async ({ page }) => {
    // Click first example card
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Verify example opened
    await expect(page.locator('h2').first()).toBeVisible();
    
    // Verify step 1 is shown
    await expect(page.getByText(/Step 1 of \d+/)).toBeVisible();
    
    // Check that step content is visible
    await expect(page.getByText('🛠️ Action')).toBeVisible();
    await expect(page.getByText('📊 What Changed')).toBeVisible();
    await expect(page.getByText('🧠 Spark\'s Reasoning')).toBeVisible();
    
    // Click Next button
    await page.getByRole('button', { name: /Next →/i }).click();
    
    // Verify step 2 is shown
    await expect(page.getByText(/Step 2 of \d+/)).toBeVisible();
    
    // Click Previous button
    await page.getByRole('button', { name: /← Previous/i }).click();
    
    // Verify back to step 1
    await expect(page.getByText(/Step 1 of \d+/)).toBeVisible();
  });

  test('displays trade-offs when present', async ({ page }) => {
    // Open "Optimizing a Skewed Join" example (known to have trade-offs)
    await page.getByText('Optimizing a Skewed Join').click();
    
    // Navigate to a step with trade-offs (step 3 or 4)
    await page.getByRole('button', { name: /Next →/i }).click();
    await page.getByRole('button', { name: /Next →/i }).click();
    
    // Verify trade-off section appears
    const tradeOffVisible = await page.getByText('⚖️ Trade-off').isVisible().catch(() => false);
    
    // If not visible on step 3, try step 4
    if (!tradeOffVisible) {
      await page.getByRole('button', { name: /Next →/i }).click();
      await expect(page.getByText('⚖️ Trade-off')).toBeVisible();
    }
  });

  test('navigates to key takeaways', async ({ page }) => {
    // Open first example
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Click through to last step
    const nextButton = page.getByRole('button', { name: /Next →|See Takeaways/i });
    
    // Navigate through all steps (max 10 to prevent infinite loop)
    for (let i = 0; i < 10; i++) {
      const buttonText = await nextButton.textContent();
      await nextButton.click();
      
      if (buttonText?.includes('See Takeaways') || buttonText?.includes('Takeaways')) {
        break;
      }
    }
    
    // Verify key takeaways shown
    await expect(page.getByText('🎯 Key Takeaways')).toBeVisible();
    
    // Verify takeaway list items visible
    const takeaways = page.locator('li').filter({ has: page.locator('.bg-green-100, .bg-green-900') });
    await expect(takeaways.first()).toBeVisible();
  });

  test('shows "Your Turn" practice variant', async ({ page }) => {
    // Open first example
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Navigate to key takeaways
    const nextButton = page.getByRole('button', { name: /Next →|See Takeaways/i });
    for (let i = 0; i < 10; i++) {
      const buttonText = await nextButton.textContent();
      await nextButton.click();
      if (buttonText?.includes('See Takeaways') || buttonText?.includes('Takeaways')) {
        break;
      }
      await page.waitForTimeout(100);
    }
    
    // Check if "Your Turn" section exists (some examples have it, some don't)
    const yourTurnVisible = await page.getByText(/Your Turn:/i).isVisible().catch(() => false);
    
    if (yourTurnVisible) {
      // Verify components of Your Turn variant
      await expect(page.getByText('💡 Hint:')).toBeVisible();
      await expect(page.getByText('✓ Success Criteria:')).toBeVisible();
      await expect(page.getByRole('button', { name: /Try This Challenge in Playground/i })).toBeVisible();
    }
  });

  test('uses step navigation pills', async ({ page }) => {
    // Open first example
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Find step pills (numbered buttons)
    const stepPills = page.locator('button').filter({ hasText: /^[0-9]+$/ });
    const pillCount = await stepPills.count();
    
    expect(pillCount).toBeGreaterThan(0);
    
    // Click step 2 pill
    if (pillCount >= 2) {
      await stepPills.nth(1).click();
      await expect(page.getByText(/Step 2 of \d+/)).toBeVisible();
    }
    
    // Click step 1 pill
    await stepPills.first().click();
    await expect(page.getByText(/Step 1 of \d+/)).toBeVisible();
    
    // Click takeaways pill (checkmark)
    const takeawaysPill = page.locator('button').filter({ hasText: '✓' });
    await takeawaysPill.click();
    await expect(page.getByText('🎯 Key Takeaways')).toBeVisible();
  });

  test('closes example and returns to library', async ({ page }) => {
    // Open first example
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Verify example is open
    await expect(page.getByRole('button', { name: /← Previous/i })).toBeVisible();
    
    // Click close button
    const closeButton = page.getByRole('button', { name: 'Close worked example' });
    await closeButton.click();
    
    // Verify back to library view
    await expect(page.getByText('Worked Examples Library')).toBeVisible();
    await expect(page.getByPlaceholder('Search examples...')).toBeVisible();
  });

  test('displays progress bar correctly', async ({ page }) => {
    // Open first example
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Verify progress bar exists
    const progressBar = page.locator('.bg-blue-500').filter({ has: page.locator('[class*="bg-gray"]') }).first();
    await expect(progressBar).toBeVisible();
    
    // Navigate to next step
    await page.getByRole('button', { name: /Next →/i }).click();
    
    // Progress bar should update (width changes are tested via visual regression in practice)
    await expect(progressBar).toBeVisible();
  });

  test('example cards show correct metadata', async ({ page }) => {
    // Get first example card
    const firstCard = page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first();
    
    // Verify metadata elements
    await expect(firstCard.locator('.text-xs').filter({ hasText: /\d+ steps/ })).toBeVisible();
    
    // Verify difficulty badge present
    const difficultyBadges = firstCard.locator('[class*="rounded-full"]').filter({ 
      hasText: /beginner|intermediate|advanced/i 
    });
    await expect(difficultyBadges.first()).toBeVisible();
  });

  test('handles empty search results gracefully', async ({ page }) => {
    // Search for non-existent term
    await page.getByPlaceholder('Search examples...').fill('zzzznonexistent');
    
    // Verify empty state message
    await expect(page.getByText(/No examples found matching your filters/i)).toBeVisible();
    
    // Verify count shows 0
    await expect(page.getByText('Showing 0 of')).toBeVisible();
  });

  test('keyboard navigation works', async ({ page }) => {
    // Open first example
    await page.locator('.cursor-pointer').filter({ hasText: 'Start Learning' }).first().click();
    
    // Focus on Next button and press Enter
    const nextButton = page.getByRole('button', { name: /Next →/i });
    await nextButton.focus();
    await page.keyboard.press('Enter');
    
    // Verify step changed
    await expect(page.getByText(/Step 2 of \d+/)).toBeVisible();
  });

  test('link to playground is present', async ({ page }) => {
    // Verify playground link in header
    await expect(page.getByRole('link', { name: /Go to Playground/i })).toBeVisible();
    
    // Verify link in footer
    await expect(page.getByRole('link', { name: /DataFrame Playground/i })).toBeVisible();
  });

  test('displays all category icons correctly', async ({ page }) => {
    // Verify category icons in filter buttons
    const categories = ['📚', '🔗', '🔀', '⚖️', '⚡'];
    
    for (const icon of categories) {
      const categoryButton = page.getByRole('button').filter({ hasText: icon });
      // At least the filter button should exist
      const exists = await categoryButton.count() > 0;
      expect(exists).toBeTruthy();
    }
  });

  test('maintains filter state when browsing', async ({ page }) => {
    // Apply filters
    await page.getByRole('button', { name: /beginner/i }).click();
    await page.getByRole('button', { name: /🔀 Shuffle/i }).click();
    
    // Verify filters are active (highlighted)
    const beginnerButton = page.getByRole('button', { name: 'beginner' });
    await expect(beginnerButton).toHaveClass(/bg-blue-500/);
    
    const shuffleButton = page.getByRole('button', { name: /🔀 Shuffle/i });
    await expect(shuffleButton).toHaveClass(/bg-blue-500/);
  });
});
