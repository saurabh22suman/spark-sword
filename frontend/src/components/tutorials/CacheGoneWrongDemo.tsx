'use client';

/**
 * Cache Gone Wrong Demo
 * 
 * Demonstrates when caching hurts instead of helps.
 * Teaching: Know when caching helps and when it causes problems.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Database, AlertTriangle, CheckCircle, XCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scenario {
  id: string;
  name: string;
  description: string;
  cacheSize: number;  // MB
  dataSize: number;   // MB
  reuses: number;
  computeTimeMs: number;
  isCachingGood: boolean;
  explanation: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'good-reuse',
    name: '✅ Good: Multiple Reuses',
    description: 'DataFrame used 5 times in the pipeline',
    cacheSize: 200,
    dataSize: 200,
    reuses: 5,
    computeTimeMs: 1000,
    isCachingGood: true,
    explanation: 'Caching saves 4x recomputation (4 seconds saved) for 200MB memory cost.'
  },
  {
    id: 'bad-single-use',
    name: '❌ Bad: Single Use',
    description: 'DataFrame cached but only used once',
    cacheSize: 500,
    dataSize: 500,
    reuses: 1,
    computeTimeMs: 500,
    isCachingGood: false,
    explanation: 'Caching wastes 500MB of storage memory for zero benefit. The data is never reused!'
  },
  {
    id: 'bad-memory-pressure',
    name: '❌ Bad: Memory Pressure',
    description: 'Large cache causes spills in aggregations',
    cacheSize: 800,
    dataSize: 800,
    reuses: 3,
    computeTimeMs: 600,
    isCachingGood: false,
    explanation: 'Cache uses 800MB, leaving only 200MB for execution. Aggregations now spill to disk!'
  },
  {
    id: 'bad-serialization',
    name: '⚠️ Risky: Serialization Overhead',
    description: 'Complex objects with high serialization cost',
    cacheSize: 300,
    dataSize: 150,
    reuses: 2,
    computeTimeMs: 200,
    isCachingGood: false,
    explanation: 'Serializing complex nested objects takes longer than recomputing simple transformations.'
  }
];

function MemoryBar({ 
  label, 
  used, 
  total, 
  color,
  animate = false 
}: { 
  label: string; 
  used: number; 
  total: number;
  color: string;
  animate?: boolean;
}) {
  const percentage = Math.min((used / total) * 100, 100);
  const isOverflow = used > total;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={cn(
          "font-medium",
          isOverflow ? "text-red-600" : "text-slate-700 dark:text-slate-300"
        )}>
          {used}MB / {total}MB
        </span>
      </div>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden relative">
        <motion.div
          initial={animate ? { width: 0 } : undefined}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            "h-full rounded-lg",
            color,
            isOverflow && "bg-red-500"
          )}
        />
        {isOverflow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold"
          >
            OVERFLOW → SPILL
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function CacheGoneWrongDemo({ className }: { className?: string }) {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [cacheEnabled, setCacheEnabled] = useState(true);

  const TOTAL_MEMORY = 1000; // MB
  const STORAGE_FRACTION = 0.5;
  const EXECUTION_FRACTION = 0.5;

  const memoryState = useMemo(() => {
    const storageTotal = TOTAL_MEMORY * STORAGE_FRACTION;
    const executionTotal = TOTAL_MEMORY * EXECUTION_FRACTION;
    const cacheUsed = cacheEnabled ? selectedScenario.cacheSize : 0;
    
    // Simulate execution memory needs during aggregation
    const executionNeeded = 300; // MB needed for aggregation
    const availableExecution = executionTotal - Math.max(0, cacheUsed - storageTotal);
    const willSpill = cacheUsed > storageTotal && availableExecution < executionNeeded;

    return {
      storageTotal,
      storageUsed: Math.min(cacheUsed, storageTotal),
      executionTotal,
      executionUsed: cacheUsed > storageTotal ? cacheUsed - storageTotal + 100 : 100,
      willSpill,
      cacheUsed
    };
  }, [selectedScenario, cacheEnabled]);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimStep(0);

    const steps = [1, 2, 3, 4];
    let i = 0;
    const interval = setInterval(() => {
      setSimStep(steps[i]);
      i++;
      if (i >= steps.length) {
        clearInterval(interval);
        setTimeout(() => setIsSimulating(false), 1000);
      }
    }, 800);
  };

  const reset = () => {
    setSimStep(0);
    setIsSimulating(false);
    setCacheEnabled(true);
  };

  // Calculate time savings or waste
  const timeResult = useMemo(() => {
    if (!cacheEnabled) {
      return {
        totalTime: selectedScenario.computeTimeMs * selectedScenario.reuses,
        label: 'No caching',
        isBetter: false
      };
    }

    const cacheHitTime = 50; // ms for cached read
    const computeOnce = selectedScenario.computeTimeMs;
    const spillPenalty = memoryState.willSpill ? 2000 : 0;
    
    const withCache = computeOnce + (selectedScenario.reuses - 1) * cacheHitTime + spillPenalty;
    const withoutCache = computeOnce * selectedScenario.reuses;

    return {
      totalTime: withCache,
      withoutCacheTime: withoutCache,
      saved: withoutCache - withCache,
      label: withCache < withoutCache ? 'Faster' : 'Slower',
      isBetter: withCache < withoutCache
    };
  }, [selectedScenario, cacheEnabled, memoryState.willSpill]);

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              When Caching Goes Wrong
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Not all caching is good caching. Explore failure scenarios.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4" />
              Simulate
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Scenario Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                setSelectedScenario(scenario);
                setSimStep(0);
              }}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                selectedScenario.id === scenario.id
                  ? scenario.isCachingGood
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              )}
            >
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {scenario.name}
              </div>
              <div className="text-xs text-slate-500 line-clamp-2">
                {scenario.description}
              </div>
            </button>
          ))}
        </div>

        {/* Cache Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={cn(
            "text-sm font-medium",
            !cacheEnabled ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
          )}>
            No Cache
          </span>
          <button
            onClick={() => setCacheEnabled(!cacheEnabled)}
            className={cn(
              "w-14 h-7 rounded-full transition-colors relative",
              cacheEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
            )}
          >
            <motion.div
              animate={{ x: cacheEnabled ? 28 : 4 }}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
            />
          </button>
          <span className={cn(
            "text-sm font-medium",
            cacheEnabled ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
          )}>
            .cache()
          </span>
        </div>

        {/* Memory Visualization */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Executor Memory (1GB)
            </h4>
            <div className="space-y-4">
              <MemoryBar
                label="Storage Memory (for cache)"
                used={memoryState.storageUsed}
                total={memoryState.storageTotal}
                color="bg-blue-500"
                animate={simStep >= 1}
              />
              <MemoryBar
                label="Execution Memory (for shuffle/join)"
                used={memoryState.executionUsed}
                total={memoryState.executionTotal}
                color={memoryState.willSpill ? "bg-red-500" : "bg-green-500"}
                animate={simStep >= 2}
              />
            </div>
            
            {memoryState.willSpill && cacheEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 dark:text-red-400">
                  Cache evicted execution memory! Operations now spill to disk.
                </span>
              </motion.div>
            )}
          </div>

          {/* Time Comparison */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">
              Execution Time Analysis
            </h4>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Compute time:</span>
                  <span className="font-medium">{selectedScenario.computeTimeMs}ms</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Reuses:</span>
                  <span className="font-medium">{selectedScenario.reuses}x</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Data size:</span>
                  <span className="font-medium">{selectedScenario.dataSize}MB</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className={cn(
                  "p-4 rounded-lg flex items-center justify-between",
                  timeResult.isBetter && cacheEnabled
                    ? "bg-green-100 dark:bg-green-900/30"
                    : !cacheEnabled
                    ? "bg-slate-100 dark:bg-slate-800"
                    : "bg-red-100 dark:bg-red-900/30"
                )}>
                  <div className="flex items-center gap-2">
                    {timeResult.isBetter && cacheEnabled ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : !cacheEnabled ? (
                      <Database className="w-5 h-5 text-slate-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={cn(
                      "font-medium",
                      timeResult.isBetter && cacheEnabled
                        ? "text-green-700 dark:text-green-400"
                        : !cacheEnabled
                        ? "text-slate-700 dark:text-slate-300"
                        : "text-red-700 dark:text-red-400"
                    )}>
                      {cacheEnabled ? (timeResult.isBetter ? 'Caching Helps!' : 'Caching Hurts!') : 'Baseline'}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {timeResult.totalTime}ms
                  </span>
                </div>

                {cacheEnabled && 'saved' in timeResult && timeResult.saved !== undefined && (
                  <div className={cn(
                    "mt-2 text-sm text-center",
                    timeResult.saved > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {timeResult.saved > 0 ? `Saved ${timeResult.saved}ms` : `Wasted ${-timeResult.saved}ms`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedScenario.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-xl border-2",
              selectedScenario.isCachingGood
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
            )}
          >
            <p className={cn(
              "text-sm",
              selectedScenario.isCachingGood
                ? "text-green-700 dark:text-green-300"
                : "text-yellow-700 dark:text-yellow-300"
            )}>
              <strong>Analysis:</strong> {selectedScenario.explanation}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Teaching Insight */}
      <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>💡 Key Insight:</strong> Cache only when data is reused multiple times AND 
          memory pressure won&apos;t cause downstream spills. Always measure, never assume!
        </p>
      </div>
    </div>
  );
}
