/**
 * Real-time Validation System
 * 
 * Provides immediate feedback about potentially problematic configurations.
 * Educational, not blocking - helps users learn Spark trade-offs.
 * 
 * Core principles:
 * - Validate in real-time as state changes
 * - Explain WHY, not just WHAT
 * - Suggest alternatives without being prescriptive
 * - Severity levels: info, warning, error
 * - Never block user actions
 */

'use client';

import type { Operation } from './OperationsBuilder';
import type { DataShape } from './DataShapePanel';

export type ValidationSeverity = 'info' | 'warning' | 'error';

export interface ValidationWarning {
  id: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  learningModeMessage?: string; // More detailed explanation
  suggestedAction?: string;
  relatedOperation?: string; // Operation ID that triggered this
}

/**
 * Validation rules
 */
const THRESHOLDS = {
  // Shuffle
  LARGE_SHUFFLE_MB: 10 * 1024, // 10 GB
  EXTREME_SHUFFLE_MB: 50 * 1024, // 50 GB
  
  // Partitions
  SMALL_PARTITION_MB: 1, // < 1 MB per partition is too small
  LARGE_PARTITION_MB: 2048, // > 2 GB per partition risks spill
  MIN_PARTITIONS_FOR_LARGE_DATA: 100,
  
  // Skew
  HIGH_SKEW: 3.0,
  EXTREME_SKEW: 5.0,
  
  // Broadcast
  BROADCAST_DEFAULT_MB: 10,
};

/**
 * Calculate shuffle bytes for an operation
 */
function estimateShuffleBytes(
  op: Operation,
  inputShape: DataShape,
  currentRows: number
): number {
  switch (op.type) {
    case 'groupby':
    case 'distinct':
    case 'orderby':
      return currentRows * inputShape.avgRowSizeBytes;
    
    case 'join': {
      const rightRows = (op.params.right_rows as number) || 0;
      const rightSize = rightRows * inputShape.avgRowSizeBytes;
      const broadcastThreshold = (op.params.broadcast_threshold as number) || (THRESHOLDS.BROADCAST_DEFAULT_MB * 1024 * 1024);
      
      if (rightSize >= broadcastThreshold) {
        // Sort-merge join: shuffle both sides
        return (currentRows * inputShape.avgRowSizeBytes) + rightSize;
      }
      return 0; // Broadcast join
    }
    
    case 'repartition':
      return currentRows * inputShape.avgRowSizeBytes;
    
    default:
      return 0;
  }
}

/**
 * Validate current playground state
 */
