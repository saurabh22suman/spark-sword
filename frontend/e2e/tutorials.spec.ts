import { test, expect } from '@playwright/test';

test.describe('Tutorials Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tutorials');
  });

  test('tutorials page loads correctly', async ({ page }) => {
    // Check header
    await expect(page.getByRole('heading', { name: 'Interactive Spark Tutorials' })).toBeVisible();
    
    // Check philosophy tagline
    await expect(page.getByText('Senior Engineer Mentorship')).toBeVisible();
    
    // Check learning approach indicators
    await expect(page.getByText('What Spark does')).toBeVisible();
    await expect(page.getByText('Why it behaves this way')).toBeVisible();
    await expect(page.getByText('What usually goes wrong')).toBeVisible();
  });

  test('shows all 10 tutorial groups', async ({ page }) => {
    // Check all group titles are present
    await expect(page.getByRole('heading', { name: 'Spark Mental Model' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Data & Partitioning' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Transformations & Shuffles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Joins' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Execution Engine Internals' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Memory Model & Spills' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Skew, Stragglers & Stability' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Writes & File Layout' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Configs' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reading Spark UI Like a Pro' })).toBeVisible();
  });

  test('clicking a group shows detail panel with topics', async ({ page }) => {
    // Click on first group
    await page.getByRole('button', { name: /Spark Mental Model/ }).click();
    
    // Check detail panel appears with topics
    await expect(page.getByRole('heading', { name: 'Topics Covered' })).toBeVisible();
    
    // Check topics are displayed (use more specific locators)
    const topicsSection = page.locator('text=Topics Covered').locator('..');
    await expect(topicsSection.getByText('What Spark is (and is not)')).toBeVisible();
    await expect(topicsSection.getByText('Lazy evaluation')).toBeVisible();
    
    // Check learning outcome
    await expect(page.getByRole('heading', { name: 'Learning Outcome' })).toBeVisible();
  });

  test('clicking a group shows interactive tutorials', async ({ page }) => {
    // Click on first group
    await page.getByRole('button', { name: /Spark Mental Model/ }).click();
    
    // Check tutorials section
    await expect(page.getByRole('heading', { name: /Interactive Tutorials/ })).toBeVisible();
    
    // Check tutorial links are visible
    await expect(page.getByRole('link', { name: /Job → Stage → Task Visualizer/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Lazy Evaluation Simulator/ })).toBeVisible();
  });

  test('tutorials link in navbar is active on tutorials page', async ({ page }) => {
    const tutorialsLink = page.getByRole('navigation').getByRole('link', { name: 'Tutorials' });
    await expect(tutorialsLink).toBeVisible();
    // Check it links to /tutorials
    await expect(tutorialsLink).toHaveAttribute('href', '/tutorials');
  });
});

test.describe('Individual Tutorial Page', () => {
  test('DAG Visualizer tutorial loads and is interactive', async ({ page }) => {
    await page.goto('/tutorials/spark-mental-model/dag-visualizer');
    
    // Check page header
    await expect(page.getByRole('heading', { name: 'Job → Stage → Task Visualizer', level: 1 })).toBeVisible();
    await expect(page.getByText('Group 1')).toBeVisible();
    
    // Check learning outcome
    await expect(page.getByRole('heading', { name: "What You'll Learn" })).toBeVisible();
    
    // Check interactive component is rendered
    await expect(page.getByRole('button', { name: 'Execute Action' })).toBeVisible();
    
    // Check DAG operations are shown
    await expect(page.getByText('Read Parquet')).toBeVisible();
    await expect(page.getByText('Filter')).toBeVisible();
    await expect(page.getByText('GroupBy')).toBeVisible();
  });

  test('DAG Visualizer executes and shows stages', async ({ page }) => {
    await page.goto('/tutorials/spark-mental-model/dag-visualizer');
    
    // Click execute
    await page.getByRole('button', { name: 'Execute Action' }).click();
    
    // Wait for animation to complete (stages should appear)
    await expect(page.getByText('Physical Execution Plan')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Stage 0' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stage 1' })).toBeVisible();
    
    // Check key insight appears
    await expect(page.getByText('Key Insight')).toBeVisible();
    await expect(page.getByText('shuffle boundary', { exact: true })).toBeVisible();
  });

  test('Partition Playground tutorial is interactive', async ({ page }) => {
    await page.goto('/tutorials/data-partitioning/partition-playground');
    
    // Check page loaded
    await expect(page.getByRole('heading', { name: 'Partition Playground', level: 1 })).toBeVisible();
    
    // Check sliders are present
    await expect(page.getByText('Total Data Size:')).toBeVisible();
    await expect(page.getByText(/Partitions:/)).toBeVisible();
    await expect(page.getByText('Skew Factor:')).toBeVisible();
    
    // Check initial status shows good distribution
    await expect(page.getByText('Good Distribution!')).toBeVisible();
    
    // Check partition visualization
    await expect(page.getByText('Partition Distribution')).toBeVisible();
  });

  test('back button returns to tutorials page', async ({ page }) => {
    await page.goto('/tutorials/spark-mental-model/dag-visualizer');
    
    // Click back button
    await page.getByRole('button', { name: 'Back to Tutorials' }).click();
    
    // Should be on tutorials page
    await expect(page).toHaveURL('/tutorials');
    await expect(page.getByRole('heading', { name: 'Interactive Spark Tutorials' })).toBeVisible();
  });

  test('browse all tutorials link works', async ({ page }) => {
    await page.goto('/tutorials/spark-mental-model/dag-visualizer');
    
    // Click browse all link
    await page.getByRole('link', { name: 'Browse All Tutorials' }).click();
    
    // Should be on tutorials page
    await expect(page).toHaveURL('/tutorials');
  });
});

