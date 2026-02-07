'use client';

/**
 * File Format Benchmark
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Database, Layers, Activity } from 'lucide-react';

import type { FormatBenchmarkResult } from '@/types/expert';

interface FormatBenchmarkProps {
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function FormatBenchmark({ className = '' }: FormatBenchmarkProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  const [rawSizeBytes, setRawSizeBytes] = useState(100_000_000);
  const [selectivity, setSelectivity] = useState(0.2);
  const [result, setResult] = useState<FormatBenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/expert/format-benchmark/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_size_bytes: rawSizeBytes,
          query_selectivity: selectivity,
        }),
      });

      if (!response.ok) throw new Error('Format benchmark failed');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Format benchmark error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEntries = result ? Object.entries(result.formats) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Database className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Format Benchmark</h3>
          <p className="text-sm text-muted-foreground">
            Compare CSV vs Parquet vs Delta for size and scan speed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Raw Size: {formatBytes(rawSizeBytes)}
              </label>
              <input
                type="range"
                min={10_000_000}
                max={1_000_000_000}
                step={10_000_000}
                value={rawSizeBytes}
                onChange={(e) => setRawSizeBytes(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Query Selectivity: {(selectivity * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0.05}
                max={1.0}
                step={0.05}
                value={selectivity}
                onChange={(e) => setSelectivity(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Comparing...' : 'Compare Formats'}
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
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.summary}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    Confidence: <span className="font-medium">{result.confidence.toUpperCase()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formatEntries.map(([name, metrics]) => {
                    // Determine if this format is the "winner" based on size and speed
                    const isSmallest = formatEntries.every(([n, m]) => 
                      n === name || metrics.estimated_size_bytes <= m.estimated_size_bytes
                    );
                    const isFastest = formatEntries.every(([n, m]) => 
                      n === name || metrics.estimated_scan_mb_s >= m.estimated_scan_mb_s
                    );
                    const isWinner = isSmallest && isFastest;
                    
                    return (
                      <motion.div
                        key={name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * formatEntries.indexOf([name, metrics]) }}
                        className={`bg-card border rounded-lg p-4 relative ${
                          isWinner 
                            ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' 
                            : 'border-border'
                        }`}
                      >
                        {isWinner && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Best
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          {name === 'csv' && <FileText className="w-5 h-5 text-slate-400" />}
                          {name === 'parquet' && <Layers className="w-5 h-5 text-purple-400" />}
                          {name === 'delta' && <Database className="w-5 h-5 text-blue-400" />}
                          <span className="font-semibold capitalize">{name === 'delta' ? 'Delta Lake' : name}</span>
                        </div>
                        
                        {/* Size Metric */}
                        <div className="mb-3">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                            <span>Storage Size</span>
                            {isSmallest && (
                              <span className="text-emerald-400 text-xs">●</span>
                            )}
                          </div>
                          <div className="text-xl font-mono font-bold">
                            {formatBytes(metrics.estimated_size_bytes)}
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${(metrics.estimated_size_bytes / Math.max(...formatEntries.map(([, m]) => m.estimated_size_bytes))) * 100}%` 
                              }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full ${
                                name === 'csv' ? 'bg-slate-400' : 
                                name === 'parquet' ? 'bg-purple-400' : 
                                'bg-blue-400'
                              }`}
                            />
                          </div>
                        </div>
                        
                        {/* Scan Speed Metric */}
                        <div className="mb-3">
                          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                            <span>Scan Speed</span>
                            {isFastest && (
                              <span className="text-emerald-400 text-xs">●</span>
                            )}
                          </div>
                          <div className="text-xl font-mono font-bold">
                            {metrics.estimated_scan_mb_s.toFixed(0)} MB/s
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: `${(metrics.estimated_scan_mb_s / Math.max(...formatEntries.map(([, m]) => m.estimated_scan_mb_s))) * 100}%` 
                              }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                              className={`h-full ${
                                name === 'csv' ? 'bg-slate-400' : 
                                name === 'parquet' ? 'bg-purple-400' : 
                                'bg-blue-400'
                              }`}
                            />
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                          {metrics.explanation}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
                <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Configure inputs and run the benchmark to compare formats.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
