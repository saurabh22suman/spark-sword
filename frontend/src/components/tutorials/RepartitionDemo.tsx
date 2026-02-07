'use client';

/**
 * Repartition Demo
 * 
 * Toggle between repartition and coalesce to see the difference
 * Teaching: When to use repartition vs coalesce
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Shuffle, ArrowDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type OperationType = 'repartition' | 'coalesce';

export function RepartitionDemo({ className }: { className?: string }) {
  const [operation, setOperation] = useState<OperationType>('repartition');
  const [sourcePartitions] = useState(8);
  const [targetPartitions, setTargetPartitions] = useState(4);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const executeOperation = () => {
    setIsAnimating(true);
    setShowResult(false);
    
    setTimeout(() => {
      setShowResult(true);
      setIsAnimating(false);
    }, 1500);
  };

  const reset = () => {
    setIsAnimating(false);
    setShowResult(false);
  };

  // Calculate coalesce mappings (partitions combine locally)
  const coalesceMapping = () => {
    const mapping: number[] = [];
    const partitionsPerTarget = Math.ceil(sourcePartitions / targetPartitions);
    
    for (let i = 0; i < sourcePartitions; i++) {
      mapping.push(Math.floor(i / partitionsPerTarget));
    }
    return mapping;
  };

  // For repartition, all data gets reshuffled
  const repartitionMapping = () => {
    const mapping: number[] = [];
    for (let i = 0; i < sourcePartitions; i++) {
      // Random redistribution simulation
      mapping.push(i % targetPartitions);
    }
    return mapping;
  };

  const mapping = operation === 'coalesce' ? coalesceMapping() : repartitionMapping();

  const isIncreasing = targetPartitions > sourcePartitions;
  const coalesceWarning = operation === 'coalesce' && isIncreasing;

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Repartition vs Coalesce
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              See how data moves with each operation
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

      <div className="p-8">
        {/* Operation Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => { setOperation('repartition'); reset(); }}
              className={cn(
                "px-6 py-3 rounded-lg font-bold text-sm transition-colors",
                operation === 'repartition'
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              repartition()
            </button>
            <button
              onClick={() => { setOperation('coalesce'); reset(); }}
              className={cn(
                "px-6 py-3 rounded-lg font-bold text-sm transition-colors",
                operation === 'coalesce'
                  ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              coalesce()
            </button>
          </div>
        </div>

        {/* Target Partitions Control */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">
            Target Partitions: <span className="font-bold text-purple-600 dark:text-purple-400">{targetPartitions}</span>
            {' '}(from {sourcePartitions})
          </label>
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={targetPartitions}
            onChange={(e) => { setTargetPartitions(Number(e.target.value)); reset(); }}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1 partition</span>
            <span>16 partitions</span>
          </div>
        </div>

        {/* Coalesce Warning */}
        <AnimatePresence>
          {coalesceWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h5 className="font-bold text-amber-700 dark:text-amber-400 text-sm">Coalesce Can&apos;t Increase Partitions!</h5>
                  <p className="text-amber-600 dark:text-amber-300 text-sm">
                    coalesce() can only reduce partitions, never increase. Use repartition() to increase partition count.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visualization */}
        <div className="relative mb-8">
          {/* Source Partitions */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Source: {sourcePartitions} Partitions
            </h4>
            <div className="flex justify-center gap-2">
              {Array.from({ length: sourcePartitions }).map((_, idx) => (
                <motion.div
                  key={`src-${idx}`}
                  animate={
                    isAnimating
                      ? {
                          y: operation === 'repartition' ? [0, -20, 0] : [0, 10, 0],
                          scale: [1, 0.9, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                >
                  P{idx}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Operation Indicator */}
          <div className="flex flex-col items-center my-6">
            <AnimatePresence mode="wait">
              {isAnimating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className={cn(
                    "p-3 rounded-full",
                    operation === 'repartition' ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"
                  )}
                >
                  {operation === 'repartition' ? (
                    <Shuffle className="w-8 h-8 text-red-500 animate-spin" />
                  ) : (
                    <ArrowDown className="w-8 h-8 text-green-500 animate-bounce" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {!isAnimating && !showResult && (
              <button
                onClick={executeOperation}
                disabled={coalesceWarning}
                className={cn(
                  "px-6 py-3 rounded-xl font-bold transition-colors",
                  coalesceWarning
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    : operation === 'repartition'
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                Execute {operation}({targetPartitions})
              </button>
            )}
          </div>

          {/* Target Partitions */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                  Result: {coalesceWarning ? sourcePartitions : targetPartitions} Partitions
                </h4>
                <div className="flex justify-center gap-2">
                  {Array.from({ length: coalesceWarning ? sourcePartitions : targetPartitions }).map((_, idx) => {
                    // Count how many source partitions map to this target
                    const sourcesCount = mapping.filter(m => m === idx).length;
                    
                    return (
                      <motion.div
                        key={`tgt-${idx}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                          operation === 'repartition' ? "bg-purple-500" : "bg-green-500"
                        )}
                        style={{
                          // Make partitions bigger based on how many sources combined
                          transform: `scale(${1 + (sourcesCount - 1) * 0.1})`
                        }}
                      >
                        P{idx}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Comparison Table */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Repartition */}
          <div className={cn(
            "p-4 rounded-xl border-2 transition-colors",
            operation === 'repartition'
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-200 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Shuffle className="w-5 h-5 text-blue-500" />
              <h4 className="font-bold text-slate-900 dark:text-white">repartition()</h4>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <span><strong>Full shuffle</strong> of all data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Can increase or decrease partitions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Even data distribution</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>More expensive operation</span>
              </li>
            </ul>
          </div>

          {/* Coalesce */}
          <div className={cn(
            "p-4 rounded-xl border-2 transition-colors",
            operation === 'coalesce'
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-slate-200 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDown className="w-5 h-5 text-green-500" />
              <h4 className="font-bold text-slate-900 dark:text-white">coalesce()</h4>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span><strong>No shuffle</strong> - combines locally</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <span>Can only decrease partitions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>May create uneven partitions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Cheaper than repartition</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-slate-900 rounded-xl p-4">
          <pre className="text-sm text-slate-300 font-mono overflow-x-auto">
            <code>
              {operation === 'repartition' 
                ? `# Full shuffle - use when increasing partitions or need even distribution
df.repartition(${targetPartitions})

# Can also repartition by column for better join performance
df.repartition(${targetPartitions}, "join_key")`
                : `# No shuffle - use when reducing partitions (e.g., before write)
df.coalesce(${targetPartitions})

# Common pattern: reduce partitions before writing to avoid small files
df.coalesce(10).write.parquet("output/")`
              }
            </code>
          </pre>
        </div>
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
        <h4 className="font-bold text-purple-800 dark:text-purple-400 text-sm mb-1">
          💡 When to Use Which
        </h4>
        <p className="text-purple-700 dark:text-purple-300 text-sm">
          <strong>coalesce(n)</strong>: Before writing files (reduce small files). 
          <strong>repartition(n)</strong>: Before joins on skewed keys, or when you need more parallelism.
        </p>
      </div>
    </div>
  );
}
