'use client';

/**
 * DPP (Dynamic Partition Pruning) Visualizer
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Scissors, Activity, CheckCircle2, XCircle } from 'lucide-react';

import type { DPPResult } from '@/types/expert';

interface DPPVisualizerProps {
  className?: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function DPPVisualizer({ className = '' }: DPPVisualizerProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  const [totalPartitions, setTotalPartitions] = useState(200);
  const [filterSelectivity, setFilterSelectivity] = useState(0.2);
  const [dppEnabled, setDppEnabled] = useState(true);
  const [broadcastJoin, setBroadcastJoin] = useState(true);
  const [result, setResult] = useState<DPPResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/expert/dpp/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_partitions: totalPartitions,
          filter_selectivity: filterSelectivity,
          dynamic_pruning_enabled: dppEnabled,
          broadcast_join: broadcastJoin,
        }),
      });

      if (!response.ok) throw new Error('DPP simulation failed');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('DPP simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Filter className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Dynamic Partition Pruning (DPP)</h3>
          <p className="text-sm text-muted-foreground">
            See how DPP skips partitions at runtime based on filter selectivity
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Partitions: {totalPartitions}</label>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={totalPartitions}
                onChange={(e) => setTotalPartitions(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Filter Selectivity: {(filterSelectivity * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.05}
                value={filterSelectivity}
                onChange={(e) => setFilterSelectivity(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">DPP Enabled</span>
                <input
                  type="checkbox"
                  checked={dppEnabled}
                  onChange={(e) => setDppEnabled(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">Broadcast Join</span>
                <input
                  type="checkbox"
                  checked={broadcastJoin}
                  onChange={(e) => setBroadcastJoin(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Simulating...' : 'Simulate DPP'}
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
                    <div className="p-2 bg-emerald-500/10 rounded">
                      {result.partitions_pruned > 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-slate-500" />
                      )}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground">Partitions Pruned</div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {formatNumber(result.partitions_pruned)}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground">Partitions Scanned</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(result.partitions_scanned)}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-xs text-muted-foreground">Scan Reduction</div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {result.scan_reduction_pct.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Visual Partition Representation */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h4 className="text-sm font-medium mb-4">Partition Visualization</h4>
                  <div className="space-y-4">
                    {/* Pruned Partitions Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          Pruned ({formatNumber(result.partitions_pruned)})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.scan_reduction_pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.scan_reduction_pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        />
                      </div>
                    </div>
                    
                    {/* Scanned Partitions Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Scanned ({formatNumber(result.partitions_scanned)})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(100 - result.scan_reduction_pct).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - result.scan_reduction_pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-slate-500 to-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-500">Runtime Evidence</span>
                  </div>
                  <div className="text-sm text-emerald-300/80">
                    Selectivity: {(result.evidence.filter_selectivity * 100).toFixed(0)}% •
                    Total Partitions: {formatNumber(result.evidence.total_partitions)}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Configure DPP inputs and run the simulation to see pruning impact.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
