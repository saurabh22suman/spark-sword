"use client";

import React, { useState } from "react";
import { Info, HelpCircle } from "lucide-react";

export interface MetricExplanation {
  metric: string;
  definition: string; 
  goodRange: string;
  why_it_matters: string;
  example?: string;
}

const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
  "shuffle_read_bytes": {
    metric: "Shuffle Read",
    definition: "Data received from other executors during shuffle operations",
    goodRange: "Minimize - only when necessary for operations like join, groupBy",
    why_it_matters: "Network transfer is 10-100x slower than local disk. High shuffle read means data is moving across the cluster.",
    example: "After a join, executors pull matching keys from all other executors"
  },
  "shuffle_write_bytes": {
    metric: "Shuffle Write",
    definition: "Data written to disk during shuffle, ready to be read by downstream stages",
    goodRange: "Should be ≤ input bytes (no expansion)",
    why_it_matters: "Disk I/O + network overhead. If shuffle write > input, you're creating more data than you started with.",
    example: "Before a join, Spark partitions data by join key and writes to local disk"
  },
  "spill_bytes": {
    metric: "Spill to Disk",
    definition: "Data that didn't fit in executor memory and was written to disk temporarily",
    goodRange: "Ideally 0, acceptable if < 10% of shuffle",
    why_it_matters: "Disk is 100x slower than RAM. Spilling kills performance.",
    example: "During a large groupBy, if intermediate results exceed memory, Spark spills to disk"
  },
  "gc_time": {
    metric: "GC Time",
    definition: "Time spent in garbage collection (cleaning up unused Java objects)",
    goodRange: "< 10% of total task time",
    why_it_matters: "High GC means executor is spending time managing memory instead of processing data.",
    example: "If GC is 30% of runtime, you're wasting 30% of cluster capacity"
  },
  "task_duration": {
    metric: "Task Duration",
    definition: "Time for a single task to complete (from launch to finish)",
    goodRange: "Uniform across tasks (< 2x variance)",
    why_it_matters: "Stage waits for the slowest task. If one task is 10x slower, the whole stage is blocked.",
    example: "199 tasks finish in 2s, but 1 task takes 45s → stage duration = 45s"
  },
  "input_bytes": {
    metric: "Input Bytes",
    definition: "Data read from external source (HDFS, S3, database) or previous stage",
    goodRange: "N/A - depends on your data size",
    why_it_matters: "Baseline for understanding data expansion. If output > input, investigate why.",
    example: "Reading a 10GB Parquet file → input_bytes = 10GB"
  },
  "output_bytes": {
    metric: "Output Bytes",
    definition: "Data written to external sink (HDFS, S3, database) or next stage",
    goodRange: "Should be ≤ input_bytes (no unexplained expansion)",
    why_it_matters: "Shows data transformation impact. If output >> input, you might have a cartesian join or explode().",
    example: "Writing aggregation results → output_bytes = 100MB (from 10GB input)"
  },
  "num_tasks": {
    metric: "Number of Tasks",
    definition: "How many parallel tasks Spark created for this stage",
    goodRange: "2-3x number of executor cores",
    why_it_matters: "Too few = underutilized cluster. Too many = scheduling overhead.",
    example: "With 100 executor cores, aim for 200-300 tasks"
  },
  "executor_cores": {
    metric: "Executor Cores",
    definition: "CPU cores allocated to each executor",
    goodRange: "Typically 4-8 cores per executor",
    why_it_matters: "More cores = more parallelism, but diminishing returns due to GC overhead.",
    example: "5 cores per executor = each executor can run 5 tasks simultaneously"
  },
  "executor_memory": {
    metric: "Executor Memory",
    definition: "RAM allocated to each executor JVM",
    goodRange: "Depends on data size - start with 4-8GB",
    why_it_matters: "Too little = spilling. Too much = wasted resources + GC pressure.",
    example: "For 100GB dataset with 10 executors, try 12GB per executor"
  },
  "partitions": {
    metric: "Partitions",
    definition: "Number of chunks your DataFrame is split into",
    goodRange: "Each partition should be 100-200MB",
    why_it_matters: "Partitions = parallelism unit. Too few = underutilized. Too many = overhead.",
    example: "10GB data / 100MB per partition = 100 partitions"
  }
};

interface MetricTooltipProps {
  metricKey: string;
  children?: React.ReactNode;
  className?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({ 
  metricKey, 
  children,
  className = ""
}) => {
  const [show, setShow] = useState(false);
  const explanation = METRIC_EXPLANATIONS[metricKey];
  
  if (!explanation) {
    // No explanation available - just render children
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <button 
        className={`inline-flex items-center gap-1.5 text-left ${className}`}
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        {children}
        <HelpCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" />
      </button>
      
      {show && (
        <div className="absolute left-0 top-full mt-2 max-w-sm rounded-lg bg-gray-900 dark:bg-gray-800 p-4 shadow-xl border border-gray-700 z-50">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start gap-2 pb-2 border-b border-gray-700">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white text-sm">{explanation.metric}</h4>
                <p className="text-xs text-gray-300 mt-0.5">{explanation.definition}</p>
              </div>
            </div>

            {/* Good Range */}
            <div>
              <div className="text-xs font-semibold text-green-400 mb-1">✓ Good Range:</div>
              <div className="text-xs text-gray-300">{explanation.goodRange}</div>
            </div>

            {/* Why It Matters */}
            <div>
              <div className="text-xs font-semibold text-amber-400 mb-1">⚡ Why It Matters:</div>
              <div className="text-xs text-gray-300">{explanation.why_it_matters}</div>
            </div>

            {/* Example */}
            {explanation.example && (
              <div>
                <div className="text-xs font-semibold text-purple-400 mb-1">📝 Example:</div>
                <div className="text-xs text-gray-300 italic">{explanation.example}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper hook to get explanation text directly
export function useMetricExplanation(metricKey: string): MetricExplanation | undefined {
  return METRIC_EXPLANATIONS[metricKey];
}

// Export the dictionary for other uses
export { METRIC_EXPLANATIONS };
