'use client';

/**
 * AQE (Adaptive Query Execution) Simulator
 * 
 * Interactive component showing how Spark's AQE feature optimizes queries at runtime.
 * Demonstrates:
 * - Partition coalescing (reducing small partitions)
 * - Skew join handling (splitting large partitions)
 * - Dynamic join strategy switching (SortMerge → Broadcast)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Layers,
  Lightbulb,
  Shuffle,
  Sparkles,
  TrendingDown,
  XCircle,
  Zap,
} from 'lucide-react';

import type { AQESimulationResult } from '@/types/expert';

interface AQESimulatorProps {
  className?: string;
}

interface DataShapeConfig {
  rows: number;
  partitions: number;
  skewFactor: number;
  avgRowSizeBytes: number;
  operationType: string;
}

const OPERATION_TYPES = [
  { value: 'join', label: 'Join', icon: GitBranch },
  { value: 'groupby', label: 'GroupBy', icon: Layers },
  { value: 'repartition', label: 'Repartition', icon: Shuffle },
  { value: 'filter', label: 'Filter', icon: Activity },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function AQESimulator({ className = '' }: AQESimulatorProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  const [config, setConfig] = useState<DataShapeConfig>({
    rows: 10_000_000,
    partitions: 200,
    skewFactor: 1.0,
    avgRowSizeBytes: 100,
    operationType: 'join',
  });

  const [aqeEnabled, setAqeEnabled] = useState(true);
  const [result, setResult] = useState<AQESimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedOpt, setExpandedOpt] = useState<number | null>(null);

  const updateConfig = <K extends keyof DataShapeConfig>(
    key: K,
    value: DataShapeConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/expert/aqe/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: config.rows,
          partitions: config.partitions,
          skew_factor: config.skewFactor,
          avg_row_size_bytes: config.avgRowSizeBytes,
          operation_type: config.operationType,
          aqe_enabled: aqeEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('AQE simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-orange-500';
      default:
        return 'text-slate-400';
    }
  };

  const getOptimizationIcon = (type: string) => {
    switch (type) {
      case 'coalesce_partitions':
        return TrendingDown;
      case 'skew_join':
        return BarChart3;
      case 'dynamic_join_strategy':
        return Zap;
      default:
        return Sparkles;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Sparkles className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AQE Simulator</h2>
            <p className="text-sm text-muted-foreground">
              See how Adaptive Query Execution optimizes at runtime
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              DataFrame Shape
            </h3>

            {/* Rows */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rows: {formatNumber(config.rows)}
              </label>
              <input
                type="range"
                min={100_000}
                max={100_000_000}
                step={1_000_000}
                value={config.rows}
                onChange={(e) => updateConfig('rows', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Partitions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Partitions: {config.partitions}
              </label>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={config.partitions}
                onChange={(e) => updateConfig('partitions', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Skew Factor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Skew Factor: {config.skewFactor.toFixed(1)}×
              </label>
              <input
                type="range"
                min={1.0}
                max={20.0}
                step={0.5}
                value={config.skewFactor}
                onChange={(e) => updateConfig('skewFactor', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <p className="text-xs text-muted-foreground">
                {config.skewFactor === 1.0
                  ? 'Perfectly balanced data'
                  : config.skewFactor < 3
                  ? 'Slightly skewed'
                  : config.skewFactor < 5
                  ? 'Moderately skewed'
                  : 'Highly skewed'}
              </p>
            </div>

            {/* Avg Row Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Avg Row Size: {config.avgRowSizeBytes} bytes
              </label>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={config.avgRowSizeBytes}
                onChange={(e) => updateConfig('avgRowSizeBytes', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Operation Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Operation Type</label>
              <div className="grid grid-cols-2 gap-2">
                {OPERATION_TYPES.map((op) => {
                  const Icon = op.icon;
                  return (
                    <button
                      key={op.value}
                      onClick={() => updateConfig('operationType', op.value)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        config.operationType === op.value
                          ? 'bg-purple-500/20 border-purple-500 text-purple-500'
                          : 'bg-card border-border hover:border-purple-500/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      {op.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AQE Toggle */}
            <div className="pt-4 border-t border-border">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium">Enable AQE</span>
                <div
                  onClick={() => setAqeEnabled(!aqeEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    aqeEnabled ? 'bg-purple-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      aqeEnabled ? 'translate-x-6' : ''
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Run Button */}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run AQE Simulation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Summary Card */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      result.aqe_enabled
                        ? 'bg-purple-500/10'
                        : 'bg-slate-500/10'
                    }`}>
                      {result.aqe_enabled ? (
                        <CheckCircle2 className="w-6 h-6 text-purple-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        {result.aqe_enabled ? 'AQE Enabled' : 'AQE Disabled'}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.summary}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <span className={`text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                          {result.confidence.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Before/After Metrics */}
                {result.aqe_enabled && result.optimizations_applied.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-4">
                        Before AQE
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Partitions</div>
                          <div className="text-2xl font-bold">
                            {result.before_metrics.partition_count}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Total Size</div>
                          <div className="text-lg font-mono">
                            {formatBytes(result.before_metrics.total_size_bytes)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-6">
                      <h4 className="text-sm font-semibold text-purple-400 mb-4">
                        After AQE
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-purple-300/70">Partitions</div>
                          <div className="text-2xl font-bold text-purple-400">
                            {result.after_metrics.partition_count}
                            {result.after_metrics.partition_count !== result.before_metrics.partition_count && (
                              <span className="text-sm ml-2 text-green-500">
                                ({result.after_metrics.partition_count - result.before_metrics.partition_count})
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-300/70">Total Size</div>
                          <div className="text-lg font-mono text-purple-400">
                            {formatBytes(result.after_metrics.total_size_bytes)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optimizations Applied */}
                {result.optimizations_applied.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Optimizations Applied ({result.optimizations_applied.length})
                    </h3>

                    {result.optimizations_applied.map((opt, idx) => {
                      const Icon = getOptimizationIcon(opt.optimization_type);
                      const isExpanded = expandedOpt === idx;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-card border border-border rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedOpt(isExpanded ? null : idx)}
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-500/10 rounded">
                                <Icon className="w-4 h-4 text-purple-500" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium">
                                  {opt.optimization_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                  <span>{opt.before_value}</span>
                                  <ArrowRight className="w-3 h-3" />
                                  <span className="text-purple-500">{opt.after_value}</span>
                                </div>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border"
                              >
                                <div className="p-4 space-y-3">
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {opt.explanation}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Confidence:</span>
                                    <span className={`font-medium ${getConfidenceColor(opt.confidence)}`}>
                                      {opt.confidence.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* No Optimizations */}
                {result.aqe_enabled && result.optimizations_applied.length === 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-400 mb-1">
                          Execution Already Optimal
                        </h4>
                        <p className="text-sm text-blue-300/70">
                          AQE analyzed the query but found no optimizations needed. 
                          The current execution plan is already efficient for this data shape.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card border border-dashed border-border rounded-lg p-12 text-center"
              >
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Ready to Simulate AQE</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your DataFrame shape and click &quot;Run AQE Simulation&quot;
                  to see how Adaptive Query Execution would optimize your query.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
