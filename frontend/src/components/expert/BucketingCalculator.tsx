'use client';

/**
 * Bucketing ROI Calculator
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Boxes, HardDrive, Shuffle, CheckCircle2 } from 'lucide-react';

import type { BucketingResult } from '@/types/expert';

interface BucketingCalculatorProps {
  className?: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function BucketingCalculator({ className = '' }: BucketingCalculatorProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  const [leftRows, setLeftRows] = useState(50_000_000);
  const [rightRows, setRightRows] = useState(5_000_000);
  const [avgRowSize, setAvgRowSize] = useState(100);
  const [bucketCount, setBucketCount] = useState(64);
  const [bucketsAligned, setBucketsAligned] = useState(true);
  const [result, setResult] = useState<BucketingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/expert/bucketing/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          left_rows: leftRows,
          right_rows: rightRows,
          avg_row_size_bytes: avgRowSize,
          bucket_count: bucketCount,
          buckets_aligned: bucketsAligned,
        }),
      });

      if (!response.ok) throw new Error('Bucketing simulation failed');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Bucketing simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Boxes className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Bucketing Calculator</h3>
          <p className="text-sm text-muted-foreground">
            Estimate shuffle reduction vs storage overhead
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Left Rows: {formatNumber(leftRows)}</label>
              <input
                type="range"
                min={1_000_000}
                max={200_000_000}
                step={1_000_000}
                value={leftRows}
                onChange={(e) => setLeftRows(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Right Rows: {formatNumber(rightRows)}</label>
              <input
                type="range"
                min={500_000}
                max={50_000_000}
                step={500_000}
                value={rightRows}
                onChange={(e) => setRightRows(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Avg Row Size: {avgRowSize} bytes</label>
              <input
                type="range"
                min={50}
                max={500}
                step={50}
                value={avgRowSize}
                onChange={(e) => setAvgRowSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bucket Count: {bucketCount}</label>
              <input
                type="range"
                min={8}
                max={256}
                step={8}
                value={bucketCount}
                onChange={(e) => setBucketCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium">Buckets Aligned</span>
              <input
                type="checkbox"
                checked={bucketsAligned}
                onChange={(e) => setBucketsAligned(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Calculating...' : 'Calculate ROI'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-500/10 rounded">
                      <CheckCircle2 className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.explanation}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Confidence: <span className="font-medium">{result.confidence.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Shuffle className="w-3 h-3" />
                      Shuffle Reduction
                    </div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {result.shuffle_reduction_pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <HardDrive className="w-3 h-3" />
                      Storage Overhead
                    </div>
                    <div className="text-2xl font-bold text-amber-500">
                      {result.storage_overhead_pct.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Trade-off Visualization */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h4 className="text-sm font-medium mb-4">ROI Trade-off Analysis</h4>
                  <div className="space-y-4">
                    {/* Shuffle Reduction Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Shuffle className="w-3 h-3" />
                          Shuffle Reduction (Benefit)
                        </span>
                        <span className="text-xs font-medium text-emerald-400">
                          {result.shuffle_reduction_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(result.shuffle_reduction_pct, 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-end pr-2"
                        >
                          {result.shuffle_reduction_pct > 15 && (
                            <span className="text-xs font-medium text-white">
                              {result.shuffle_reduction_pct.toFixed(0)}%
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                    
                    {/* Storage Overhead Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          Storage Overhead (Cost)
                        </span>
                        <span className="text-xs font-medium text-amber-400">
                          {result.storage_overhead_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(result.storage_overhead_pct, 100)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-end pr-2"
                        >
                          {result.storage_overhead_pct > 15 && (
                            <span className="text-xs font-medium text-white">
                              {result.storage_overhead_pct.toFixed(0)}%
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </div>

                    {/* ROI Verdict */}
                    <div className={`mt-4 p-3 rounded-lg border ${
                      result.shuffle_reduction_pct > result.storage_overhead_pct * 2
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : result.shuffle_reduction_pct > result.storage_overhead_pct
                          ? 'bg-blue-500/10 border-blue-500/20'
                          : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <div className="text-xs font-medium">
                        {result.shuffle_reduction_pct > result.storage_overhead_pct * 2
                          ? '✓ Strong ROI - Bucketing likely worthwhile'
                          : result.shuffle_reduction_pct > result.storage_overhead_pct
                            ? '~ Moderate ROI - Consider data access patterns'
                            : '⚠ Weak ROI - Storage cost may outweigh benefits'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
                <Boxes className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Adjust bucketing inputs and run the simulation to see trade-offs.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
