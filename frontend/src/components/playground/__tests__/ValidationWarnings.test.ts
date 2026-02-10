/**
 * Unit Tests for ValidationWarnings
 * 
 * Tests the real-time validation and educational feedback system:
 * - Severity levels (info, warning, error)
 * - Warning detection logic
 * - Learning mode explanations
 * - Warning prioritization
 */

import { describe, it, expect } from 'vitest';
import { 
  getValidationWarnings, 
  type ValidationWarning,
  getSeverityStyles 
} from '../ValidationWarnings';

describe('ValidationWarnings', () => {
  describe('getValidationWarnings', () => {
    it('detects excessive partition warning', () => {
      const warnings = getValidationWarnings({
        partitions: 5000,
        rows: 1_000_000,
        avgRowSizeBytes: 100,
      });

      const excessivePartitionWarning = warnings.find(
        (w) => w.id === 'excessive-partitions'
      );

      expect(excessivePartitionWarning).toBeDefined();
      expect(excessivePartitionWarning?.severity).toBe('warning');
      expect(excessivePartitionWarning?.title).toContain('partition');
    });

    it('detects too few partitions error', () => {
      const warnings = getValidationWarnings({
        partitions: 1,
        rows: 100_000_000, // 100M rows
        avgRowSizeBytes: 1000,
      });

      const tooFewWarning = warnings.find(
        (w) => w.id === 'too-few-partitions'
      );

      expect(tooFewWarning).toBeDefined();
      expect(tooFewWarning?.severity).toBe('error');
    });

    it('detects large partition size warning', () => {
      const warnings = getValidationWarnings({
        partitions: 10,
        rows: 100_000_000,
        avgRowSizeBytes: 2000, // ~200GB total / 10 partitions = 20GB each
      });

      const largePartitionWarning = warnings.find(
        (w) => w.id === 'large-partition-size'
      );

      expect(largePartitionWarning).toBeDefined();
      expect(largePartitionWarning?.severity).toBe('error');
    });

    it('provides learning explanations for warnings', () => {
      const warnings = getValidationWarnings({
        partitions: 10000,
        rows: 1_000_000,
        avgRowSizeBytes: 100,
      });

      const excessivePartitionWarning = warnings.find(
        (w) => w.id === 'excessive-partitions'
      );

      expect(excessivePartitionWarning?.learnMore).toBeDefined();
      expect(excessivePartitionWarning?.learnMore).toContain('overhead');
    });

    it('returns no warnings for healthy configuration', () => {
      const warnings = getValidationWarnings({
        partitions: 200,
        rows: 10_000_000,
        avgRowSizeBytes: 500,
      });

      expect(warnings).toHaveLength(0);
    });

    it('detects tiny partition warning', () => {
      const warnings = getValidationWarnings({
        partitions: 1000,
        rows: 10_000, // Very small dataset
        avgRowSizeBytes: 100,
      });

      const tinyPartitionWarning = warnings.find(
        (w) => w.id === 'tiny-partitions'
      );

      expect(tinyPartitionWarning).toBeDefined();
      expect(tinyPartitionWarning?.severity).toBe('info');
    });

    it('prioritizes errors over warnings over info', () => {
      const warnings = getValidationWarnings({
        partitions: 2,
        rows: 100_000_000,
        avgRowSizeBytes: 5000, // Creates both error and warning conditions
      });

      const severityOrder = warnings.map((w) => w.severity);
      
      // Errors should come first
      const firstError = severityOrder.indexOf('error');
      const firstWarning = severityOrder.indexOf('warning');
      const firstInfo = severityOrder.indexOf('info');

      if (firstError !== -1 && firstWarning !== -1) {
        expect(firstError).toBeLessThan(firstWarning);
      }
      if (firstWarning !== -1 && firstInfo !== -1) {
        expect(firstWarning).toBeLessThan(firstInfo);
      }
    });
  });

  describe('getSeverityStyles', () => {
    it('returns error styles for error severity', () => {
      const styles = getSeverityStyles('error');
      
      expect(styles.icon).toBe('XCircle');
      expect(styles.containerClass).toContain('border-red');
      expect(styles.iconClass).toContain('text-red');
    });

    it('returns warning styles for warning severity', () => {
      const styles = getSeverityStyles('warning');
      
      expect(styles.icon).toBe('AlertTriangle');
      expect(styles.containerClass).toContain('border-yellow');
      expect(styles.iconClass).toContain('text-yellow');
    });

    it('returns info styles for info severity', () => {
      const styles = getSeverityStyles('info');
      
      expect(styles.icon).toBe('Info');
      expect(styles.containerClass).toContain('border-blue');
      expect(styles.iconClass).toContain('text-blue');
    });
  });

  describe('Warning content quality', () => {
    it('provides actionable suggestions in warnings', () => {
      const warnings = getValidationWarnings({
        partitions: 5000,
        rows: 1_000_000,
        avgRowSizeBytes: 100,
      });

      const excessivePartitionWarning = warnings.find(
        (w) => w.id === 'excessive-partitions'
      );

      expect(excessivePartitionWarning?.suggestion).toBeDefined();
      expect(excessivePartitionWarning?.suggestion).toContain('coalesce');
    });

    it('includes Spark-specific context', () => {
      const warnings = getValidationWarnings({
        partitions: 1,
        rows: 100_000_000,
        avgRowSizeBytes: 1000,
      });

      const tooFewWarning = warnings.find(
        (w) => w.id === 'too-few-partitions'
      );

      expect(tooFewWarning?.learnMore).toBeDefined();
      expect(tooFewWarning?.learnMore?.toLowerCase()).toMatch(/spark|parallel/);
    });
  });
});
