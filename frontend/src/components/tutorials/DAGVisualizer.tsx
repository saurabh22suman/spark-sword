'use client';

/**
 * DAG Visualizer Tutorial Component
 * 
 * Animated pipeline showing how DAG splits into stages when you trigger an action.
 * Teaching: Jobs → Stages → Tasks breakdown
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Operation {
  id: string;
  name: string;
  type: 'source' | 'narrow' | 'wide' | 'action';
  stage: number;
}

const INITIAL_OPERATIONS: Operation[] = [
  { id: '1', name: 'Read Parquet', type: 'source', stage: 0 },
  { id: '2', name: 'Filter', type: 'narrow', stage: 0 },
  { id: '3', name: 'Map', type: 'narrow', stage: 0 },
  { id: '4', name: 'GroupBy', type: 'wide', stage: 1 },
  { id: '5', name: 'Aggregate', type: 'narrow', stage: 1 },
  { id: '6', name: 'Write', type: 'action', stage: 1 },
];

const TYPE_STYLES = {
  source: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-600' },
  narrow: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600' },
  wide: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-600' },
  action: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600' },
};

export function DAGVisualizer({ className }: { className?: string }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showStages, setShowStages] = useState(false);

  const handleExecute = () => {
    setIsExecuting(true);
    setCurrentStep(0);
    setShowStages(false);

    // Animate through each operation
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= INITIAL_OPERATIONS.length) {
        clearInterval(interval);
        setShowStages(true);
        setIsExecuting(false);
      } else {
        setCurrentStep(step);
      }
    }, 600);
  };

  const handleReset = () => {
    setIsExecuting(false);
    setCurrentStep(-1);
    setShowStages(false);
  };

  const stage0Ops = INITIAL_OPERATIONS.filter(op => op.stage === 0);
  const stage1Ops = INITIAL_OPERATIONS.filter(op => op.stage === 1);

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Job → Stage → Task Visualizer
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Click Execute to see how Spark breaks down your DAG into stages
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={currentStep === -1}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Execute Action
            </button>
          </div>
        </div>
      </div>

      {/* Visualization Area */}
      <div className="p-8 min-h-[400px]">
        {!showStages ? (
          /* Linear Pipeline View */
          <div className="flex flex-col items-center gap-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Logical DAG (Your Code)
            </h4>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {INITIAL_OPERATIONS.map((op, index) => {
                const styles = TYPE_STYLES[op.type];
                const isActive = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={op.id} className="flex items-center gap-4">
                    <motion.div
                      initial={{ opacity: 0.5, scale: 0.9 }}
                      animate={{ 
                        opacity: isActive ? 1 : 0.5, 
                        scale: isActive ? 1 : 0.9,
                        y: isCurrent ? -5 : 0
                      }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "px-6 py-4 rounded-xl border-2 text-center min-w-[120px]",
                        isActive ? `${styles.border} bg-white dark:bg-slate-800` : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-bold",
                        isActive ? styles.text : "text-slate-400"
                      )}>
                        {op.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                        {op.type}
                      </div>
                    </motion.div>
                    
                    {index < INITIAL_OPERATIONS.length - 1 && (
                      <motion.div
                        animate={{ opacity: isActive ? 1 : 0.3 }}
                        className="text-slate-400"
                      >
                        →
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {isExecuting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Processing: {INITIAL_OPERATIONS[currentStep]?.name}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Stage View */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-orange-500" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Physical Execution Plan: 2 Stages (Shuffle Boundary at GroupBy)
              </h4>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Stage 0 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-800 border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">0</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Stage 0</h5>
                    <p className="text-xs text-slate-500">3 Tasks (Parallel)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {stage0Ops.map((op) => (
                    <div 
                      key={op.id}
                      className={cn(
                        "px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border",
                        TYPE_STYLES[op.type].border
                      )}
                    >
                      <span className={cn("font-medium text-sm", TYPE_STYLES[op.type].text)}>
                        {op.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">
                    ✓ No shuffle needed - runs in single pass
                  </p>
                </div>
              </motion.div>

              {/* Shuffle Arrow */}
              <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {/* This is handled by grid gap */}
              </div>

              {/* Stage 1 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border-2 border-orange-200 dark:border-orange-800"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Stage 1</h5>
                    <p className="text-xs text-slate-500">Waits for Stage 0</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {stage1Ops.map((op) => (
                    <div 
                      key={op.id}
                      className={cn(
                        "px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border",
                        TYPE_STYLES[op.type].border
                      )}
                    >
                      <span className={cn("font-medium text-sm", TYPE_STYLES[op.type].text)}>
                        {op.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">
                    ⚠️ Shuffle read required - data redistributed
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <h5 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-2">
                💡 Key Insight
              </h5>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                The <strong>GroupBy</strong> operation creates a <strong>shuffle boundary</strong>. 
                Stage 0 runs all narrow transformations in a single pass. Stage 1 must wait for 
                all data to be shuffled before it can aggregate.
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
          {Object.entries(TYPE_STYLES).map(([type, styles]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded", styles.bg)} />
              <span className="text-slate-600 dark:text-slate-400 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
