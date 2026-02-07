'use client';

/**
 * Prediction Prompt Component
 * 
 * Per playground-predicition-animation-flow-spec.md:
 * "Before you run it — what do you think Spark will do?"
 * 
 * Forces prediction before explanation:
 * - Inline panel (never a modal)
 * - Radio buttons (2-4 options max)
 * - "Unsure" always allowed
 * - Creates cognitive commitment via lock-in
 * 
 * Non-negotiables:
 * - Must not block the screen
 * - Short, concrete, mentor-style questions
 * - No free text input
 */

import { useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HelpCircle, Lock, ChevronRight } from 'lucide-react';
import { useLearningMode } from '@/lib/LearningModeContext';

export type PredictionType = 
  | 'no_shuffle' 
  | 'shuffle' 
  | 'broadcast_join' 
  | 'spill_risk'
  | 'balanced'
  | 'skewed'
  | 'unsure';

export interface PredictionOption {
  id: PredictionType;
  label: string;
  hint?: string; // Only shown in learning mode
}

export interface PredictionPromptProps {
  /** Question to ask the user */
  question: string;
  /** Available prediction options (2-4 max) */
  options: PredictionOption[];
  /** Current selection */
  selectedPrediction: PredictionType | null;
  /** Callback when prediction is selected */
  onSelect: (prediction: PredictionType) => void;
  /** Callback when user commits to prediction */
  onCommit: () => void;
  /** Whether prediction is locked in */
  isLocked: boolean;
  /** Whether to show the prompt */
  isVisible: boolean;
  /** Optional class name */
  className?: string;
}

export function PredictionPrompt({
  question,
  options,
  selectedPrediction,
  onSelect,
  onCommit,
  isLocked,
  isVisible,
  className = '',
}: PredictionPromptProps) {
  const { isLearningMode } = useLearningMode();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;

  const handleSelect = useCallback((id: PredictionType) => {
    if (!isLocked) {
      onSelect(id);
    }
  }, [isLocked, onSelect]);

  const handleCommit = useCallback(() => {
    if (selectedPrediction && !isLocked) {
      onCommit();
    }
  }, [selectedPrediction, isLocked, onCommit]);

  // Always include "Unsure" option per spec
  const allOptions: PredictionOption[] = [
    ...options,
    { id: 'unsure', label: 'Unsure', hint: "It's okay to be uncertain" },
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="prediction-prompt"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
        className={`
          relative p-4 rounded-xl border
          ${isLocked 
            ? 'bg-slate-800/60 border-slate-600/50' 
            : 'bg-slate-900/80 border-blue-500/30'}
          backdrop-blur-sm
          ${className}
        `}
      >
        {/* Lock indicator */}
        {isLocked && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-slate-400">
            <Lock className="w-3 h-3" />
            <span>Locked</span>
          </div>
        )}

        {/* Question */}
        <div className="flex items-start gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <HelpCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{question}</p>
            {isLearningMode && (
              <p className="text-xs text-slate-400 mt-1">
                Think about what Spark will do before seeing the answer.
              </p>
            )}
          </div>
        </div>

        {/* Options */}
        <div 
          className="space-y-2"
          role="radiogroup"
          aria-label={question}
        >
          {allOptions.map((option) => {
            const isSelected = selectedPrediction === option.id;
            
            return (
              <motion.button
                key={option.id}
                data-testid={`prediction-option-${option.id}`}
                onClick={() => handleSelect(option.id)}
                disabled={isLocked}
                whileHover={!isLocked && !reducedMotion ? { scale: 1.01 } : {}}
                whileTap={!isLocked && !reducedMotion ? { scale: 0.99 } : {}}
                className={`
                  w-full px-4 py-2.5 rounded-lg text-left text-sm
                  transition-colors duration-150
                  flex items-center gap-3
                  ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                  ${isSelected
                    ? 'bg-blue-600/30 border border-blue-500/50 text-white'
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'}
                `}
                role="radio"
                aria-checked={isSelected}
              >
                {/* Radio indicator */}
                <span className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-500' 
                    : 'border-slate-500'}
                `}>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </span>
                
                {/* Label */}
                <span className="flex-1">{option.label}</span>
                
                {/* Hint (learning mode only) */}
                {isLearningMode && option.hint && (
                  <span className="text-xs text-slate-500">{option.hint}</span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Commit button */}
        {!isLocked && (
          <motion.button
            data-testid="prediction-commit"
            onClick={handleCommit}
            disabled={!selectedPrediction}
            initial={{ opacity: 0 }}
            animate={{ opacity: selectedPrediction ? 1 : 0.5 }}
            className={`
              mt-4 w-full py-2.5 rounded-lg text-sm font-medium
              flex items-center justify-center gap-2
              transition-all duration-200
              ${selectedPrediction
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
            `}
          >
            See What Spark Does
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default PredictionPrompt;