test.describe('Shuffle Tutorial Components', () => {
  test('Shuffle Trigger Map shows narrow vs wide operations', async ({ page }) => {
    await page.goto('/tutorials/transformations-shuffles/shuffle-trigger-map');
    
    // Check component loaded
    await expect(page.getByRole('heading', { name: 'Shuffle Trigger Map', level: 3 })).toBeVisible();
    
    // Check narrow operations section exists
    await expect(page.getByText('Narrow (No Shuffle)')).toBeVisible();
    
    // Check wide operations section exists
    await expect(page.getByText('Wide (Causes Shuffle)')).toBeVisible();
    
    // Check key insight
    await expect(page.getByText('Key Insight')).toBeVisible();
  });

  test('clicking operation shows shuffle status', async ({ page }) => {
    await page.goto('/tutorials/transformations-shuffles/shuffle-trigger-map');
    
    // Wait for component to load
    await expect(page.getByRole('heading', { name: 'Shuffle Trigger Map', level: 3 })).toBeVisible();
    
    // Click on filter (narrow operation)
    await page.locator('button').filter({ hasText: /^filter$/ }).click();
    await expect(page.getByText('NO SHUFFLE', { exact: true })).toBeVisible();
    
    // Click on groupBy (wide operation)
    await page.locator('button').filter({ hasText: /^groupBy$/ }).click();
    await expect(page.getByText('SHUFFLES', { exact: true })).toBeVisible();
  });
});

test.describe('Join Strategy Simulator', () => {
  test('Join Strategy Simulator loads with controls', async ({ page }) => {
    await page.goto('/tutorials/joins/join-strategy-simulator');
    
    // Check component loaded
    await expect(page.getByRole('heading', { name: 'Join Strategy Simulator', level: 3 })).toBeVisible();
    
    // Check table size controls
    await expect(page.getByText('Left Table (df1)')).toBeVisible();
    await expect(page.getByText('Right Table (df2)')).toBeVisible();
    
    // Check broadcast threshold control
    await expect(page.getByText(/autoBroadcastJoinThreshold/)).toBeVisible();
  });

  test('shows broadcast join for small table', async ({ page }) => {
    await page.goto('/tutorials/joins/join-strategy-simulator');
    
    // Default should show broadcast (right table is small)
    await expect(page.getByText('Broadcast Hash Join')).toBeVisible();
  });
});

test.describe('Memory and Skew Tutorials', () => {
  test('Executor Memory Simulator shows memory breakdown', async ({ page }) => {
    await page.goto('/tutorials/memory-spills/executor-memory-simulator');
    
    // Check component loaded
    await expect(page.getByRole('heading', { name: 'Executor Memory Simulator', level: 3 })).toBeVisible();
    
    // Check memory config controls
    await expect(page.getByText('spark.executor.memory:')).toBeVisible();
    await expect(page.getByText('Memory Breakdown')).toBeVisible();
    
    // Check run button
    await expect(page.getByRole('button', { name: 'Run Task' })).toBeVisible();
  });

  test('Straggler Timeline shows task completion visualization', async ({ page }) => {
    await page.goto('/tutorials/skew-stragglers/straggler-timeline');
    
    // Check component loaded
    await expect(page.getByRole('heading', { name: 'Straggler Timeline', level: 3 })).toBeVisible();
    
    // Check controls
    await expect(page.getByText('Total Tasks:')).toBeVisible();
    await expect(page.getByText('Straggler Count:')).toBeVisible();
    
    // Check start button
    await expect(page.getByRole('button', { name: 'Start Stage' })).toBeVisible();
  });
});

test.describe('Tutorial Navigation Flow', () => {
  test('can navigate through multiple tutorials', async ({ page }) => {
    // Start at tutorials page
    await page.goto('/tutorials');
    
    // Select first group
    await page.getByRole('button', { name: /Spark Mental Model/ }).click();
    
    // Go to first tutorial
    await page.getByRole('link', { name: /Job → Stage → Task Visualizer/ }).click();
    await expect(page.getByRole('heading', { name: 'Job → Stage → Task Visualizer', level: 1 })).toBeVisible();
    
    // Go back
    await page.getByRole('button', { name: 'Back to Tutorials' }).click();
    
    // Select different group
    await page.getByRole('button', { name: /Data & Partitioning/ }).click();
    
    // Check different tutorials appear
    await expect(page.getByRole('link', { name: /Partition Playground/ })).toBeVisible();
  });
});
