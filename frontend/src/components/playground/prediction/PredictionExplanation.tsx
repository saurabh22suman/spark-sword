'use client';

/**
 * Prediction Explanation Panel
 * 
 * Per playground-predicition-animation-flow-spec.md:
 * Shows AFTER animation completes.
 * 
 * Tone: Calm, factual, non-judgmental
 * Never says "You were wrong" — instead: "Spark chose X because..."
 * 
 * Each explanation includes:
 * 1. Decision — what Spark chose
 * 2. Reason — what signal mattered
 * 3. Trade-off — what it costs
 * 
 * No config advice here.
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { PredictionType } from './PredictionPrompt';
import { SparkReactionType } from './SparkReactionAnimation';

export interface ExplanationContent {
  decision: string;
  reason: string;
  tradeoff: string;
}

export interface PredictionExplanationProps {
  /** User's prediction */
  userPrediction: PredictionType | null;
  /** What Spark actually did */
  actualOutcome: SparkReactionType;
  /** Explanation content */
  explanation: ExplanationContent;
  /** Whether the explanation is visible */
  isVisible: boolean;
  /** Callback to reset and try again */
  onReset?: () => void;
  /** Optional class name */
  className?: string;
}

// Pre-defined explanations for different outcomes
export const EXPLANATIONS: Record<SparkReactionType, ExplanationContent> = {
  no_shuffle: {
    decision: "Spark kept data local",
    reason: "The transformation was narrow — each input partition maps to exactly one output partition. No data movement needed.",
    tradeoff: "Fast execution, but limited to operations that don't need data from other partitions.",
  },
  shuffle: {
    decision: "Spark triggered a shuffle",
    reason: "The transformation was wide — data needs to be redistributed across partitions. This happens with groupBy, join (non-broadcast), distinct, or repartition.",
    tradeoff: "Data movement across the network. More partitions = more parallelism but also more shuffle overhead.",
  },
  broadcast: {
    decision: "Spark chose broadcast join",
    reason: "One table is small enough to fit in memory on each executor. Spark broadcasts the small table to avoid shuffling the large one.",
    tradeoff: "No shuffle of the large table, but the small table is copied to every executor. Too large = OOM risk.",
  },
  skew: {
    decision: "Spark detected skewed partitions",
    reason: "Some keys have significantly more data than others. This creates uneven partition sizes after the shuffle.",
    tradeoff: "One task takes much longer than others. The stage waits for the slowest task to complete.",
  },
  spill: {
    decision: "Spark spilled data to disk",
    reason: "Memory pressure exceeded available execution memory. Rather than fail, Spark writes intermediate data to disk.",
    tradeoff: "The job continues but slows significantly. Disk I/O is orders of magnitude slower than memory.",
  },
  idle: {
    decision: "",
    reason: "",
    tradeoff: "",
  },
};

export function PredictionExplanation({
  userPrediction,
  actualOutcome,
  explanation,
  isVisible,
  onReset,
  className = '',
}: PredictionExplanationProps) {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;

  // Determine if prediction was correct
  const predictionToOutcome: Record<PredictionType, SparkReactionType[]> = {
    no_shuffle: ['no_shuffle'],
    shuffle: ['shuffle'],
    broadcast_join: ['broadcast'],
    spill_risk: ['spill'],
    balanced: ['no_shuffle', 'shuffle', 'broadcast'],
    skewed: ['skew'],
    unsure: [], // Never "correct" — that's okay
  };
  
  const wasCorrect = userPrediction 
    ? predictionToOutcome[userPrediction]?.includes(actualOutcome) 
    : false;
  const wasUnsure = userPrediction === 'unsure';

  if (!isVisible || actualOutcome === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="prediction-explanation"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.3 }}
        className={`
          p-5 rounded-xl border bg-slate-900/80 backdrop-blur-sm
          ${wasCorrect ? 'border-green-500/30' : wasUnsure ? 'border-blue-500/30' : 'border-slate-600/50'}
          ${className}
        `}
      >
        {/* Outcome header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`
            p-1.5 rounded-lg
            ${wasCorrect ? 'bg-green-500/10' : wasUnsure ? 'bg-blue-500/10' : 'bg-slate-700/50'}
          `}>
            {wasCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : wasUnsure ? (
              <Info className="w-5 h-5 text-blue-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <p className={`
              text-sm font-medium
              ${wasCorrect ? 'text-green-400' : wasUnsure ? 'text-blue-400' : 'text-slate-300'}
            `}>
              {wasCorrect 
                ? "Your intuition was right!" 
                : wasUnsure 
                  ? "Here's what Spark did:" 
                  : "Spark chose differently:"}
            </p>
            <p className="text-base font-semibold text-white mt-1">
              {explanation.decision}
            </p>
          </div>
        </div>

        {/* Explanation sections */}
        <div className="space-y-3">
          {/* Reason */}
          <div className="pl-4 border-l-2 border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Why</p>
            <p className="text-sm text-slate-300">{explanation.reason}</p>
          </div>

          {/* Trade-off */}
          <div className="pl-4 border-l-2 border-orange-500/50">
            <p className="text-xs text-orange-400 uppercase tracking-wide mb-1">Trade-off</p>
            <p className="text-sm text-slate-300">{explanation.tradeoff}</p>
          </div>
        </div>

        {/* Visual comparison (if prediction differs) */}
        {!wasCorrect && !wasUnsure && userPrediction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 pt-4 border-t border-slate-700/50"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 rounded bg-slate-700 text-slate-400">
                You predicted: {formatPrediction(userPrediction)}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400">
                Spark chose: {formatOutcome(actualOutcome)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Reset button */}
        {onReset && (
          <motion.button
            data-testid="prediction-reset"
            onClick={onReset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 w-full py-2 rounded-lg text-sm font-medium
              bg-slate-800 text-slate-300 hover:bg-slate-700 
              border border-slate-700 transition-colors"
          >
            Try Different Parameters
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper functions
function formatPrediction(prediction: PredictionType): string {
  const labels: Record<PredictionType, string> = {
    no_shuffle: 'No Shuffle',
    shuffle: 'Shuffle',
    broadcast_join: 'Broadcast Join',
    spill_risk: 'Spill Risk',
    balanced: 'Balanced',
    skewed: 'Skewed',
    unsure: 'Unsure',
  };
  return labels[prediction] || prediction;
}

function formatOutcome(outcome: SparkReactionType): string {
  const labels: Record<SparkReactionType, string> = {
    no_shuffle: 'Local Execution',
    shuffle: 'Shuffle',
    broadcast: 'Broadcast',
    skew: 'Skewed Execution',
    spill: 'Spill to Disk',
    idle: '',
  };
  return labels[outcome] || outcome;
}

export default PredictionExplanation;
