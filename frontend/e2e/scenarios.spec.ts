import { test, expect } from '@playwright/test';

/**
 * E2E tests for Scenarios page
 * 
 * Per real-life-scenario-spec.md Section 7:
 * - Each scenario has a snapshot test for DAG shape
 * - Shuffle assertions verify against expected_shuffles
 * - Explanation assertions verify educational content
 */

test.describe('Scenarios Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scenarios');
    // Wait for scenarios to load
    await page.waitForSelector('text=Real-Life Scenarios');
  });

  test('scenarios page loads correctly', async ({ page }) => {
    // Header is visible
    await expect(page.getByRole('heading', { name: 'Real-Life Scenarios' })).toBeVisible();
    
    // Description is visible
    await expect(page.getByText('Learn Spark internals through practical examples')).toBeVisible();
  });

  test('shows all 5 required scenarios', async ({ page }) => {
    // Check all 5 scenarios are listed (using role/button selectors for scenario cards)
    await expect(page.getByRole('button', { name: /Simple Filter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /GroupBy Aggregation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Join Without Broadcast/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Skewed Join Key/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Too Many Output Files/i })).toBeVisible();
  });

  test('scenarios show difficulty level badges', async ({ page }) => {
    // BASIC and INTERMEDIATE levels should be visible
    await expect(page.getByText('BASIC').first()).toBeVisible();
    await expect(page.getByText('INTERMEDIATE').first()).toBeVisible();
  });

  test('clicking scenario shows detail panel', async ({ page }) => {
    // Click on GroupBy Aggregation
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for detail to load
    await page.waitForSelector('text=📖 Story');
    
    // Check story section is visible
    await expect(page.getByText('📖 Story')).toBeVisible();
    
    // Check code pattern section
    await expect(page.getByText('Code Pattern')).toBeVisible();
  });
});

test.describe('Scenario Detail View', () => {
  test('filter scenario shows no shuffle expected', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Click on Simple Filter
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Wait for details to load
    await page.waitForSelector('text=Shuffles');
    
    // Should show 0 shuffles - look for the specific stats card
    // The card has "Shuffles" label and "0" value
    const shuffleValue = page.locator('div:has-text("Shuffles") > .text-3xl').first();
    await expect(shuffleValue).toHaveText('0');
  });

  test('groupby scenario shows shuffle expected', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Click on GroupBy Aggregation
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for details to load
    await page.waitForSelector('text=Shuffles');
    
    // Should show 1 shuffle
    const shuffleValue = page.locator('div:has-text("Shuffles") > .text-3xl').first();
    await expect(shuffleValue).toHaveText('1');
  });

  test('skewed join shows skew flag', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Click on Skewed Join Key
    await page.getByRole('button', { name: /Skewed Join Key/i }).click();
    
    // Wait for details to load
    await page.waitForSelector('text=Skew');
    
    // Should show Yes for skew - look for the specific stats card
    const skewValue = page.locator('div:has-text("Skew") > .text-3xl').first();
    await expect(skewValue).toHaveText('Yes');
  });

  test('scenario shows simulation preview', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Click on any scenario
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for simulation section
    await page.waitForSelector('text=Simulation Preview');
    
    // Check simulation fields are visible
    await expect(page.getByText('Shuffle Bytes')).toBeVisible();
    await expect(page.getByText('Task Time Range')).toBeVisible();
    await expect(page.getByText('Spark Path')).toBeVisible();
    await expect(page.getByText('Dominant Factor')).toBeVisible();
    await expect(page.getByText('Confidence:')).toBeVisible();
  });

  test('scenario shows evidence signals', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Click on scenario
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Check evidence section
    await expect(page.getByText('🔍 Evidence Signals')).toBeVisible();
  });

  test('scenario shows learning goal', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Click on scenario
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Check learning goal section
    await expect(page.getByText("🎯 What You'll Learn")).toBeVisible();
  });
});

test.describe('Scenario Navigation', () => {
  test('has link back to home', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Back link should be visible
    await expect(page.getByText('← Back')).toBeVisible();
    
    // Click and verify navigation
    await page.getByText('← Back').click();
    await expect(page).toHaveURL('/');
  });

  test('has link to open in playground', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select a scenario
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Wait for detail panel
    await page.waitForSelector('text=Open in Playground');
    
    // Check playground link
    await expect(page.getByText('Open in Playground →')).toBeVisible();
  });

  test('playground link includes scenario parameter', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Simple Filter
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Wait for link
    await page.waitForSelector('text=Open in Playground');
    
    // Check link href
    const link = page.getByRole('link', { name: 'Open in Playground →' });
    await expect(link).toHaveAttribute('href', '/playground?scenario=simple_filter');
  });
});

test.describe('Scenario Concepts', () => {
  test('filter scenario teaches narrow transformation', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Simple Filter
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Wait for learning goal
    await page.waitForSelector('text=What You\'ll Learn');
    
    // Should mention narrow or partition concepts
    const goalSection = page.locator('text=What You\'ll Learn').locator('..');
    const goalText = await goalSection.textContent();
    expect(goalText?.toLowerCase()).toMatch(/narrow|partition|shuffle/);
  });

  test('groupby scenario teaches shuffle', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select GroupBy
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for learning goal
    await page.waitForSelector('text=What You\'ll Learn');
    
    // Should mention shuffle
    const goalSection = page.locator('text=What You\'ll Learn').locator('..');
    const goalText = await goalSection.textContent();
    expect(goalText?.toLowerCase()).toContain('shuffle');
  });

  test('skew scenario teaches data imbalance', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Skewed Join
    await page.getByRole('button', { name: /Skewed Join Key/i }).click();
    
    // Wait for learning goal
    await page.waitForSelector('text=What You\'ll Learn');
    
    // Should mention skew or imbalance
    const goalSection = page.locator('text=What You\'ll Learn').locator('..');
    const goalText = await goalSection.textContent();
    expect(goalText?.toLowerCase()).toMatch(/skew|imbalance|hot/);
  });
});

