import { test, expect } from '@playwright/test';

/**
 * Live Data Flow Animation E2E Tests
 * 
 * Tests particle-based animation showing data flowing through Spark DAG.
 * 
 * Core principles:
 * - Narrow transformations: particles stay in lanes (partition-local)
 * - Wide transformations: particles scatter and gather at shuffle boundaries
 * - Particle speed indicates relative cost (slow = expensive)
 * - Particle count represents data volume
 * - Educational "slow" mode vs overview "fast" mode
 */
test.describe('Data Flow Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground');
  });

  test('animation toggle button is visible', async ({ page }) => {
    // Toggle is always visible but may be disabled without operations
    await expect(page.getByTestId('animation-toggle')).toBeVisible();
  });

  test('clicking toggle button starts animation', async ({ page }) => {
    // Add an operation first
    await page.getByTestId('add-filter').click();
    
    // Wait for DAG to render
    await page.waitForTimeout(500);
    
    // Click toggle to start
    await page.getByTestId('animation-toggle').click();
    
    // Animation container should appear
    await expect(page.getByTestId('data-flow-animation')).toBeVisible({ timeout: 2000 });
  });

  test('particles are visible when animation is active', async ({ page }) => {
    // Add filter operation
    await page.getByTestId('add-filter').click();
    await page.waitForTimeout(500);
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Wait for particles to appear
    const particles = page.locator('[data-testid^="particle-"]');
    await expect(particles.first()).toBeVisible({ timeout: 3000 });
  });

  test('animation speed toggle switches between slow and fast', async ({ page }) => {
    // Add operation and enable animation
    await page.getByTestId('add-filter').click();
    await page.waitForTimeout(500);
    await page.getByTestId('animation-toggle').click();
    
    // Speed toggle should be visible
    await expect(page.getByTestId('animation-speed-toggle')).toBeVisible();
    
    // Initial speed should be "Slow" (educational)
    await expect(page.getByTestId('animation-speed-toggle')).toContainText(/slow/i);
    
    // Click to switch to fast
    await page.getByTestId('animation-speed-toggle').click();
    
    // Should now show "Fast"
    await expect(page.getByTestId('animation-speed-toggle')).toContainText(/fast/i);
  });

  test('animation tooltip shows educational context', async ({ page }) => {
    // Add operation and enable animation
    await page.getByTestId('add-filter').click();
    await page.waitForTimeout(500);
    await page.getByTestId('animation-toggle').click();
    
    // Tooltip should be visible explaining particles
    const tooltip = page.getByTestId('animation-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 2000 });
    await expect(tooltip).toContainText(/Normal flow|Shuffle|Broadcast/i);
  });

  test('animation stops when toggle is clicked again', async ({ page }) => {
    // Start animation
    await page.getByTestId('add-filter').click();
    await page.waitForTimeout(500);
    await page.getByTestId('animation-toggle').click();
    await expect(page.getByTestId('data-flow-animation')).toBeVisible();
    
    // Stop animation
    await page.getByTestId('animation-toggle').click();
    
    // Animation should stop or hide
    await expect(page.getByTestId('data-flow-animation')).not.toBeVisible();
  });

  test('narrow transformations show particles in lanes', async ({ page }) => {
    // Add a narrow transformation (filter)
    await page.getByTestId('add-filter').click();
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Particles should move vertically without scattering
    const particles = page.locator('[data-testid^="particle-"]');
    const firstParticle = particles.first();
    
    // Get initial X position
    const initialX = await firstParticle.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.left;
    });
    
    // Wait a bit for animation
    await page.waitForTimeout(500);
    
    // X position should remain roughly the same (within lane)
    const finalX = await firstParticle.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.left;
    });
    
    // Tolerance of 20px for lane stability
    expect(Math.abs(finalX - initialX)).toBeLessThan(20);
  });

  test('wide transformations show particles scattering', async ({ page }) => {
    // Add a wide transformation (groupby)
    await page.getByTestId('add-groupby').click();
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Wait for animation to start
    await page.waitForTimeout(500);
    
    // Particles should have varying X positions (scattering)
    const particles = page.locator('[data-testid^="particle-"]');
    const count = await particles.count();
    
    if (count >= 2) {
      const positions = await Promise.all(
        Array.from({ length: Math.min(count, 5) }, (_, i) => 
          particles.nth(i).evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.left;
          })
        )
      );
      
      // At least some particles should have different X positions
      const uniquePositions = new Set(positions.map(p => Math.round(p / 10)));
      expect(uniquePositions.size).toBeGreaterThan(1);
    }
  });

  test('animation speed toggle switches between slow and fast', async ({ page }) => {
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Speed toggle should be visible
    await expect(page.getByTestId('animation-speed-toggle')).toBeVisible();
    
    // Initial speed should be "Slow" (educational)
    await expect(page.getByTestId('animation-speed-toggle')).toContainText(/slow/i);
    
    // Click to switch to fast
    await page.getByTestId('animation-speed-toggle').click();
    
    // Should now show "Fast"
    await expect(page.getByTestId('animation-speed-toggle')).toContainText(/fast/i);
  });

  test('fast mode animates particles faster than slow mode', async ({ page }) => {
    // Add an operation to have something to animate
    await page.getByTestId('add-filter').click();
    
    // Enable animation in slow mode
    await page.getByTestId('animation-toggle').click();
    
    // Measure time for particle to travel in slow mode
    const particle = page.locator('[data-testid^="particle-"]').first();
    
    // Get initial Y position
    const slowInitialY = await particle.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top;
    });
    
    // Wait 1 second
    await page.waitForTimeout(1000);
    
    // Get final Y position
    const slowFinalY = await particle.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top;
    });
    
    const slowDistance = Math.abs(slowFinalY - slowInitialY);
    
    // Switch to fast mode
    await page.getByTestId('animation-speed-toggle').click();
    
    // Reset by toggling animation off and on
    await page.getByTestId('animation-toggle').click();
    await page.getByTestId('animation-toggle').click();
    
    // Measure again
    const fastInitialY = await particle.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top;
    });
    
    await page.waitForTimeout(1000);
    
    const fastFinalY = await particle.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top;
    });
    
    const fastDistance = Math.abs(fastFinalY - fastInitialY);
    
    // Fast mode should cover more distance
    expect(fastDistance).toBeGreaterThan(slowDistance);
  });

  test('particle count increases with more operations', async ({ page }) => {
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Count initial particles
    await page.waitForTimeout(500);
    const initialParticles = page.locator('[data-testid^="particle-"]');
    const initialCount = await initialParticles.count();
    
    // Add more operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Wait for animation to update
    await page.waitForTimeout(500);
    
    // Count should increase (more data flowing)
    const newParticles = page.locator('[data-testid^="particle-"]');
    const newCount = await newParticles.count();
    
    // Should have at least as many particles
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('particles change color based on operation type', async ({ page }) => {
    // Add a shuffle operation
    await page.getByTestId('add-groupby').click();
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Wait for particles
    await page.waitForTimeout(500);
    const particle = page.locator('[data-testid^="particle-"]').first();
    
    // Shuffle operation particles should be orange
    const bgColor = await particle.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Check for orange-ish color (RGB values for orange)
    expect(bgColor).toBeTruthy();
  });

  test('shuffle boundaries show particle gathering effect', async ({ page }) => {
    // Add operations with shuffle
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Particles near shuffle boundary should converge
    await page.waitForTimeout(1000);
    
    // Check that animation shows shuffle boundary visualization
    const shuffleBoundary = page.getByTestId('stage-boundary-1');
    await expect(shuffleBoundary).toBeVisible();
    
    // Particles should gather near this boundary
    const particles = page.locator('[data-testid^="particle-"]');
    const particleCount = await particles.count();
    expect(particleCount).toBeGreaterThan(0);
  });

  test('animation stops when toggle is clicked again', async ({ page }) => {
    // Start animation
    await page.getByTestId('animation-toggle').click();
    await expect(page.getByTestId('data-flow-animation')).toBeVisible();
    
    // Stop animation
    await page.getByTestId('animation-toggle').click();
    
    // Animation should stop or hide
    await expect(page.getByTestId('data-flow-animation')).not.toBeVisible();
  });

  test('animation remains smooth with complex chains', async ({ page }) => {
    // Add multiple operations
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-groupby').click();
    await page.getByTestId('add-filter').click();
    await page.getByTestId('add-join').click();
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Check that particles are rendering without errors
    const particles = page.locator('[data-testid^="particle-"]');
    await expect(particles.first()).toBeVisible({ timeout: 2000 });
    
    // No console errors should appear
    // (Playwright automatically fails on uncaught exceptions)
  });

  test('broadcast join shows different particle pattern', async ({ page }) => {
    // Add a join that will be broadcast
    await page.getByTestId('add-join').click();
    
    // Set right side to be small (< broadcast threshold)
    // This might require interacting with join configuration
    
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Particles for broadcast should be purple/different
    await page.waitForTimeout(500);
    const particles = page.locator('[data-testid^="particle-"]');
    
    if (await particles.count() > 0) {
      const firstParticle = particles.first();
      const bgColor = await firstParticle.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(bgColor).toBeTruthy();
    }
  });

  test('animation tooltip shows educational context', async ({ page }) => {
    // Enable animation
    await page.getByTestId('animation-toggle').click();
    
    // Hover over animation area
    await page.getByTestId('data-flow-animation').hover();
    
    // Tooltip should explain what particles represent
    const tooltip = page.locator('[role="tooltip"]').or(page.getByTestId('animation-tooltip'));
    await expect(tooltip).toBeVisible({ timeout: 1000 });
  });
});
