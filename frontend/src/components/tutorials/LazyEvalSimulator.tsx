'use client';

/**
 * Lazy Evaluation Simulator
 * 
 * Chain transformations and watch nothing happen until you trigger an action.
 * Teaching: Lazy vs Eager evaluation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, RotateCcw, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transformation {
  id: string;
  name: string;
  code: string;
  status: 'pending' | 'executed';
}

const AVAILABLE_TRANSFORMATIONS = [
  { name: 'filter', code: '.filter(x => x > 10)' },
  { name: 'map', code: '.map(x => x * 2)' },
  { name: 'flatMap', code: '.flatMap(x => [x, x])' },
  { name: 'select', code: '.select("col1", "col2")' },
  { name: 'withColumn', code: '.withColumn("new", col * 2)' },
];

const ACTIONS = [
  { name: 'collect', code: '.collect()' },
  { name: 'count', code: '.count()' },
  { name: 'show', code: '.show()' },
  { name: 'write', code: '.write.parquet("output")' },
];

export function LazyEvalSimulator({ className }: { className?: string }) {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executedAction, setExecutedAction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const addTransformation = (t: typeof AVAILABLE_TRANSFORMATIONS[0]) => {
    if (showResult) return;
    setTransformations(prev => [
      ...prev,
      { id: Date.now().toString(), name: t.name, code: t.code, status: 'pending' }
    ]);
  };

  const executeAction = async (action: typeof ACTIONS[0]) => {
    if (transformations.length === 0) return;
    
    setIsExecuting(true);
    setExecutedAction(action.name);
    
    // Animate through each transformation
    for (let i = 0; i < transformations.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setTransformations(prev => 
        prev.map((t, idx) => idx === i ? { ...t, status: 'executed' } : t)
      );
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setShowResult(true);
    setIsExecuting(false);
  };

  const reset = () => {
    setTransformations([]);
    setExecutedAction(null);
    setShowResult(false);
    setIsExecuting(false);
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Lazy Evaluation Simulator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add transformations—nothing runs until you trigger an action
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
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Transformation Builder */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Transformations
            </h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {AVAILABLE_TRANSFORMATIONS.map((t) => (
                <button
                  key={t.name}
                  onClick={() => addTransformation(t)}
                  disabled={showResult || isExecuting}
                  className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t.name}()
                </button>
              ))}
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Trigger Action
            </h4>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.name}
                  onClick={() => executeAction(a)}
                  disabled={showResult || isExecuting || transformations.length === 0}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  {a.name}()
                </button>
              ))}
            </div>
          </div>

          {/* Right: Code Preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Your Pipeline
            </h4>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 font-mono text-sm overflow-x-auto">
              <div className="text-green-400">df = spark.read.parquet(&quot;data&quot;)</div>
              
              <AnimatePresence>
                {transformations.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <span className={cn(
                      "transition-colors duration-300",
                      t.status === 'executed' ? "text-green-400" : "text-slate-400"
                    )}>
                      {t.code}
                    </span>
                    {t.status === 'executed' && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-green-500"
                      >
                        ✓
                      </motion.span>
                    )}
                    {t.status === 'pending' && !isExecuting && (
                      <span className="text-xs text-slate-500 italic">← not executed</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {executedAction && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-purple-400"
                >
                  {ACTIONS.find(a => a.name === executedAction)?.code}
                  {showResult && <span className="text-green-500 ml-2">✓</span>}
                </motion.div>
              )}

              {transformations.length === 0 && (
                <div className="mt-2 text-slate-600 italic">
                  {/* Add transformations above... */}
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="mt-4">
              {!showResult && transformations.length > 0 && !isExecuting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      {transformations.length} transformation(s) queued — nothing executed yet!
                    </span>
                  </div>
                </motion.div>
              )}

              {isExecuting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                      Executing pipeline...
                    </span>
                  </div>
                </motion.div>
              )}

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                      All {transformations.length} transformations executed!
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Key Insight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl"
        >
          <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2">
            💡 Why Lazy Evaluation?
          </h5>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• <strong>Optimization:</strong> Spark combines multiple transformations into efficient stages</li>
            <li>• <strong>Efficiency:</strong> Only reads data that&apos;s actually needed</li>
            <li>• <strong>Pipelining:</strong> Avoids intermediate materialization</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
