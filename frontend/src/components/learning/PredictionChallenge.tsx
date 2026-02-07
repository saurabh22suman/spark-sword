'use client';

/**
 * PredictionChallenge Component
 * 
 * Core component for Brilliant-style predict-before-reveal learning.
 * User makes a prediction, gets immediate feedback, then sees explanation.
 * 
 * Features:
 * - Multiple choice with visual options
 * - Immediate feedback animation
 * - Celebration for correct answers
 * - Gentle correction for incorrect
 * - Progressive hints
 * - Related content linking
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Lightbulb, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CELEBRATION_ANIMATION,
  GENTLE_CORRECTION,
  CONCEPT_REVEAL,
  LEARNING_COLORS,
} from './animations';
import type { PredictionChallenge as PredictionChallengeType } from '@/types/learning';

interface PredictionChallengeProps {
  challenge: PredictionChallengeType;
  onComplete?: (correct: boolean, attempts: number) => void;
  onSkip?: () => void;
  allowMultipleAttempts?: boolean;
  showHints?: boolean;
  className?: string;
}

export function PredictionChallenge({
  challenge,
  onComplete,
  onSkip,
  allowMultipleAttempts = true,
  showHints: _showHints = true,
  className = '',
}: PredictionChallengeProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMisconception, setShowMisconception] = useState(false);

  const isCorrect = selectedOption === challenge.correctAnswerId;
  const canSubmit = selectedOption !== null && !submitted;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    setSubmitted(true);
    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      // Celebrate correct answer
      setTimeout(() => {
        setShowExplanation(true);
        onComplete?.(true, attempts + 1);
      }, 800);
    } else {
      // Show misconception if available
      if (challenge.commonMisconception) {
        setShowMisconception(true);
      }
    }
  }, [canSubmit, isCorrect, attempts, challenge.commonMisconception, onComplete]);

  const handleTryAgain = useCallback(() => {
    setSelectedOption(null);
    setSubmitted(false);
    setShowMisconception(false);
  }, []);

  const handleShowExplanation = useCallback(() => {
    setShowExplanation(true);
    onComplete?.(false, attempts);
  }, [attempts, onComplete]);

  return (
    <div className={cn('space-y-6', className)} data-testid="prediction-challenge">
      {/* Question */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {challenge.context && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {challenge.context}
              </p>
            )}
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {challenge.question}
            </h3>
          </div>
          {challenge.difficulty && (
            <span
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-full',
                challenge.difficulty === 'easy' &&
                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                challenge.difficulty === 'medium' &&
                  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                challenge.difficulty === 'hard' &&
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              )}
            >
              {challenge.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="grid gap-3">
        {challenge.options.map((option) => {
          const isSelected = selectedOption === option.id;
          const isThisCorrect = option.id === challenge.correctAnswerId;
          const showResult = submitted && isSelected;

          return (
            <motion.button
              key={option.id}
              onClick={() => !submitted && setSelectedOption(option.id)}
              disabled={submitted}
              variants={showResult && !isThisCorrect ? GENTLE_CORRECTION : CELEBRATION_ANIMATION}
              initial="initial"
              animate={showResult ? (isThisCorrect ? 'celebrate' : 'shake') : 'initial'}
              className={cn(
                'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                'disabled:cursor-not-allowed',
                !submitted && !isSelected &&
                  'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600',
                !submitted && isSelected &&
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                showResult && isThisCorrect &&
                  'border-green-500 bg-green-50 dark:bg-green-900/20',
                showResult && !isThisCorrect &&
                  'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              )}
              data-testid={`option-${option.id}`}
            >
              <div className="flex items-start gap-3">
                {/* Selection indicator */}
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                    !submitted && !isSelected && 'border-slate-300 dark:border-slate-600',
                    !submitted && isSelected && 'border-blue-500 bg-blue-500',
                    showResult && isThisCorrect && 'border-green-500 bg-green-500',
                    showResult && !isThisCorrect && 'border-orange-500 bg-orange-500'
                  )}
                >
                  {showResult && isThisCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  {showResult && !isThisCorrect && <XCircle className="w-4 h-4 text-white" />}
                  {!submitted && isSelected && (
                    <div className="w-3 h-3 rounded-full bg-white" />
                  )}
                </div>

                {/* Option content */}
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {option.description}
                    </div>
                  )}
                  {option.visual && <div className="mt-3">{option.visual}</div>}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Submit / Try Again / Show Explanation */}
      <div className="flex items-center gap-3">
        {!submitted && (
          <>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'px-6 py-3 rounded-xl font-semibold transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                `bg-gradient-to-r ${LEARNING_COLORS.challenge} text-white`,
                'hover:shadow-lg hover:scale-105 active:scale-100'
              )}
              data-testid="submit-prediction"
            >
              Submit Prediction
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Skip for now
              </button>
            )}
          </>
        )}

        {submitted && !isCorrect && allowMultipleAttempts && !showExplanation && (
          <>
            <button
              onClick={handleTryAgain}
              className="px-6 py-3 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              data-testid="try-again"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={handleShowExplanation}
              className="px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
              data-testid="show-explanation"
            >
              Show Explanation
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Misconception Alert */}
      <AnimatePresence>
        {showMisconception && !showExplanation && (
          <motion.div
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            data-testid="misconception-alert"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Common Misconception
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {challenge.commonMisconception}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={cn(
              'p-6 rounded-xl border-2',
              isCorrect
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
            )}
            data-testid="explanation"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4
                    className={cn(
                      'font-bold text-lg mb-2',
                      isCorrect
                        ? 'text-green-900 dark:text-green-200'
                        : 'text-blue-900 dark:text-blue-200'
                    )}
                  >
                    {isCorrect ? 'Correct!' : 'Here\'s why:'}
                  </h4>
                  <p
                    className={cn(
                      'text-sm leading-relaxed',
                      isCorrect
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-blue-800 dark:text-blue-300'
                    )}
                  >
                    {challenge.explanation}
                  </p>
                </div>
              </div>

              {/* Visual Demo */}
              {challenge.visualDemo && (
                <div className="pt-4 border-t border-green-200 dark:border-green-800">
                  {challenge.visualDemo}
                </div>
              )}

              {/* Related Concepts */}
              {challenge.relatedConcepts && challenge.relatedConcepts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Related concepts:
                  </span>
                  {challenge.relatedConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
