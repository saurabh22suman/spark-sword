'use client';

/**
 * Brilliant-style Prediction Challenge Component
 * 
 * Philosophy:
 * - Predict before reveal
 * - Immediate feedback
 * - Celebrate correct predictions
 * - Gently correct misconceptions
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { PredictionChallenge as PredictionChallengeType } from '@/types';

interface PredictionChallengeProps {
  challenge: PredictionChallengeType;
  onComplete: (correct: boolean, selectedIndex: number, hintsUsed: number) => void;
  onHintUsed?: () => void;
}

export function PredictionChallenge({ challenge, onComplete, onHintUsed }: PredictionChallengeProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setHasSubmitted(true);
  };

  const revealNextHint = () => {
    if (challenge.hints && hintsRevealed < challenge.hints.length) {
      setHintsRevealed(hintsRevealed + 1);
      onHintUsed?.();
    }
  };

  const isCorrect = selectedIndex === challenge.correct_index;
  const hasHints = challenge.hints && challenge.hints.length > 0;
  const allHintsRevealed = hasHints && hintsRevealed >= (challenge.hints?.length ?? 0);

  return (
    <Card variant="bordered" className="max-w-3xl mx-auto">
      <CardContent className="p-8">
        {/* Question */}
        <div className="mb-6">
          <Badge variant="info" className="mb-3">
            🧠 Predict Before You Learn
          </Badge>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            {challenge.question}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose your answer, then submit to see if you&apos;re right.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {challenge.options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const isThisCorrect = index === challenge.correct_index;
            const showResult = hasSubmitted;

            return (
              <motion.button
                key={index}
                onClick={() => !hasSubmitted && setSelectedIndex(index)}
                disabled={hasSubmitted}
                whileHover={!hasSubmitted ? { scale: 1.01 } : {}}
                whileTap={!hasSubmitted ? { scale: 0.99 } : {}}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  !hasSubmitted && "cursor-pointer hover:border-blue-300 dark:hover:border-blue-700",
                  isSelected && !hasSubmitted && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
                  !isSelected && !hasSubmitted && "border-slate-200 dark:border-slate-800",
                  hasSubmitted && isThisCorrect && "border-green-500 bg-green-50 dark:bg-green-900/20",
                  hasSubmitted && !isThisCorrect && isSelected && "border-red-500 bg-red-50 dark:bg-red-900/20",
                  hasSubmitted && !isThisCorrect && !isSelected && "border-slate-200 dark:border-slate-800 opacity-50"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Selection indicator */}
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    isSelected && !hasSubmitted && "border-blue-500 bg-blue-500",
                    !isSelected && !hasSubmitted && "border-slate-300 dark:border-slate-700",
                    hasSubmitted && isThisCorrect && "border-green-500 bg-green-500",
                    hasSubmitted && !isThisCorrect && isSelected && "border-red-500 bg-red-500"
                  )}>
                    {showResult && isThisCorrect && <CheckCircle2 className="w-4 h-4 text-white" />}
                    {showResult && !isThisCorrect && isSelected && <XCircle className="w-4 h-4 text-white" />}
                    {isSelected && !hasSubmitted && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Option text */}
                  <span className="text-slate-900 dark:text-white font-medium">
                    {option}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Hints Section */}
        {!hasSubmitted && hasHints && (
          <div className="mb-6">
            <AnimatePresence>
              {hintsRevealed > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 space-y-2"
                >
                  {challenge.hints!.slice(0, hintsRevealed).map((hint, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <span className="font-semibold">Hint {index + 1}:</span> {hint}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!allHintsRevealed && (
              <Button
                variant="secondary"
                size="md"
                onClick={revealNextHint}
                className="w-full mb-3"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Show Hint {hintsRevealed + 1}/{challenge.hints!.length}
              </Button>
            )}
          </div>
        )}

        {/* Submit Button */}
        {!hasSubmitted && (
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleSubmit}
            disabled={selectedIndex === null}
            className="w-full"
          >
            Submit Answer
          </Button>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {hasSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Correct/Incorrect Badge */}
              <div className="mb-4">
                {isCorrect ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold text-lg">Correct! 🎉</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-bold text-lg">Not quite, but great try!</span>
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-1">
                      Why this matters:
                    </h4>
                    <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                      {challenge.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Misconception (if provided and user was wrong) */}
              {!isCorrect && challenge.misconception && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">
                        Common misconception:
                      </h4>
                      <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed">
                        {challenge.misconception}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => onComplete(isCorrect, selectedIndex ?? 0, hintsRevealed)}
                className="w-full"
              >
                Continue to Tutorial →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
