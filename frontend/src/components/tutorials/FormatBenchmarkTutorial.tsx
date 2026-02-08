'use client';

/**
 * Format Benchmark Tutorial - Wraps expert FormatBenchmark for tutorial context
 * 
 * Interactive comparison of Parquet, CSV, and Delta Lake performance
 * across different query patterns and data characteristics.
 */

import { FormatBenchmark } from '@/components/expert/FormatBenchmark';
import { cn } from '@/lib/utils';

interface FormatBenchmarkTutorialProps {
  className?: string;
}

export function FormatBenchmarkTutorial({ className = '' }: FormatBenchmarkTutorialProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Context Panel */}
      <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 rounded-xl p-5">
        <h3 className="font-bold text-cyan-900 dark:text-cyan-200 mb-2 flex items-center gap-2">
          <span>📊</span> Why File Format Matters
        </h3>
        <div className="text-sm text-cyan-800 dark:text-cyan-300 space-y-2">
          <p>
            <strong>Columnar formats</strong> like Parquet store data by column, enabling 
            column pruning and better compression. Row formats like CSV must read all columns.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Parquet:</strong> Column pruning + predicate pushdown via min/max stats per row group</li>
            <li><strong>CSV:</strong> Must read entire rows, no column pruning, poor compression</li>
            <li><strong>Delta Lake:</strong> Parquet + ACID transactions, time travel, Z-ordering for multi-dimensional pruning</li>
          </ul>
          <p className="mt-2 text-cyan-600 dark:text-cyan-400 italic">
            Adjust the data size and query selectivity to compare scan performance across formats.
          </p>
        </div>
      </div>

      {/* Interactive Benchmark */}
      <FormatBenchmark className="w-full" />
    </div>
  );
}
