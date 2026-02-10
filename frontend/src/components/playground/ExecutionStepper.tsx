/**
 * Execution Stepper Component
 * 
 * Step-by-step execution visualization (Python Tutor pattern).
 * Shows Spark's decision process for each operation stage-by-stage.
 * 
 * Features:
 * - Forward/Back/Jump navigation
 * - Current step highlighting
 * - Partition state evolution
 * - Spark's "thought process" at each step
 * - Progress indicator
 * 
 * Design Philosophy:
 * - Make Spark's decisions visible and inspectable
 * - Pause time: users control execution flow
 * - Show state changes, not just final results
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { PartitionBars } from './PartitionBars';

export interface ExecutionStep {
  operationType: string;
  inputShape: {
    rows: number;
    partitions: number;
    totalSizeBytes: number;
    skewFactor: number;
  };
  outputShape: {
    rows: number;
    partitions: number;
    totalSizeBytes: number;
    skewFactor: number;
  };
  shuffleBytes: number;
  isStageBoundary: boolean;
  sparkDecision: string;
}

export interface ExecutionStepperProps {
  /** Array of execution steps from simulation */
  steps: ExecutionStep[];
  /** Callback when user navigates to a step */
  onStepChange?: (stepIndex: number) => void;
  /** Whether to show the stepper */
  isVisible: boolean;
  /** Optional class name */
  className?: string;
}

export function ExecutionStepper({
  steps,
  onStepChange,
  isVisible,
  className = '',
}: ExecutionStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStep = steps[currentStepIndex];
  const maxSteps = steps.length;
  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < maxSteps - 1;

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || !canGoForward) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      handleNext();
    }, 2000); // 2 second delay between steps

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, canGoForward]);

  const handlePrevious = useCallback(() => {
    if (canGoBack) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      onStepChange?.(newIndex);
      setIsPlaying(false);
    }
  }, [canGoBack, currentStepIndex, onStepChange]);

  const handleNext = useCallback(() => {
    if (canGoForward) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      onStepChange?.(newIndex);
    }
  }, [canGoForward, currentStepIndex, onStepChange]);

  const handleJumpToStart = useCallback(() => {
    setCurrentStepIndex(0);
    onStepChange?.(0);
    setIsPlaying(false);
  }, [onStepChange]);

  const handleJumpToEnd = useCallback(() => {
    const lastIndex = maxSteps - 1;
    setCurrentStepIndex(lastIndex);
    onStepChange?.(lastIndex);
    setIsPlaying(false);
  }, [maxSteps, onStepChange]);

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  if (!isVisible || !steps || steps.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`} data-testid="execution-stepper">
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / maxSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums min-w-[4rem] text-right">
          Step {currentStepIndex + 1} of {maxSteps}
        </span>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleJumpToStart}
            disabled={!canGoBack}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Jump to start"
            data-testid="jump-to-start"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Previous step"
            data-testid="step-previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            disabled={!canGoForward}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            data-testid="step-play-pause"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoForward}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Next step"
            data-testid="step-next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleJumpToEnd}
            disabled={!canGoForward}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Jump to end"
            data-testid="jump-to-end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Stage indicator */}
        {currentStep?.isStageBoundary && (
          <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-full">
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
              🔀 Shuffle Boundary
            </span>
          </div>
        )}
      </div>

      {/* Current Step Details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
        >
          {/* Operation Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 capitalize">
                  {currentStep.operationType}
                </span>
              </div>
              {currentStep.shuffleBytes > 0 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  {(currentStep.shuffleBytes / 1_000_000).toFixed(1)} MB shuffle
                </div>
              )}
            </div>
          </div>

          {/* Spark's Decision */}
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Spark's Decision Process
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentStep.sparkDecision}
            </p>
          </div>

          {/* Data Flow: Input → Output */}
          <div className="grid grid-cols-2 gap-4">
            {/* Input State */}
            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                Input State
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Rows:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {currentStep.inputShape.rows.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Partitions:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {currentStep.inputShape.partitions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Size:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {(currentStep.inputShape.totalSizeBytes / 1_000_000).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Skew:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {currentStep.inputShape.skewFactor.toFixed(1)}x
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <PartitionBars
                  partitions={currentStep.inputShape.partitions}
                  skewFactor={currentStep.inputShape.skewFactor}
                  avgPartitionSizeBytes={currentStep.inputShape.totalSizeBytes / currentStep.inputShape.partitions}
                />
              </div>
            </div>

            {/* Output State */}
            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                Output State
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Rows:</span>
                  <span className={`font-mono ${
                    currentStep.outputShape.rows !== currentStep.inputShape.rows
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {currentStep.outputShape.rows.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Partitions:</span>
                  <span className={`font-mono ${
                    currentStep.outputShape.partitions !== currentStep.inputShape.partitions
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {currentStep.outputShape.partitions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Size:</span>
                  <span className={`font-mono ${
                    currentStep.outputShape.totalSizeBytes !== currentStep.inputShape.totalSizeBytes
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {(currentStep.outputShape.totalSizeBytes / 1_000_000).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Skew:</span>
                  <span className={`font-mono ${
                    currentStep.outputShape.skewFactor !== currentStep.inputShape.skewFactor
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {currentStep.outputShape.skewFactor.toFixed(1)}x
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <PartitionBars
                  partitions={currentStep.outputShape.partitions}
                  skewFactor={currentStep.outputShape.skewFactor}
                  avgPartitionSizeBytes={currentStep.outputShape.totalSizeBytes / currentStep.outputShape.partitions}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
