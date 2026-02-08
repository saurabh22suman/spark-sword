'use client';

/**
 * AQE Tutorial - Wraps expert AQE Simulator for tutorial context
 * 
 * Interactive walkthrough of how Spark's Adaptive Query Execution
 * re-optimizes queries at runtime based on actual data statistics.
 */

import { AQESimulator } from '@/components/expert/AQESimulator';
import { cn } from '@/lib/utils';

interface AQETutorialProps {
  className?: string;
}

export function AQETutorial({ className = '' }: AQETutorialProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Context Panel */}
      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl p-5">
        <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-2">
          <span>⚡</span> How AQE Works
        </h3>
        <div className="text-sm text-purple-800 dark:text-purple-300 space-y-2">
          <p>
            <strong>Adaptive Query Execution (AQE)</strong> re-plans queries after each stage 
            using <em>actual</em> runtime statistics instead of static estimates.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Coalesce Partitions:</strong> Merges small post-shuffle partitions automatically</li>
            <li><strong>Dynamic Join Strategy:</strong> Switches SortMerge → Broadcast if one side is small</li>
            <li><strong>Skew Join:</strong> Splits large partitions and replicates the other side</li>
          </ul>
          <p className="mt-2 text-purple-600 dark:text-purple-400 italic">
            Try changing the data shape and operation type to see how AQE&apos;s decisions change.
          </p>
        </div>
      </div>

      {/* Interactive Simulator */}
      <AQESimulator className="w-full" />
    </div>
  );
}
