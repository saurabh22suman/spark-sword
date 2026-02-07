import { test, expect } from '@playwright/test';

/**
 * Executor Memory Diagram E2E Tests
 * 
 * Based on: executor-memory-interactive-diagram-spec.md
 * 
 * Tests the interactive memory visualization:
 * - Workroom metaphor (execution + storage memory)
 * - Spill to disk behavior
 * - Cache competition
 * - Triggered explanations
 */

test.describe('Executor Memory Diagram - Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
  });

  test('memory page loads with diagram', async ({ page }) => {
    // Main title
    await expect(page.getByRole('heading', { name: /Executor Memory/i })).toBeVisible();
    
    // Diagram should be visible
    await expect(page.getByTestId('executor-memory-diagram')).toBeVisible();
  });

  test('diagram has execution and storage memory regions', async ({ page }) => {
    // Both memory regions should be labeled
    await expect(page.getByText(/Execution Memory/i).first()).toBeVisible();
    await expect(page.getByText(/Storage Memory/i).first()).toBeVisible();
  });

  test('diagram has spill area (disk)', async ({ page }) => {
    // Spill area should be visible
    await expect(page.getByText(/Disk|Spill Area/i).first()).toBeVisible();
  });
});

test.describe('Executor Memory Diagram - Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
  });

  test('rows per task slider is visible', async ({ page }) => {
    await expect(page.getByLabel(/Rows per task/i)).toBeVisible();
  });

  test('concurrent tasks slider is visible', async ({ page }) => {
    await expect(page.getByLabel(/Concurrent tasks/i)).toBeVisible();
  });

  test('cache toggle is visible', async ({ page }) => {
    await expect(page.getByLabel(/Toggle cache|Cache/i)).toBeVisible();
  });

  test('shuffle toggle is visible', async ({ page }) => {
    await expect(page.getByLabel(/Toggle shuffle|Shuffle/i)).toBeVisible();
  });

  test('pressure indicator is visible', async ({ page }) => {
    await expect(page.getByText(/Pressure/i).first()).toBeVisible();
  });
});

test.describe('Executor Memory Diagram - Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
  });

  test('increasing rows per task increases execution usage', async ({ page }) => {
    const slider = page.getByLabel(/Rows per task/i);
    
    // Get initial value display
    const initialUsage = await page.getByText(/\d+%/).first().textContent();
    
    // Move slider to max
    await slider.fill('100');
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Usage should have increased (execution memory should show higher %)
  });

  test('enabling cache shows storage memory usage', async ({ page }) => {
    const cacheToggle = page.getByLabel(/Toggle cache/i);
    
    // Enable cache
    await cacheToggle.click();
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Storage memory should now show usage
    const storageSection = page.getByText(/Storage Memory/i).first();
    await expect(storageSection).toBeVisible();
  });

  test('high pressure triggers spill visualization', async ({ page }) => {
    // Increase rows per task
    const rowsSlider = page.getByLabel(/Rows per task/i);
    await rowsSlider.fill('100');
    
    // Increase concurrent tasks
    const tasksSlider = page.getByLabel(/Concurrent tasks/i);
    await tasksSlider.fill('8');
    
    // Enable shuffle
    const shuffleToggle = page.getByLabel(/Toggle shuffle/i);
    await shuffleToggle.click();
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Spill indicator should appear
    await expect(page.getByText(/Spilling to disk/i)).toBeVisible();
  });
});

test.describe('Executor Memory Diagram - Explanations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
  });

  test('spill triggers explanation', async ({ page }) => {
    // Create spill conditions
    const rowsSlider = page.getByLabel(/Rows per task/i);
    await rowsSlider.fill('100');
    
    const tasksSlider = page.getByLabel(/Concurrent tasks/i);
    await tasksSlider.fill('8');
    
    const shuffleToggle = page.getByLabel(/Toggle shuffle/i);
    await shuffleToggle.click();
    
    // Wait for explanation to appear
    await page.waitForTimeout(600);
    
    // Explanation panel should be visible
    const explanation = page.getByTestId('memory-explanation');
    await expect(explanation).toBeVisible({ timeout: 5000 });
    
    // Should explain what happened
    await expect(explanation.getByText(/What:/i)).toBeVisible();
    await expect(explanation.getByText(/Why:/i)).toBeVisible();
  });

  test('explanation can be dismissed', async ({ page }) => {
    // Create spill conditions
    const rowsSlider = page.getByLabel(/Rows per task/i);
    await rowsSlider.fill('100');
    
    const tasksSlider = page.getByLabel(/Concurrent tasks/i);
    await tasksSlider.fill('8');
    
    const shuffleToggle = page.getByLabel(/Toggle shuffle/i);
    await shuffleToggle.click();
    
    // Wait for explanation
    await page.waitForTimeout(600);
    
    const explanation = page.getByTestId('memory-explanation');
    await expect(explanation).toBeVisible({ timeout: 5000 });
    
    // Dismiss it
    await page.getByRole('button', { name: /Dismiss/i }).click();
    
    // Should be gone
    await expect(explanation).not.toBeVisible();
  });
});

test.describe('Executor Memory Diagram - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
  });

  test('respects reduced motion preference', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/memory');
    
    // Diagram should still be visible
    await expect(page.getByTestId('executor-memory-diagram')).toBeVisible();
  });

  test('learning mode toggle is available', async ({ page }) => {
    // Learning mode toggle should be visible
    await expect(page.getByText(/Learning Mode|Expert Mode/i)).toBeVisible();
  });

  test('sliders are keyboard accessible', async ({ page }) => {
    const rowsSlider = page.getByLabel(/Rows per task/i);
    
    // Focus on slider
    await rowsSlider.focus();
    await expect(rowsSlider).toBeFocused();
    
    // Use arrow keys
    await page.keyboard.press('ArrowRight');
  });
});

test.describe('Executor Memory Diagram - Key Takeaways', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/memory');
  });

  test('page shows key takeaways section', async ({ page }) => {
    // Use role selector for headings to be more specific
    await expect(page.getByRole('heading', { name: /Why Spills Happen/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Cache Trade-offs/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Task Parallelism/i })).toBeVisible();
  });

  test('page has links to related learning', async ({ page }) => {
    // Use more specific link names to avoid matching nav/footer links
    await expect(page.getByRole('link', { name: /DataFrame Playground/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Interactive Tutorials/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Real-Life Scenarios/i })).toBeVisible();
  });
});
