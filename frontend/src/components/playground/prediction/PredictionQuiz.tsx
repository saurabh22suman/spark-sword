/**
 * Enhanced Prediction Quiz
 * 
 * Pre-commit prediction system (Brilliant.org pattern).
 * Forces users to make a prediction BEFORE showing simulation results.
 * 
 * Key Features:
 * - Multiple choice with 2-4 options
 * - "Unsure" always available
 * - Locks input after commit
 * - Shows comparison between prediction and actual
 * - Tracks accuracy for adaptive difficulty
 * 
 * Design Philosophy (from enhancement plan):
 * - Active retrieval > passive reading
 * - Cognitive commitment via lock-in state
 * - Calm, non-judgmental explanations
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Lock, CheckCircle, XCircle, Info } from 'lucide-react';

export type QuizPrediction = string;

export interface QuizOption {
  id: QuizPrediction;
  label: string;
  description?: string;
}

export interface PredictionQuizProps {
  /** Question to ask */
  question: string;
  /** Available options (2-4 recommended) */
  options: QuizOption[];
  /** Expected correct answer ID */
  expectedAnswer: QuizPrediction;
  /** Explanation of why this answer is correct */
  explanation: string;
  /** Callback when quiz is completed */
  onComplete: (wasCorrect: boolean, selected: QuizPrediction) => void;
  /** Whether to show the quiz */
  isVisible: boolean;
  /** Optional hint text */
  hint?: string;
}

export function PredictionQuiz({
  question,
  options,
  expectedAnswer,
  explanation,
  onComplete,
  isVisible,
  hint,
}: PredictionQuizProps) {
  const [selectedOption, setSelectedOption] = useState<QuizPrediction | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Always add "Unsure" option per spec
  const allOptions: QuizOption[] = [
    ...options,
    { id: 'unsure', label: 'Unsure', description: "I'm not sure what Spark will do" },
  ];

  const handleSelect = useCallback((optionId: QuizPrediction) => {
    if (!isLocked) {
      setSelectedOption(optionId);
    }
  }, [isLocked]);

  const handleCommit = useCallback(() => {
    if (!selectedOption || isLocked) return;
    
    // Lock the selection
    setIsLocked(true);
    
    // Show explanation after brief animation
    setTimeout(() => {
      setShowExplanation(true);
      const wasCorrect = selectedOption === expectedAnswer;
      onComplete(wasCorrect, selectedOption);
    }, 300);
  }, [selectedOption, isLocked, expectedAnswer, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg"
        data-testid="prediction-quiz"
      >
        {/* Lock indicator */}
        {isLocked && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-full">
            <Lock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Locked</span>
          </div>
        )}

        {/* Question */}
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Predict Spark's Behavior
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {question}
            </p>
            {hint && !isLocked && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{hint}</span>
              </p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-5" role="radiogroup" aria-label={question}>
          {allOptions.map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = option.id === expectedAnswer;
            const showCorrectness = isLocked && showExplanation;
            
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={isLocked}
                data-testid={`quiz-option-${option.id}`}
                className={`
                  w-full p-3 rounded-lg border-2 text-left transition-all
                  ${isSelected && !showCorrectness
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                  }
                  ${showCorrectness && isSelected && isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : ''
                  }
                  ${showCorrectness && isSelected && !isCorrect
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                    : ''
                  }
                  ${showCorrectness && !isSelected && isCorrect
                    ? 'border-green-400 bg-green-50/50 dark:bg-green-900/20'
                    : ''
                  }
                  ${!isLocked ? 'hover:border-blue-400 cursor-pointer' : 'cursor-not-allowed'}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Radio indicator */}
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-slate-300 dark:border-slate-600'
                    }
                  `}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isSelected 
                          ? 'text-slate-900 dark:text-slate-100' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {option.label}
                      </span>
                      
                      {/* Correctness indicator */}
                      {showCorrectness && isSelected && (
                        isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )
                      )}
                      {showCorrectness && !isSelected && isCorrect && (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 opacity-50" />
                      )}
                    </div>
                    
                    {option.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Commit Button */}
        {!isLocked && (
          <motion.button
            onClick={handleCommit}
            disabled={!selectedOption}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full py-3 px-4 rounded-lg font-medium text-sm transition-all
              ${selectedOption
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }
            `}
            data-testid="quiz-commit-button"
          >
            {selectedOption ? 'Lock in my prediction' : 'Select an option to continue'}
          </motion.button>
        )}

        {/* Explanation (shown after commit) */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700"
            >
              <div className={`p-4 rounded-lg ${
                selectedOption === expectedAnswer
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {selectedOption === expectedAnswer ? '✓ Correct!' : 'Spark chose differently'}
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {explanation}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
