'use client';

/**
 * DPP Tutorial - Wraps expert DPP Visualizer for tutorial context
 * 
 * Interactive demonstration of Dynamic Partition Pruning:
 * how Spark skips reading partitions using filter values from the dimension table.
 */

import { DPPVisualizer } from '@/components/expert/DPPVisualizer';
import { cn } from '@/lib/utils';

interface DPPTutorialProps {
  className?: string;
}

export function DPPTutorial({ className = '' }: DPPTutorialProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Context Panel */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl p-5">
        <h3 className="font-bold text-green-900 dark:text-green-200 mb-2 flex items-center gap-2">
          <span>🔍</span> How DPP Works
        </h3>
        <div className="text-sm text-green-800 dark:text-green-300 space-y-2">
          <p>
            <strong>Dynamic Partition Pruning (DPP)</strong> uses filter conditions from a dimension table 
            to skip reading partitions in the fact table at runtime.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Star Schema Optimization:</strong> Works best when fact table is partitioned and dimension table is filtered</li>
            <li><strong>Runtime Filter Pushdown:</strong> Spark builds a bloom filter from the dimension side and pushes it to the scan</li>
            <li><strong>Requires Broadcast Join:</strong> The dimension side must be broadcast (or AQE converts to broadcast)</li>
          </ul>
          <p className="mt-2 text-green-600 dark:text-green-400 italic">
            Adjust the partition count and filter selectivity to see how much data DPP can skip.
          </p>
        </div>
      </div>

      {/* Interactive Visualizer */}
      <DPPVisualizer className="w-full" />
    </div>
  );
}