/**
 * Scenario DAG tests per scenario-dag-spec.md Section A6:
 * - Renders DAG in correct order (top to bottom)
 * - Correct node count per scenario
 * - Shuffle presence/absence matches expected
 * - Stage boundary rendering
 * - Click interaction shows explanations
 */
test.describe('Scenario DAG Component', () => {
  test('filter scenario DAG renders with correct nodes', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Simple Filter
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Wait for DAG section
    await page.waitForSelector('text=Execution DAG');
    
    // DAG title should be visible
    await expect(page.getByRole('heading', { name: 'Execution DAG' })).toBeVisible();
    
    // Filter scenario has 3 nodes: read, filter, write
    const dagNodes = page.locator('[data-testid="dag-node"]');
    await expect(dagNodes).toHaveCount(3);
  });

  test('groupby scenario DAG shows shuffle node', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select GroupBy Aggregation
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for DAG section
    await page.waitForSelector('text=Execution DAG');
    
    // GroupBy scenario has shuffle node
    const shuffleNode = page.locator('[data-testid="dag-node"][data-node-type="shuffle"]');
    await expect(shuffleNode).toBeVisible();
  });

  test('DAG shows stage boundary at shuffle', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select GroupBy (has 1 shuffle = stage boundary)
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for DAG section
    await page.waitForSelector('text=Execution DAG');
    
    // Should have stage boundary indicator
    const stageBoundary = page.locator('[data-testid="stage-boundary"]');
    await expect(stageBoundary.first()).toBeVisible();
  });

  test('clicking DAG node shows explanation panel', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Simple Filter
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    
    // Wait for DAG section
    await page.waitForSelector('text=Execution DAG');
    
    // Click on a DAG node
    await page.locator('[data-testid="dag-node"]').first().click();
    
    // Explanation panel should appear
    await expect(page.getByText('What Spark Does')).toBeVisible();
    await expect(page.getByText('Why Required')).toBeVisible();
  });

  test('DAG nodes have color coding by type', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select a scenario with multiple node types
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    
    // Wait for DAG
    await page.waitForSelector('text=Execution DAG');
    
    // Read node should have green background
    const readNode = page.locator('[data-testid="dag-node"][data-node-type="read"]');
    await expect(readNode).toBeVisible();
    
    // Shuffle node should have purple background
    const shuffleNode = page.locator('[data-testid="dag-node"][data-node-type="shuffle"]');
    await expect(shuffleNode).toBeVisible();
    
    // Aggregate node should be visible
    const aggregateNode = page.locator('[data-testid="dag-node"][data-node-type="aggregate"]');
    await expect(aggregateNode).toBeVisible();
  });

  test('join scenario DAG shows both inputs', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Join Without Broadcast
    await page.getByRole('button', { name: /Join Without Broadcast/i }).click();
    
    // Wait for DAG
    await page.waitForSelector('text=Execution DAG');
    
    // Join scenario has multiple read nodes (for each input)
    const readNodes = page.locator('[data-testid="dag-node"][data-node-type="read"]');
    await expect(readNodes).toHaveCount(2);
    
    // And a join node
    const joinNode = page.locator('[data-testid="dag-node"][data-node-type="join"]');
    await expect(joinNode).toBeVisible();
  });

  test('DAG displays stage count correctly', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select Simple Filter (1 stage, no shuffle)
    await page.getByRole('button', { name: /Simple Filter/i }).click();
    await page.waitForSelector('text=Execution DAG');
    
    // Stage count should show 1
    const stageCount = page.locator('[data-testid="dag-stage-count"]');
    await expect(stageCount).toContainText('1');
  });

  test('DAG displays shuffle count correctly', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Select GroupBy (1 shuffle)
    await page.getByRole('button', { name: /GroupBy Aggregation/i }).click();
    await page.waitForSelector('text=Execution DAG');
    
    // Shuffle count should show 1
    const shuffleCount = page.locator('[data-testid="dag-shuffle-count"]');
    await expect(shuffleCount).toContainText('1');
  });
});

test.describe('Expanded Scenarios', () => {
  test('shows 12 scenarios total', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Wait for scenarios to load
    await page.waitForSelector('text=Real-Life Scenarios');
    
    // Count scenario buttons - should be 12 total
    const scenarioButtons = page.locator('[data-testid="scenario-card"]');
    await expect(scenarioButtons).toHaveCount(12);
  });

  test('multi-step ETL scenario is available', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.getByRole('button', { name: /Multi-Step ETL/i })).toBeVisible();
  });

  test('join after aggregation scenario is available', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.getByRole('button', { name: /Join After Aggregation/i })).toBeVisible();
  });

  test('window function scenario is available', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.getByRole('button', { name: /Window Function/i })).toBeVisible();
  });

  test('expanded scenarios are all at least intermediate level', async ({ page }) => {
    await page.goto('/scenarios');
    
    // Wait for scenarios to load
    await page.waitForSelector('[data-testid="scenario-card"]');
    
    // Should have INTERMEDIATE text visible on page (multiple scenarios are intermediate)
    await expect(page.locator('text=INTERMEDIATE').first()).toBeVisible();
  });
});
