'use client';

/**
 * MythBuster Component
 * 
 * Interactive myth debunking in Brilliant style.
 * User votes on whether a statement is true/false/depends,
 * then sees the truth revealed with explanation and proof.
 * 
 * Features:
 * - Vote before reveal
 * - Animated truth reveal
 * - Proof demonstration
 * - Link to related scenarios/tutorials
 * - Track debunked myths
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, HelpCircle, Lightbulb, Play, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CELEBRATION_ANIMATION,
  GENTLE_CORRECTION,
  CONCEPT_REVEAL,
  LEARNING_COLORS,
} from './animations';
import type { Myth } from '@/types/learning';

interface MythBusterProps {
  myth: Myth;
  onComplete?: (correct: boolean) => void;
  showRelatedContent?: boolean;
  className?: string;
}

type Vote = 'true' | 'false' | 'depends' | null;

export function MythBuster({
  myth,
  onComplete,
  showRelatedContent = true,
  className = '',
}: MythBusterProps) {
  const [vote, setVote] = useState<Vote>(null);
  const [revealed, setRevealed] = useState(false);
  const [showProof, setShowProof] = useState(false);

  const isCorrect = vote === myth.truthValue;

  const handleVote = useCallback((selectedVote: Vote) => {
    if (revealed) return;
    setVote(selectedVote);
  }, [revealed]);

  const handleReveal = useCallback(() => {
    if (!vote) return;
    setRevealed(true);
    onComplete?.(isCorrect);
  }, [vote, isCorrect, onComplete]);

  const handleShowProof = useCallback(() => {
    setShowProof(true);
  }, []);

  return (
    <div className={cn('space-y-6', className)} data-testid="myth-buster">
      {/* Myth Statement */}
      <motion.div
        variants={revealed && !isCorrect ? GENTLE_CORRECTION : CELEBRATION_ANIMATION}
        initial="initial"
        animate={revealed ? (isCorrect ? 'celebrate' : 'shake') : 'initial'}
        className={cn(
          'p-6 rounded-xl border-2 transition-all duration-300',
          !revealed && 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
          revealed && isCorrect && 'bg-green-50 dark:bg-green-900/20 border-green-500',
          revealed && !isCorrect && 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
        )}
      >
        {myth.category && (
          <div className="mb-3">
            <span className="px-2.5 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
              {myth.category}
            </span>
          </div>
        )}
        <blockquote className="text-xl font-semibold text-slate-900 dark:text-white leading-relaxed">
          &ldquo;{myth.statement}&rdquo;
        </blockquote>
      </motion.div>

      {/* Voting Buttons */}
      {!revealed && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleVote('true')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2',
              vote === 'true'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
            )}
            data-testid="vote-true"
          >
            <ThumbsUp
              className={cn(
                'w-6 h-6',
                vote === 'true'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span
              className={cn(
                'text-sm font-semibold',
                vote === 'true'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              True
            </span>
          </button>

          <button
            onClick={() => handleVote('false')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2',
              vote === 'false'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
            )}
            data-testid="vote-false"
          >
            <ThumbsDown
              className={cn(
                'w-6 h-6',
                vote === 'false'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span
              className={cn(
                'text-sm font-semibold',
                vote === 'false'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              False
            </span>
          </button>

          <button
            onClick={() => handleVote('depends')}
            className={cn(
              'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2',
              vote === 'depends'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
            )}
            data-testid="vote-depends"
          >
            <HelpCircle
              className={cn(
                'w-6 h-6',
                vote === 'depends'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span
              className={cn(
                'text-sm font-semibold',
                vote === 'depends'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400'
              )}
            >
              Depends
            </span>
          </button>
        </div>
      )}

      {/* Reveal Button */}
      {!revealed && vote && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleReveal}
          className={cn(
            'w-full px-6 py-3 rounded-xl font-semibold transition-all',
            `bg-gradient-to-r ${LEARNING_COLORS.challenge} text-white`,
            'hover:shadow-lg hover:scale-105 active:scale-100'
          )}
          data-testid="reveal-truth"
        >
          Reveal the Truth
        </motion.button>
      )}

      {/* Truth Revealed */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-4"
          >
            {/* Verdict */}
            <div
              className={cn(
                'p-6 rounded-xl border-2',
                isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              )}
            >
              <div className="flex items-start gap-3 mb-4">
                <Lightbulb
                  className={cn(
                    'w-6 h-6 flex-shrink-0',
                    isCorrect
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  )}
                />
                <div>
                  <h4
                    className={cn(
                      'font-bold text-lg mb-2',
                      isCorrect
                        ? 'text-green-900 dark:text-green-200'
                        : 'text-blue-900 dark:text-blue-200'
                    )}
                  >
                    {isCorrect ? 'Correct! ' : ''}The truth: {myth.truthValue.toUpperCase()}
                  </h4>
                  <p
                    className={cn(
                      'text-sm leading-relaxed',
                      isCorrect
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-blue-800 dark:text-blue-300'
                    )}
                  >
                    {myth.explanation}
                  </p>
                </div>
              </div>

              {/* Counterexample */}
              {myth.counterexample && (
                <div className="mt-4 p-4 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <h5 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                    Counterexample:
                  </h5>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {myth.counterexample}
                  </p>
                </div>
              )}
            </div>

            {/* Proof Demo */}
            {myth.proofDemo && !showProof && (
              <button
                onClick={handleShowProof}
                className="w-full px-6 py-3 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                data-testid="show-proof"
              >
                <Play className="w-4 h-4" />
                See Proof in Action
              </button>
            )}

            {showProof && myth.proofDemo && (
              <motion.div
                variants={CONCEPT_REVEAL}
                initial="hidden"
                animate="visible"
                className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800"
              >
                {myth.proofDemo}
              </motion.div>
            )}

            {/* Related Content */}
            {showRelatedContent &&
              (myth.relatedScenarios?.length || myth.relatedTutorials?.length) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <h5 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Learn More
                  </h5>
                  <div className="space-y-2">
                    {myth.relatedScenarios?.map((scenario) => (
                      <a
                        key={scenario}
                        href={`/scenarios?scenario=${scenario}`}
                        className="block px-3 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        → Scenario: {scenario}
                      </a>
                    ))}
                    {myth.relatedTutorials?.map((tutorial) => (
                      <a
                        key={tutorial}
                        href={`/tutorials/${tutorial}`}
                        className="block px-3 py-2 rounded-lg text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      >
                        → Tutorial: {tutorial}
                      </a>
                    ))}
                  </div>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
