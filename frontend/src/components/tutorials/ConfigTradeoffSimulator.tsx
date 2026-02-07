'use client';

/**
 * Config Trade-off Simulator
 * 
 * Change a config and see both the benefit AND the downside.
 * Teaching: Configs are trade-offs, not magic fixes.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Settings, TrendingUp, TrendingDown, Scale, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigOption {
  id: string;
  name: string;
  property: string;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit: string;
  getBenefit: (value: number, defaultVal: number) => { text: string; magnitude: number };
  getDownside: (value: number, defaultVal: number) => { text: string; magnitude: number };
  description: string;
}

const CONFIGS: ConfigOption[] = [
  {
    id: 'shuffle-partitions',
    name: 'Shuffle Partitions',
    property: 'spark.sql.shuffle.partitions',
    defaultValue: 200,
    minValue: 1,
    maxValue: 2000,
    step: 10,
    unit: '',
    description: 'Number of partitions after shuffle operations',
    getBenefit: (val, def) => {
      if (val > def) {
        return { 
          text: `More parallelism: ${val} tasks can run concurrently. Better for large data.`,
          magnitude: Math.min((val - def) / def, 1)
        };
      } else if (val < def) {
        return {
          text: `Less shuffle overhead: fewer files, faster downstream reads.`,
          magnitude: Math.min((def - val) / def, 1)
        };
      }
      return { text: 'Balanced default setting.', magnitude: 0 };
    },
    getDownside: (val, def) => {
      if (val > def) {
        return {
          text: `Small files problem: ${val} output files may be tiny. Driver overhead increases.`,
          magnitude: Math.min((val - def) / def, 1)
        };
      } else if (val < def) {
        return {
          text: `Less parallelism: ${val} tasks may not utilize cluster fully. Risk of OOM per task.`,
          magnitude: Math.min((def - val) / def, 1)
        };
      }
      return { text: 'Balanced default setting.', magnitude: 0 };
    }
  },
  {
    id: 'broadcast-threshold',
    name: 'Broadcast Threshold',
    property: 'spark.sql.autoBroadcastJoinThreshold',
    defaultValue: 10,
    minValue: -1,
    maxValue: 500,
    step: 5,
    unit: 'MB',
    description: 'Max size for auto-broadcast joins (-1 = disabled)',
    getBenefit: (val, def) => {
      if (val > def) {
        return {
          text: `More broadcast joins: tables up to ${val}MB broadcast, avoiding shuffle.`,
          magnitude: Math.min((val - def) / 100, 1)
        };
      } else if (val < def && val >= 0) {
        return {
          text: `Less driver memory pressure: smaller tables broadcast.`,
          magnitude: Math.min((def - val) / def, 1)
        };
      } else if (val === -1) {
        return {
          text: `All joins use shuffle: predictable memory usage.`,
          magnitude: 0.5
        };
      }
      return { text: 'Default auto-broadcast for small tables.', magnitude: 0 };
    },
    getDownside: (val, def) => {
      if (val > def) {
        return {
          text: `Driver OOM risk: broadcasting ${val}MB tables to all executors uses memory.`,
          magnitude: Math.min((val - def) / 100, 1)
        };
      } else if (val < def && val >= 0) {
        return {
          text: `More shuffles: joins that could broadcast will shuffle instead.`,
          magnitude: Math.min((def - val) / def, 1)
        };
      } else if (val === -1) {
        return {
          text: `Missing optimization: small table joins will shuffle unnecessarily.`,
          magnitude: 0.7
        };
      }
      return { text: 'Default auto-broadcast for small tables.', magnitude: 0 };
    }
  },
  {
    id: 'executor-memory',
    name: 'Executor Memory',
    property: 'spark.executor.memory',
    defaultValue: 4,
    minValue: 1,
    maxValue: 32,
    step: 1,
    unit: 'GB',
    description: 'Memory allocated per executor',
    getBenefit: (val, def) => {
      if (val > def) {
        return {
          text: `More memory per task: handle larger aggregations, fewer spills.`,
          magnitude: Math.min((val - def) / def, 1)
        };
      } else if (val < def) {
        return {
          text: `More executors possible: with fixed cluster memory, smaller = more parallelism.`,
          magnitude: Math.min((def - val) / def, 1)
        };
      }
      return { text: 'Balanced memory allocation.', magnitude: 0 };
    },
    getDownside: (val, def) => {
      if (val > def) {
        return {
          text: `Fewer executors: less parallelism. GC pauses may increase with larger heaps.`,
          magnitude: Math.min((val - def) / def, 1)
        };
      } else if (val < def) {
        return {
          text: `Spill risk: tasks may spill to disk with limited memory.`,
          magnitude: Math.min((def - val) / def, 1)
        };
      }
      return { text: 'Balanced memory allocation.', magnitude: 0 };
    }
  },
  {
    id: 'aqe',
    name: 'Adaptive Query Execution',
    property: 'spark.sql.adaptive.enabled',
    defaultValue: 1,
    minValue: 0,
    maxValue: 1,
    step: 1,
    unit: '',
    description: 'Enable runtime query optimization',
    getBenefit: (val) => {
      if (val === 1) {
        return {
          text: `Runtime optimization: auto-coalesce, skew handling, join strategy changes.`,
          magnitude: 0.8
        };
      }
      return {
        text: `Predictable plans: useful for debugging and understanding Spark behavior.`,
        magnitude: 0.3
      };
    },
    getDownside: (val) => {
      if (val === 1) {
        return {
          text: `Less predictable: plans change at runtime, harder to debug.`,
          magnitude: 0.4
        };
      }
      return {
        text: `Missing optimizations: no auto-coalesce, no skew handling.`,
        magnitude: 0.7
      };
    }
  }
];

function TradeoffBar({ 
  label, 
  magnitude, 
  type 
}: { 
  label: string; 
  magnitude: number; 
  type: 'benefit' | 'downside';
}) {
  const color = type === 'benefit' ? 'bg-green-500' : 'bg-red-500';
  const textColor = type === 'benefit' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400';
  const Icon = type === 'benefit' ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", textColor)} />
        <span className={cn("text-sm", textColor)}>{label}</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${magnitude * 100}%` }}
          transition={{ duration: 0.5 }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

export function ConfigTradeoffSimulator({ className }: { className?: string }) {
  const [selectedConfig, setSelectedConfig] = useState(CONFIGS[0]);
  const [value, setValue] = useState(selectedConfig.defaultValue);

  const tradeoffs = useMemo(() => {
    const benefit = selectedConfig.getBenefit(value, selectedConfig.defaultValue);
    const downside = selectedConfig.getDownside(value, selectedConfig.defaultValue);
    return { benefit, downside };
  }, [selectedConfig, value]);

  const reset = () => {
    setValue(selectedConfig.defaultValue);
  };

  const handleConfigChange = (config: ConfigOption) => {
    setSelectedConfig(config);
    setValue(config.defaultValue);
  };

  const isDefault = value === selectedConfig.defaultValue;
  const isBoolean = selectedConfig.id === 'aqe';

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Config Trade-off Simulator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Every config has a benefit AND a downside
            </p>
          </div>
          <button
            onClick={reset}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Config Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {CONFIGS.map((config) => (
            <button
              key={config.id}
              onClick={() => handleConfigChange(config)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                selectedConfig.id === config.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              )}
            >
              <Settings className={cn(
                "w-4 h-4 mb-2",
                selectedConfig.id === config.id ? "text-blue-600" : "text-slate-400"
              )} />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {config.name}
              </div>
            </button>
          ))}
        </div>

        {/* Config Details */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
          <code className="text-sm text-blue-600 dark:text-blue-400 font-mono">
            {selectedConfig.property}
          </code>
          <p className="text-sm text-slate-500 mt-2">{selectedConfig.description}</p>
        </div>

        {/* Value Slider */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Value:
            </label>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold",
                isDefault ? "text-slate-600" : "text-blue-600"
              )}>
                {isBoolean ? (value === 1 ? 'true' : 'false') : value}
              </span>
              {selectedConfig.unit && (
                <span className="text-slate-400">{selectedConfig.unit}</span>
              )}
              {isDefault && (
                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">
                  default
                </span>
              )}
            </div>
          </div>
          
          {isBoolean ? (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setValue(0)}
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-all",
                  value === 0
                    ? "bg-red-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                )}
              >
                false
              </button>
              <button
                onClick={() => setValue(1)}
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-all",
                  value === 1
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                )}
              >
                true
              </button>
            </div>
          ) : (
            <input
              type="range"
              min={selectedConfig.minValue}
              max={selectedConfig.maxValue}
              step={selectedConfig.step}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          )}
          
          {!isBoolean && (
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{selectedConfig.minValue}{selectedConfig.unit}</span>
              <span className="text-slate-500">
                Default: {selectedConfig.defaultValue}{selectedConfig.unit}
              </span>
              <span>{selectedConfig.maxValue}{selectedConfig.unit}</span>
            </div>
          )}
        </div>

        {/* Trade-off Display */}
        <div className="flex items-center justify-center mb-6">
          <Scale className="w-6 h-6 text-slate-400" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Benefit */}
          <motion.div
            key={`benefit-${value}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800"
          >
            <h4 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Benefit
            </h4>
            <TradeoffBar
              label={tradeoffs.benefit.text}
              magnitude={tradeoffs.benefit.magnitude}
              type="benefit"
            />
          </motion.div>

          {/* Downside */}
          <motion.div
            key={`downside-${value}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800"
          >
            <h4 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Downside
            </h4>
            <TradeoffBar
              label={tradeoffs.downside.text}
              magnitude={tradeoffs.downside.magnitude}
              type="downside"
            />
          </motion.div>
        </div>

        {/* Warning for extreme values */}
        <AnimatePresence>
          {(tradeoffs.benefit.magnitude > 0.7 || tradeoffs.downside.magnitude > 0.7) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Extreme values have amplified trade-offs. Test thoroughly before production use.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Teaching Insight */}
      <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>💡 Key Insight:</strong> There are no &quot;best&quot; configs — only trade-offs. 
          The right value depends on your data size, cluster resources, and workload pattern.
          Always measure impact with <em>your</em> data.
        </p>
      </div>
    </div>
  );
}
