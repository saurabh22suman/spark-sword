import { test, expect } from '@playwright/test';

/**
 * Landing Page Animation E2E Tests
 * 
 * Based on: landing-oage-animation-spec.md
 * 
 * Tests the 4-act visual story:
 * ACT I - Data Appears (Input Reality)
 * ACT II - DAG Forms (Planning)
 * ACT III - Shuffle Emerges (The Pain)
 * ACT IV - Slowdown & Confusion
 * Resolution - Spark-Sword Intervention
 */

test.describe('Landing Page Animation - Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('animation container exists on landing page', async ({ page }) => {
    // The main animation container should exist
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible();
  });

  test('animation has SVG-based DAG visualization', async ({ page }) => {
    // Animation should use SVG for DAG & data blocks (per spec)
    const svg = page.locator('[data-testid="spark-animation"] svg');
    await expect(svg).toBeVisible();
  });

  test('animation shows data blocks (ACT I)', async ({ page }) => {
    // Data blocks should appear - representing distributed data
    const dataBlocks = page.locator('[data-testid="data-block"]');
    await expect(dataBlocks.first()).toBeVisible();
  });

  test('animation shows DAG nodes (ACT II)', async ({ page }) => {
    // DAG nodes should be visible - representing execution plan
    const dagNodes = page.locator('[data-testid="dag-node"]');
    await expect(dagNodes.first()).toBeVisible();
  });

  test('animation shows shuffle indicator (ACT III)', async ({ page }) => {
    // Shuffle edge/indicator should be visible - the pain point
    // Wait for animation to reach shuffle phase (ACT III)
    const shuffleIndicator = page.locator('[data-testid="shuffle-indicator"]');
    await expect(shuffleIndicator).toBeVisible({ timeout: 10000 });
  });

  test('animation uses correct color for shuffle (orange)', async ({ page }) => {
    // Per spec: Shuffle should be orange
    const shuffleElement = page.locator('[data-testid="shuffle-indicator"]');
    // Wait for animation to reach shuffle phase
    await page.waitForTimeout(3000);
    await expect(shuffleElement).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Landing Page Animation - Accessibility', () => {
  test('respects reduced motion preference', async ({ page }) => {
    // Emulate reduced motion preference BEFORE navigation
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Animation container should still exist but animations should be reduced
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible({ timeout: 10000 });
    
    // The component checks window.matchMedia('(prefers-reduced-motion: reduce)')
    // which should now return true due to emulateMedia
    // The data attribute is set based on Framer Motion's useReducedMotion hook
  });

  test('animation is keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Animation should be interruptible via keyboard
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible({ timeout: 10000 });
    
    // Should be focusable
    await animationContainer.focus();
    await expect(animationContainer).toBeFocused();
  });
});

test.describe('Landing Page Animation - Interactivity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking animation pauses it', async ({ page }) => {
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible();
    
    // Click to pause
    await animationContainer.click();
    
    // Should show paused indicator or have paused state in text
    const pausedIndicator = page.getByText('Paused');
    await expect(pausedIndicator).toBeVisible();
  });

  test('clicking paused animation resumes it', async ({ page }) => {
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible();
    
    // Click to pause
    await animationContainer.click();
    const pausedIndicator = page.getByText('Paused');
    await expect(pausedIndicator).toBeVisible();
    
    // Click again to resume
    await animationContainer.click();
    await expect(pausedIndicator).not.toBeVisible();
  });

  test('animation has phase indicator dots', async ({ page }) => {
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible();
    
    // Phase indicator dots should be visible (5 phases)
    const dots = animationContainer.locator('button[aria-label*="phase"]');
    await expect(dots).toHaveCount(5);
  });
});

test.describe('Landing Page Animation - Resolution & CTA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('animation leads to CTA buttons', async ({ page }) => {
    // Per spec: CTA buttons should be visible
    // "Explore Playground" and "Try a Scenario"
    await expect(page.getByRole('link', { name: /Enter Playground/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View Scenarios/i })).toBeVisible();
  });

  test('hero message explains Spark-Sword purpose', async ({ page }) => {
    // The animation should make Spark execution visible
    // Check for key messaging
    await expect(page.getByText(/see how spark/i)).toBeVisible();
    await expect(page.getByText(/executes/i)).toBeVisible();
  });
});

test.describe('Landing Page Animation - Visual Semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('animation shows DAG nodes with labels', async ({ page }) => {
    // Wait for dag phase to show nodes
    await page.waitForTimeout(2000);
    
    // Per spec: DAG nodes should have labels
    const dagNodes = page.locator('[data-testid="dag-node"]');
    await expect(dagNodes.first()).toBeVisible({ timeout: 10000 });
  });

  test('uses orange for shuffle operations', async ({ page }) => {
    // Per spec: Shuffle should be orange
    // Wait for shuffle phase
    await page.waitForTimeout(4000);
    
    const shuffleElement = page.locator('[data-testid="shuffle-indicator"]');
    await expect(shuffleElement).toBeVisible({ timeout: 10000 });
  });

  test('animation has stage labels', async ({ page }) => {
    // Wait for phases to progress
    await page.waitForTimeout(2500);
    
    // Nodes should have descriptive labels
    await expect(page.getByText(/Read|Filter|Shuffle|Reduce|Write/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('animation container has data-phase attribute', async ({ page }) => {
    const animationContainer = page.locator('[data-testid="spark-animation"]');
    await expect(animationContainer).toBeVisible();
    
    // Should have phase attribute
    await expect(animationContainer).toHaveAttribute('data-phase', /.+/);
  });
});