export function validatePlaygroundState(
  operations: Operation[],
  shape: DataShape,
  isLearningMode: boolean
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  // Calculate current state
  let currentRows = shape.rows;
  const totalSizeMB = shape.totalSizeBytes / (1024 * 1024);
  const avgPartitionMB = totalSizeMB / shape.partitions;
  
  // === PARTITION SIZE VALIDATION ===
  
  // Partitions too small (overhead)
  if (avgPartitionMB < THRESHOLDS.SMALL_PARTITION_MB && shape.partitions > 200) {
    warnings.push({
      id: 'small-partitions',
      severity: 'warning',
      title: 'Small Task Overhead',
      message: `${shape.partitions} partitions for ${totalSizeMB.toFixed(0)} MB creates many tiny tasks.`,
      learningModeMessage: `Each partition is only ~${avgPartitionMB.toFixed(2)} MB. Spark has overhead for each task (scheduling, JVM warmup, etc.). Many small tasks can be slower than fewer larger tasks.`,
      suggestedAction: 'Consider reducing partition count for small datasets.',
    });
  }
  
  // Partitions too large (spill risk)
  if (avgPartitionMB > THRESHOLDS.LARGE_PARTITION_MB) {
    warnings.push({
      id: 'large-partitions',
      severity: 'error',
      title: 'Spill Risk',
      message: `Each partition is ~${avgPartitionMB.toFixed(0)} MB. Tasks may spill to disk.`,
      learningModeMessage: `Partitions larger than executor memory (typically 2-4 GB) can cause tasks to spill intermediate data to disk, which is much slower than in-memory processing.`,
      suggestedAction: 'Increase partition count to distribute data more evenly.',
    });
  }
  
  // Too few partitions for large data
  if (totalSizeMB > 10 * 1024 && shape.partitions < THRESHOLDS.MIN_PARTITIONS_FOR_LARGE_DATA) {
    warnings.push({
      id: 'few-partitions-large-data',
      severity: 'warning',
      title: 'Underutilized Parallelism',
      message: `${shape.partitions} partitions might underutilize cluster for ${totalSizeMB.toFixed(0)} MB.`,
      learningModeMessage: `With few partitions, Spark can't parallelize work across all available executor cores. This limits throughput.`,
      suggestedAction: 'Increase partitions to match cluster parallelism.',
    });
  }
  
  // === SKEW VALIDATION ===
  
  if (shape.skewFactor >= THRESHOLDS.EXTREME_SKEW) {
    warnings.push({
      id: 'extreme-skew',
      severity: 'error',
      title: 'Extreme Data Skew',
      message: `Skew factor of ${shape.skewFactor.toFixed(1)}x means some tasks process ${shape.skewFactor.toFixed(1)}x more data.`,
      learningModeMessage: `Data skew causes stragglers - most tasks finish quickly but a few take much longer, bottlenecking the entire job. The job is only as fast as the slowest task.`,
      suggestedAction: 'Consider salting keys, filtering hot keys, or repartitioning.',
    });
  } else if (shape.skewFactor >= THRESHOLDS.HIGH_SKEW) {
    warnings.push({
      id: 'high-skew',
      severity: 'warning',
      title: 'Data Skew Detected',
      message: `Skew factor of ${shape.skewFactor.toFixed(1)}x may cause stragglers.`,
      learningModeMessage: `Some partitions have more data than others. During shuffles or aggregations, tasks processing larger partitions will take longer.`,
      suggestedAction: 'Monitor for stragglers; consider mitigation if they appear.',
    });
  }
  
  // === OPERATION-SPECIFIC VALIDATION ===
  
  operations.forEach((op) => {
    // Estimate shuffle bytes
    const shuffleBytes = estimateShuffleBytes(op, shape, currentRows);
    const shuffleMB = shuffleBytes / (1024 * 1024);
    
    // Large shuffle warning
    if (shuffleMB > THRESHOLDS.EXTREME_SHUFFLE_MB) {
      warnings.push({
        id: `large-shuffle-${op.id}`,
        severity: 'error',
        title: 'Extreme Shuffle Volume',
        message: `${op.type} will shuffle ~${shuffleMB.toFixed(0)} MB.`,
        learningModeMessage: `Shuffling ${shuffleMB.toFixed(0)} MB means writing to disk, transferring over network, and reading back. This is very expensive. Can you filter before this operation?`,
        suggestedAction: 'Filter or sample data before shuffle operations.',
        relatedOperation: op.id,
      });
    } else if (shuffleMB > THRESHOLDS.LARGE_SHUFFLE_MB) {
      warnings.push({
        id: `shuffle-${op.id}`,
        severity: 'warning',
        title: 'Large Shuffle',
        message: `${op.type} will shuffle ~${shuffleMB.toFixed(0)} MB.`,
        learningModeMessage: `Shuffling redistributes data across executors. ${shuffleMB.toFixed(0)} MB is significant network and disk I/O.`,
        suggestedAction: 'Consider filtering beforehand to reduce shuffle volume.',
        relatedOperation: op.id,
      });
    }
    
    // Join-specific warnings
    if (op.type === 'join') {
      const rightRows = (op.params.right_rows as number) || 0;
      const rightSizeMB = (rightRows * shape.avgRowSizeBytes) / (1024 * 1024);
      const broadcastThreshold = ((op.params.broadcast_threshold as number) || (THRESHOLDS.BROADCAST_DEFAULT_MB * 1024 * 1024)) / (1024 * 1024);
      
      if (rightSizeMB > broadcastThreshold * 0.8 && rightSizeMB < broadcastThreshold * 1.2) {
        warnings.push({
          id: `join-borderline-${op.id}`,
          severity: 'info',
          title: 'Borderline Broadcast',
          message: `Right table (${rightSizeMB.toFixed(0)} MB) is near broadcast threshold (${broadcastThreshold.toFixed(0)} MB).`,
          learningModeMessage: `Join strategy may change based on statistics. If right table crosses threshold, Spark will switch from broadcast to shuffle join, which is much slower.`,
          suggestedAction: 'Verify actual table size or adjust broadcast threshold.',
          relatedOperation: op.id,
        });
      }
    }
    
    // Update current rows for next operation
    if (op.type === 'filter') {
      const selectivity = (op.params.selectivity as number) || 0.5;
      currentRows = Math.floor(currentRows * selectivity);
    } else if (op.type === 'groupby') {
      currentRows = (op.params.num_groups as number) || currentRows / 10;
    } else if (op.type === 'distinct') {
      const duplicatesRatio = (op.params.duplicates_ratio as number) || 0.1;
      currentRows = Math.floor(currentRows * (1 - duplicatesRatio));
    }
  });
  
  return warnings;
}

/**
 * Get severity color classes
 */
export function getSeverityStyles(severity: ValidationSeverity): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case 'error':
      return {
        bg: 'bg-red-500/10 dark:bg-red-500/20',
        border: 'border-red-500/30',
        text: 'text-red-700 dark:text-red-400',
        icon: '🔴',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        border: 'border-yellow-500/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: '⚠️',
      };
    case 'info':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: 'ℹ️',
      };
  }
}
