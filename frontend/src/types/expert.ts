/**
 * Type definitions for Expert Components.
 * 
 * These types cover advanced Spark features like AQE, DPP, bucketing, etc.
 */

// ============================================================================
// AQE (Adaptive Query Execution) Types
// ============================================================================

export interface AQEOptimization {
  optimization_type: string;
  explanation: string;
  before_value: string;
  after_value: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AQESimulationResult {
  aqe_enabled: boolean;
  optimizations_applied: AQEOptimization[];
  before_metrics: {
    partition_count: number;
    row_count: number;
    total_size_bytes: number;
    skew_factor: number;
  };
  after_metrics: {
    partition_count: number;
    row_count: number;
    total_size_bytes: number;
    skew_factor: number;
  };
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AQECoalesceResult {
  before_partitions: number;
  after_partitions: number;
  optimization_triggered: boolean;
  explanation: string;
  evidence: {
    avg_partition_size_before: number;
    target_partition_size: number;
    total_shuffle_bytes: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

export interface AQESkewJoinResult {
  skew_detected: boolean;
  optimization_applied: boolean;
  num_skewed_partitions: number;
  num_splits: number;
  estimated_task_time_reduction_pct: number;
  explanation: string;
  evidence: {
    max_partition_size: number;
    median_partition_size: number;
    skew_factor: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

export interface AQEJoinStrategyResult {
  original_strategy: string;
  optimized_strategy: string;
  strategy_changed: boolean;
  explanation: string;
  evidence: {
    left_size_bytes: number;
    right_size_bytes: number;
    broadcast_threshold_bytes: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// DPP (Dynamic Partition Pruning) Types
// ============================================================================

export interface DPPResult {
  total_partitions: number;
  partitions_pruned: number;
  partitions_scanned: number;
  scan_reduction_pct: number;
  explanation: string;
  evidence: {
    total_partitions: number;
    filter_selectivity: number;
    estimated_pruned_partitions?: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// Bucketing Calculator Types
// ============================================================================

export interface BucketingResult {
  bucket_count: number;
  shuffle_reduction_pct: number;
  storage_overhead_pct: number;
  explanation: string;
  evidence: {
    bucket_count: number;
    left_size_bytes: number;
    right_size_bytes: number;
    total_size_bytes: number;
  };
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================================
// Format Benchmark Types
// ============================================================================

export interface FormatMetrics {
  estimated_size_bytes: number;
  estimated_scan_mb_s: number;
  compression_ratio: number;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FormatBenchmarkResult {
  formats: Record<string, FormatMetrics>;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}
