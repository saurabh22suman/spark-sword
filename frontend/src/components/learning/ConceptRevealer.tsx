'use client';

/**
 * ConceptRevealer Component
 * 
 * Progressive disclosure of concepts in Brilliant style.
 * Reveals concepts step-by-step with animations and interactive demos.
 * 
 * Features:
 * - Step-by-step concept building
 * - Animated transitions between steps
 * - Interactive demos embedded in each step
 * - Key takeaways highlighted
 * - Back/forward navigation
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CONCEPT_REVEAL,
  STAGGER_CONTAINER,
  INSIGHT_HIGHLIGHT,
  LEARNING_COLORS,
} from './animations';
import type { ConceptStep } from '@/types/learning';

interface ConceptRevealerProps {
  steps: ConceptStep[];
  onComplete?: () => void;
  autoProgress?: boolean;
  className?: string;
}

export function ConceptRevealer({
  steps,
  onComplete,
  autoProgress: _autoProgress = false,
  className = '',
}: ConceptRevealerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState<Set<number>>(new Set([0]));

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
      return;
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setRevealedSteps((prev) => {
      const newSet = new Set(prev);
      newSet.add(nextStep);
      return newSet;
    });
  }, [currentStep, isLastStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep]);

  const handleJumpToStep = useCallback((stepIndex: number) => {
    if (revealedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  }, [revealedSteps]);

  return (
    <div className={cn('space-y-6', className)} data-testid="concept-revealer">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, index) => {
          const isRevealed = revealedSteps.has(index);
          const isCurrent = index === currentStep;

          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => handleJumpToStep(index)}
                disabled={!isRevealed}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  'disabled:cursor-not-allowed',
                  isCurrent &&
                    'bg-gradient-to-r from-blue-500 to-cyan-500 text-white scale-110 shadow-lg',
                  !isCurrent && isRevealed &&
                    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:scale-105',
                  !isRevealed &&
                    'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                )}
                data-testid={`step-indicator-${index}`}
              >
                {isRevealed && !isCurrent ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1 transition-colors',
                    revealedSteps.has(index + 1)
                      ? 'bg-green-300 dark:bg-green-700'
                      : 'bg-slate-200 dark:bg-slate-700'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="space-y-6"
        >
          {/* Step Header */}
          <motion.div variants={CONCEPT_REVEAL} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {step.title}
            </h3>
            <p className="text-lg text-slate-700 dark:text-slate-300">
              {step.concept}
            </p>
          </motion.div>

          {/* Explanation */}
          <motion.div
            variants={CONCEPT_REVEAL}
            className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
          >
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {step.explanation}
            </p>
          </motion.div>

          {/* Visual Demo */}
          {step.visual && (
            <motion.div
              variants={CONCEPT_REVEAL}
              className="p-6 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900"
            >
              {step.visual}
            </motion.div>
          )}

          {/* Interactive Demo */}
          {step.interactiveDemo && (
            <motion.div
              variants={CONCEPT_REVEAL}
              className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">▶</span>
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-200">
                  Try it yourself
                </h4>
              </div>
              {step.interactiveDemo}
            </motion.div>
          )}

          {/* Key Takeaway */}
          {step.keyTakeaway && (
            <motion.div
              variants={INSIGHT_HIGHLIGHT}
              initial="initial"
              animate="highlight"
              className="p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                    Key Takeaway
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    {step.keyTakeaway}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handlePrevious}
          disabled={isFirstStep}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !isFirstStep &&
              'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
          data-testid="previous-step"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          {currentStep + 1} / {steps.length}
        </div>

        <button
          onClick={handleNext}
          className={cn(
            'px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2',
            isLastStep
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
              : `bg-gradient-to-r ${LEARNING_COLORS.challenge} text-white hover:shadow-lg hover:scale-105`
          )}
          data-testid="next-step"
        >
          {isLastStep ? 'Complete' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
