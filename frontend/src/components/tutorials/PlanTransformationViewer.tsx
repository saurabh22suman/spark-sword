'use client';

/**
 * Plan Transformation Viewer
 * 
 * Step-by-step visualization of how Catalyst rewrites your query.
 * Teaching: The optimization phases Spark applies to your code.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ChevronRight, ChevronLeft, Zap, Code, Target, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanPhase {
  id: string;
  name: string;
  description: string;
  plan: string[];
  optimizations: string[];
  icon: React.ElementType;
}

const PLAN_PHASES: PlanPhase[] = [
  {
    id: 'parsed',
    name: 'Parsed Logical Plan',
    description: 'Spark parses your code into an unresolved logical plan',
    icon: Code,
    plan: [
      "UnresolvedRelation [orders]",
      "  Filter: year = 2024",
      "  Project: [customer_id, amount]",
      "  Aggregate: groupBy(customer_id), sum(amount)"
    ],
    optimizations: []
  },
  {
    id: 'analyzed',
    name: 'Analyzed Logical Plan',
    description: 'Schema and column references are resolved',
    icon: Target,
    plan: [
      "Relation orders[order_id#1, customer_id#2, amount#3, year#4]",
      "  Filter: (year#4 = 2024)",
      "  Project: [customer_id#2, amount#3]",
      "  Aggregate: [customer_id#2], [sum(amount#3) AS total#5]"
    ],
    optimizations: [
      "Resolved 'orders' to catalog table",
      "Resolved column references with type info"
    ]
  },
  {
    id: 'optimized',
    name: 'Optimized Logical Plan',
    description: 'Catalyst applies rule-based optimizations',
    icon: Zap,
    plan: [
      "Aggregate: [customer_id#2], [sum(amount#3) AS total#5]",
      "  Project: [customer_id#2, amount#3]",
      "    Filter: (year#4 = 2024)",
      "      Relation orders[order_id#1, customer_id#2, amount#3, year#4]"
    ],
    optimizations: [
      "Predicate Pushdown: Filter moved closer to scan",
      "Column Pruning: Only reads needed columns",
      "Constant Folding: Simplified expressions"
    ]
  },
  {
    id: 'physical',
    name: 'Physical Plan',
    description: 'Spark selects execution strategies',
    icon: Cpu,
    plan: [
      "HashAggregate(keys=[customer_id#2], functions=[sum(amount#3)])",
      "  Exchange hashpartitioning(customer_id#2, 200)",
      "    HashAggregate(keys=[customer_id#2], functions=[partial_sum(amount#3)])",
      "      Project [customer_id#2, amount#3]",
      "        Filter (year#4 = 2024)",
      "          FileScan parquet [customer_id#2, amount#3, year#4]"
    ],
    optimizations: [
      "Partial aggregation before shuffle (combiner)",
      "Hash partitioning for final aggregation",
      "FileScan with pushed-down filter"
    ]
  }
];

export function PlanTransformationViewer({ className }: { className?: string }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [_isAnimating, setIsAnimating] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);

  const phase = PLAN_PHASES[currentPhase];
  const Icon = phase.icon;

  const handleAutoPlay = () => {
    setAutoPlaying(true);
    setCurrentPhase(0);
    setIsAnimating(true);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= PLAN_PHASES.length) {
        clearInterval(interval);
        setAutoPlaying(false);
        setIsAnimating(false);
      } else {
        setCurrentPhase(step);
      }
    }, 2000);
  };

  const handleReset = () => {
    setCurrentPhase(0);
    setAutoPlaying(false);
    setIsAnimating(false);
  };

  const goNext = () => {
    if (currentPhase < PLAN_PHASES.length - 1) {
      setCurrentPhase(currentPhase + 1);
    }
  };

  const goPrev = () => {
    if (currentPhase > 0) {
      setCurrentPhase(currentPhase - 1);
    }
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Catalyst Plan Transformation
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Watch how Spark optimizes your query step by step
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleAutoPlay}
              disabled={autoPlaying}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4" />
              Auto Play
            </button>
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2">
          {PLAN_PHASES.map((p, index) => {
            const PhaseIcon = p.icon;
            const isActive = index === currentPhase;
            const isPast = index < currentPhase;
            
            return (
              <button
                key={p.id}
                onClick={() => !autoPlaying && setCurrentPhase(index)}
                disabled={autoPlaying}
                className="flex-1 flex flex-col items-center gap-2 group"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isActive ? '#7c3aed' : isPast ? '#a78bfa' : '#e2e8f0'
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isActive && "ring-4 ring-purple-200 dark:ring-purple-900"
                  )}
                >
                  <PhaseIcon className={cn(
                    "w-5 h-5",
                    isActive || isPast ? "text-white" : "text-slate-400"
                  )} />
                </motion.div>
                <span className={cn(
                  "text-xs font-medium text-center",
                  isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400"
                )}>
                  {p.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Phase Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">
                  {phase.name}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {phase.description}
                </p>
              </div>
            </div>

            {/* Plan Tree */}
            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 font-mono text-sm overflow-x-auto">
              {phase.plan.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-green-400 whitespace-pre"
                >
                  {line}
                </motion.div>
              ))}
            </div>

            {/* Optimizations Applied */}
            {phase.optimizations.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <h5 className="font-bold text-green-700 dark:text-green-400 text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Optimizations Applied
                </h5>
                <ul className="space-y-2">
                  {phase.optimizations.map((opt, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300"
                    >
                      <span className="text-green-500 mt-0.5">✓</span>
                      {opt}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={goPrev}
            disabled={currentPhase === 0 || autoPlaying}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Phase {currentPhase + 1} of {PLAN_PHASES.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentPhase === PLAN_PHASES.length - 1 || autoPlaying}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Teaching Insight */}
      <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-100 dark:border-purple-800">
        <p className="text-sm text-purple-700 dark:text-purple-300">
          <strong>💡 Key Insight:</strong> Catalyst optimizes your query <em>before</em> execution. 
          Understanding these phases helps you write code that Spark can optimize effectively.
        </p>
      </div>
    </div>
  );
}
