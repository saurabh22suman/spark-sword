'use client';

/**
 * Bucketing Tutorial - Wraps expert Bucketing Calculator for tutorial context
 * 
 * Interactive ROI calculator showing when bucketing pays off:
 * pay write cost once, save shuffle cost on every join.
 */

import { BucketingCalculator } from '@/components/expert/BucketingCalculator';
import { cn } from '@/lib/utils';

interface BucketingTutorialProps {
  className?: string;
}

export function BucketingTutorial({ className = '' }: BucketingTutorialProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Context Panel */}
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl p-5">
        <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-2 flex items-center gap-2">
          <span>📦</span> How Bucketing Works
        </h3>
        <div className="text-sm text-orange-800 dark:text-orange-300 space-y-2">
          <p>
            <strong>Bucketing</strong> pre-partitions data by join key at write time, 
            so Spark can skip the shuffle at read time. It&apos;s a write-time investment for read-time gain.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Write Cost:</strong> Data is hash-partitioned and sorted into exact bucket files</li>
            <li><strong>Read Benefit:</strong> Joins on the bucket key skip shuffle entirely</li>
            <li><strong>Requirement:</strong> Both tables must use the same bucket count and key</li>
          </ul>
          <p className="mt-2 text-orange-600 dark:text-orange-400 italic">
            Adjust table sizes and bucket count to see when bucketing&apos;s ROI becomes positive.
          </p>
        </div>
      </div>

      {/* Interactive Calculator */}
      <BucketingCalculator className="w-full" />
    </div>
  );
}
