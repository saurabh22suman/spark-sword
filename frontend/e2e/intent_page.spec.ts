import { test, expect } from '@playwright/test';

/**
 * Intent Page E2E Tests
 * 
 * Feature 5: Notebook Upload (Static Intent Extraction)
 * Tests the inferred intent display after notebook upload.
 * 
 * Per intent-graph-ui-spec.md:
 * - Intent graph renders in correct order
 * - Editing assumptions updates simulation inputs
 * - Confirmation gating works
 * - Uncertainty badges render correctly
 */
test.describe('Intent Page', () => {
  test.describe('with inferred intent data', () => {
    test.beforeEach(async ({ page }) => {
      // Set up mock inferred intent in sessionStorage before navigating
      const mockIntent = {
        label: 'Inferred Intent (User Adjustable)',
        is_inferred: true,
        summary: 'Detected 3 transformations including 1 potential shuffle.',
        code_cells: [
          "df = spark.read.parquet('input.parquet')\nresult = df.groupBy('category').agg({'amount': 'sum'})",
          "result.write.parquet('output.parquet')",
        ],
        transformations: [
          {
            operation: 'groupby',
            line_number: 2,
            cell_index: 0,
            code_snippet: "result = df.groupBy('category').agg({'amount': 'sum'})",
            causes_shuffle: true,
          },
          {
            operation: 'write',
            line_number: 1,
            cell_index: 1,
            code_snippet: "result.write.parquet('output.parquet')",
            causes_shuffle: false,
          },
        ],
        // New intent_graph format per spec
        intent_graph: [
          {
            step: 1,
            operation: 'groupBy',
            details: {
              code_snippet: "df.groupBy('category').agg({'amount': 'sum'})",
              keys: ['category'],
              editable: { is_skewed: false },
            },
            spark_consequence: 'Shuffle required',
            is_uncertain: false,
            uncertainty_reason: null,
          },
          {
            step: 2,
            operation: 'write',
            details: {
              code_snippet: "result.write.parquet('output.parquet')",
            },
            spark_consequence: 'Possible file explosion',
            is_uncertain: false,
            uncertainty_reason: null,
          },
        ],
        uncertainties: ['Data distribution unknown'],
        schema: null,
        row_count: null,
        data_size: null,
        is_confirmed: false,
      };

      await page.goto('/intent');
      await page.evaluate((data) => {
        sessionStorage.setItem('inferredIntent', JSON.stringify(data));
      }, mockIntent);
      await page.goto('/intent', { waitUntil: 'networkidle' });
    });

    test('shows inferred intent label', async ({ page }) => {
      // Per spec: Must show it's inferred and user adjustable
      await expect(page.getByText(/Inferred.*User Adjustable/)).toBeVisible();
    });

    test('shows intent graph section', async ({ page }) => {
      // Use role to get the specific heading, not all text matches
      await expect(page.getByRole('heading', { name: 'Intent Graph' })).toBeVisible();
    });

    test('shows intent graph nodes with operations', async ({ page }) => {
      // groupBy node should be visible
      await expect(page.getByRole('button', { name: /groupBy/i })).toBeVisible();
      // write node should be visible
      await expect(page.getByRole('button', { name: /write/i })).toBeVisible();
    });

    test('shows spark consequence badges', async ({ page }) => {
      // Shuffle consequence should be visible (use first() since multiple nodes may have same consequence)
      await expect(page.getByText('Shuffle required').first()).toBeVisible();
    });

    test('shows code cells', async ({ page }) => {
      await expect(page.getByText('Code Cells')).toBeVisible();
      // Should show code from cells - look in the pre element specifically
      await expect(page.locator('pre').filter({ hasText: /parquet/ })).toBeVisible();
    });

    test('shows warning about schema not being inferred', async ({ page }) => {
      // Per spec: Never infer schema from code
      await expect(
        page.getByText(/Schema.*row counts.*intentionally not shown/)
      ).toBeVisible();
    });

    test('shows static analysis disclaimer', async ({ page }) => {
      // Per spec: Must clarify this is inferred, not executed
      await expect(page.getByText(/inferred intent.*static code analysis/i)).toBeVisible();
      await expect(page.getByText(/No code was executed/)).toBeVisible();
    });

    test('has navigation to upload and shows confirm button when not confirmed', async ({ page }) => {
      await expect(page.getByRole('link', { name: /Upload New/ })).toBeVisible();
      // Per spec Section 6: Simulate is blocked until intent is confirmed
      // Initially shows Confirm Intent button instead of Simulate link
      await expect(page.getByRole('button', { name: /Confirm Intent/ })).toBeVisible();
    });

    test('shows Simulate link after confirmation', async ({ page }) => {
      // Click confirm button
      await page.getByRole('button', { name: /Confirm Intent/ }).click();
      // Now Simulate link should be visible
      await expect(page.getByRole('link', { name: /Simulate/ })).toBeVisible();
    });

    test('shows shuffle warning count', async ({ page }) => {
      // Should show warning about shuffle operations
      await expect(page.getByText(/1 operation.*may cause shuffle/i)).toBeVisible();
    });
  });

  test.describe('without data', () => {
    test('redirects to upload if no intent data', async ({ page }) => {
      // Clear any existing data
      await page.goto('/intent');
      await page.evaluate(() => {
        sessionStorage.removeItem('inferredIntent');
      });
      
      await page.goto('/intent', { waitUntil: 'networkidle' });
      
      // Should redirect to upload page
      await expect(page).toHaveURL(/\/upload/);
    });
  });
});
