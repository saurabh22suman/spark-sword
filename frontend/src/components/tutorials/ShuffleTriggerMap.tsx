'use client';

/**
 * Shuffle Trigger Map
 * 
 * Click operations to see if they trigger a shuffle
 * Teaching: Which operations cause data movement
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Shuffle, ArrowRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SparkOperation {
  name: string;
  code: string;
  causesShuffle: boolean;
  explanation: string;
  category: 'narrow' | 'wide';
}

const SPARK_OPERATIONS: SparkOperation[] = [
  // Narrow transformations (no shuffle)
  {
    name: 'map',
    code: 'df.map(row => transform(row))',
    causesShuffle: false,
    explanation: 'Each partition processes independently. No data movement needed.',
    category: 'narrow'
  },
  {
    name: 'filter',
    code: 'df.filter(col("age") > 21)',
    causesShuffle: false,
    explanation: 'Filters within each partition. No data needs to move between nodes.',
    category: 'narrow'
  },
  {
    name: 'select',
    code: 'df.select("name", "age")',
    causesShuffle: false,
    explanation: 'Column projection happens locally on each partition.',
    category: 'narrow'
  },
  {
    name: 'withColumn',
    code: 'df.withColumn("full_name", concat(...))',
    causesShuffle: false,
    explanation: 'Adding/modifying columns is done per-row, no coordination needed.',
    category: 'narrow'
  },
  {
    name: 'flatMap',
    code: 'df.flatMap(row => expand(row))',
    causesShuffle: false,
    explanation: 'Each row expands independently within its partition.',
    category: 'narrow'
  },
  {
    name: 'coalesce',
    code: 'df.coalesce(4)',
    causesShuffle: false,
    explanation: 'Reduces partitions by combining locally. Avoids full shuffle.',
    category: 'narrow'
  },
  
  // Wide transformations (cause shuffle)
  {
    name: 'groupBy',
    code: 'df.groupBy("department").count()',
    causesShuffle: true,
    explanation: 'All rows with same key must be on same node for aggregation.',
    category: 'wide'
  },
  {
    name: 'join',
    code: 'df1.join(df2, "id")',
    causesShuffle: true,
    explanation: 'Matching keys from both DataFrames must be co-located.',
    category: 'wide'
  },
  {
    name: 'repartition',
    code: 'df.repartition(200)',
    causesShuffle: true,
    explanation: 'Full data redistribution across all partitions.',
    category: 'wide'
  },
  {
    name: 'distinct',
    code: 'df.distinct()',
    causesShuffle: true,
    explanation: 'All duplicate values must be compared, requiring data movement.',
    category: 'wide'
  },
  {
    name: 'orderBy',
    code: 'df.orderBy(col("timestamp").desc())',
    causesShuffle: true,
    explanation: 'Global ordering requires range partitioning + sorting.',
    category: 'wide'
  },
  {
    name: 'reduceByKey',
    code: 'rdd.reduceByKey(_ + _)',
    causesShuffle: true,
    explanation: 'Aggregation by key requires same keys to be together.',
    category: 'wide'
  },
];

export function ShuffleTriggerMap({ className }: { className?: string }) {
  const [selectedOp, setSelectedOp] = useState<SparkOperation | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleOperationClick = (op: SparkOperation) => {
    setSelectedOp(op);
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 1500);
  };

  const reset = () => {
    setSelectedOp(null);
    setShowAnimation(false);
  };

  const narrowOps = SPARK_OPERATIONS.filter(op => op.category === 'narrow');
  const wideOps = SPARK_OPERATIONS.filter(op => op.category === 'wide');

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Shuffle Trigger Map
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Click any operation to see if it causes a shuffle
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
        {/* Operations Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Narrow Transformations */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-4">
              <Check className="w-4 h-4" />
              Narrow (No Shuffle)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {narrowOps.map((op) => (
                <motion.button
                  key={op.name}
                  onClick={() => handleOperationClick(op)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-colors",
                    selectedOp?.name === op.name
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700"
                  )}
                >
                  <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {op.name}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Wide Transformations */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4">
              <Shuffle className="w-4 h-4" />
              Wide (Causes Shuffle)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {wideOps.map((op) => (
                <motion.button
                  key={op.name}
                  onClick={() => handleOperationClick(op)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-colors",
                    selectedOp?.name === op.name
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700"
                  )}
                >
                  <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {op.name}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Shuffle Visualization */}
        <div className="mb-8">
          <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
            {/* Partitions */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Source Partitions */}
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((idx) => (
                  <motion.div
                    key={`src-${idx}`}
                    className={cn(
                      "w-16 h-10 rounded flex items-center justify-center text-xs font-bold text-white",
                      idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-indigo-500" : "bg-purple-500"
                    )}
                  >
                    P{idx}
                  </motion.div>
                ))}
              </div>

              {/* Arrow / Shuffle Animation */}
              <div className="mx-8 relative w-32">
                <AnimatePresence mode="wait">
                  {selectedOp && showAnimation && (
                    selectedOp.causesShuffle ? (
                      // Shuffle animation
                      <motion.div
                        key="shuffle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Shuffle lines */}
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                          <motion.div
                            key={idx}
                            initial={{ 
                              x: -40, 
                              y: ((idx % 3) - 1) * 20,
                              opacity: 0 
                            }}
                            animate={{ 
                              x: 40, 
                              y: (Math.floor(idx / 3) - 1) * 20,
                              opacity: [0, 1, 0] 
                            }}
                            transition={{ 
                              duration: 0.8, 
                              delay: idx * 0.1,
                              ease: "easeInOut"
                            }}
                            className="absolute w-3 h-3 rounded-full bg-red-500"
                          />
                        ))}
                        <Shuffle className="w-8 h-8 text-red-500 relative z-10" />
                      </motion.div>
                    ) : (
                      // Direct pass-through animation
                      <motion.div
                        key="pass"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {[0, 1, 2].map((idx) => (
                          <motion.div
                            key={idx}
                            initial={{ x: -40, opacity: 0 }}
                            animate={{ x: 40, opacity: [0, 1, 0] }}
                            transition={{ 
                              duration: 0.5, 
                              delay: idx * 0.1,
                              ease: "easeInOut"
                            }}
                            className={cn(
                              "absolute w-3 h-3 rounded-full",
                              idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-indigo-500" : "bg-purple-500"
                            )}
                            style={{ top: `${30 + idx * 25}%` }}
                          />
                        ))}
                        <ArrowRight className="w-8 h-8 text-green-500 relative z-10" />
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
                
                {!selectedOp && (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-slate-400 text-sm">Click an operation</span>
                  </div>
                )}
              </div>

              {/* Target Partitions */}
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((idx) => (
                  <motion.div
                    key={`tgt-${idx}`}
                    animate={
                      selectedOp?.causesShuffle && showAnimation
                        ? { 
                            backgroundColor: ['#64748b', '#ef4444', '#64748b'],
                          }
                        : {}
                    }
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="w-16 h-10 rounded bg-slate-400 flex items-center justify-center text-xs font-bold text-white"
                  >
                    P{idx}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Operation Detail */}
        <AnimatePresence mode="wait">
          {selectedOp && (
            <motion.div
              key={selectedOp.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "p-6 rounded-xl border-2",
                selectedOp.causesShuffle
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  selectedOp.causesShuffle 
                    ? "bg-red-100 dark:bg-red-900/40" 
                    : "bg-green-100 dark:bg-green-900/40"
                )}>
                  {selectedOp.causesShuffle 
                    ? <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                    : <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                      {selectedOp.name}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-bold rounded",
                      selectedOp.causesShuffle
                        ? "bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300"
                        : "bg-green-200 dark:bg-green-900 text-green-700 dark:text-green-300"
                    )}>
                      {selectedOp.causesShuffle ? 'SHUFFLES' : 'NO SHUFFLE'}
                    </span>
                  </div>
                  <pre className="text-sm font-mono text-slate-600 dark:text-slate-400 mb-3 bg-white/50 dark:bg-slate-800/50 p-2 rounded">
                    {selectedOp.code}
                  </pre>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {selectedOp.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
        <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">
          💡 Key Insight
        </h4>
        <p className="text-amber-700 dark:text-amber-300 text-sm">
          <strong>Shuffles are expensive</strong> because they require network I/O, disk spill, 
          and serialization. Chain narrow operations together to minimize shuffles. 
          When you must shuffle, try to do it once with the right partition key.
        </p>
      </div>
    </div>
  );
}
