'use client';

/**
 * BrilliantTutorial Wrapper
 * 
 * High-level component that orchestrates the Brilliant-style learning flow:
 * Setup → Challenge → Explore → Explain → Reflect → Next
 * 
 * Features:
 * - Structured learning progression
 * - Time tracking
 * - Progress persistence
 * - Celebration moments
 * - Next step recommendations
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Target, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PredictionChallenge } from './PredictionChallenge';
import { ConceptRevealer } from './ConceptRevealer';
import { CONCEPT_REVEAL, CELEBRATION_ANIMATION, LEARNING_COLORS } from './animations';
import type { TutorialContent } from '@/types/learning';

interface BrilliantTutorialProps {
  content: TutorialContent;
  onComplete?: (timeSpent: number, challengeCorrect: boolean) => void;
  onSkip?: () => void;
  showProgress?: boolean;
  className?: string;
}

type TutorialPhase = 'setup' | 'challenge' | 'concepts' | 'interactive' | 'reflection' | 'complete';

export function BrilliantTutorial({
  content,
  onComplete,
  onSkip,
  showProgress = true,
  className = '',
}: BrilliantTutorialProps) {
  const [phase, setPhase] = useState<TutorialPhase>('setup');
  const [challengeCorrect, setChallengeCorrect] = useState(false);
  const [challengeAttempts, setChallengeAttempts] = useState(0);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [startTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleComplete = useCallback(() => {
    setPhase('complete');
    onComplete?.(timeSpent, challengeCorrect);
  }, [timeSpent, challengeCorrect, onComplete]);

  const handleChallengeComplete = useCallback((correct: boolean, attempts: number) => {
    setChallengeCorrect(correct);
    setChallengeAttempts(attempts);
    // Auto-advance to concepts after a short delay
    setTimeout(() => {
      if (content.concepts && content.concepts.length > 0) {
        setPhase('concepts');
      } else if (content.interactiveComponent) {
        setPhase('interactive');
      } else if (content.reflection) {
        setPhase('reflection');
      } else {
        handleComplete();
      }
    }, 1500);
  }, [content, handleComplete]);

  const handleConceptsComplete = useCallback(() => {
    if (content.interactiveComponent) {
      setPhase('interactive');
    } else if (content.reflection) {
      setPhase('reflection');
    } else {
      handleComplete();
    }
  }, [content, handleComplete]);

  const handleReflectionSubmit = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const handleReset = useCallback(() => {
    setPhase('setup');
    setChallengeCorrect(false);
    setChallengeAttempts(0);
    setReflectionAnswer('');
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const phaseOrder: TutorialPhase[] = ['setup', 'challenge', 'concepts', 'interactive', 'reflection', 'complete'];
  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const totalPhases = phaseOrder.filter((p) => {
    if (p === 'setup') return content.setup !== undefined;
    if (p === 'challenge') return content.challenge !== undefined;
    if (p === 'concepts') return content.concepts && content.concepts.length > 0;
    if (p === 'interactive') return content.interactiveComponent !== undefined;
    if (p === 'reflection') return content.reflection !== undefined;
    if (p === 'complete') return true;
    return false;
  }).length;

  return (
    <div className={cn('space-y-6', className)} data-testid="brilliant-tutorial">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {content.title}
            </h2>
            {content.subtitle && (
              <p className="text-lg text-slate-600 dark:text-slate-400">
                {content.subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-full',
                content.difficulty === 'beginner' &&
                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                content.difficulty === 'intermediate' &&
                  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                content.difficulty === 'advanced' &&
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              )}
            >
              {content.difficulty}
            </span>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              {formatTime(timeSpent)} / ~{content.estimatedMinutes}m
            </div>
          </div>
        </div>

        {/* Learning Outcome */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Learning Outcome
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {content.learningOutcome}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Progress
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {currentPhaseIndex + 1} / {totalPhases}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentPhaseIndex + 1) / totalPhases) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Phases */}
      <AnimatePresence mode="wait">
        {/* Setup Phase */}
        {phase === 'setup' && content.setup && (
          <motion.div
            key="setup"
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Context
              </h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                {content.setup.context}
              </p>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  Why this matters
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {content.setup.motivation}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPhase('challenge')}
              className={cn(
                'w-full px-6 py-3 rounded-xl font-semibold transition-all',
                `bg-gradient-to-r ${LEARNING_COLORS.challenge} text-white`,
                'hover:shadow-lg hover:scale-105 active:scale-100'
              )}
            >
              Start Challenge
              <ArrowRight className="inline-block w-4 h-4 ml-2" />
            </button>
          </motion.div>
        )}

        {/* Challenge Phase */}
        {phase === 'challenge' && content.challenge && (
          <motion.div
            key="challenge"
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <PredictionChallenge
              challenge={content.challenge}
              onComplete={handleChallengeComplete}
              onSkip={onSkip}
            />
          </motion.div>
        )}

        {/* Concepts Phase */}
        {phase === 'concepts' && content.concepts && (
          <motion.div
            key="concepts"
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <ConceptRevealer steps={content.concepts} onComplete={handleConceptsComplete} />
          </motion.div>
        )}

        {/* Interactive Phase */}
        {phase === 'interactive' && content.interactiveComponent && (
          <motion.div
            key="interactive"
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200 mb-4">
                Explore Interactively
              </h3>
              {content.interactiveComponent}
            </div>
            <button
              onClick={() => content.reflection ? setPhase('reflection') : handleComplete()}
              className={cn(
                'w-full px-6 py-3 rounded-xl font-semibold transition-all',
                `bg-gradient-to-r ${LEARNING_COLORS.challenge} text-white`,
                'hover:shadow-lg hover:scale-105 active:scale-100'
              )}
            >
              Continue
              <ArrowRight className="inline-block w-4 h-4 ml-2" />
            </button>
          </motion.div>
        )}

        {/* Reflection Phase */}
        {phase === 'reflection' && content.reflection && (
          <motion.div
            key="reflection"
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Reflect
              </h3>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                {content.reflection.question}
              </p>
              <textarea
                value={reflectionAnswer}
                onChange={(e) => setReflectionAnswer(e.target.value)}
                placeholder="Your thoughts..."
                className="w-full p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                data-testid="reflection-input"
              />
              {content.reflection.guidedAnswer && reflectionAnswer.length > 20 && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm">
                    Key points to consider:
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {content.reflection.guidedAnswer}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleReflectionSubmit}
              disabled={reflectionAnswer.length < 10}
              className={cn(
                'w-full px-6 py-3 rounded-xl font-semibold transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                `bg-gradient-to-r ${LEARNING_COLORS.correct} text-white`,
                'hover:shadow-lg hover:scale-105 active:scale-100'
              )}
              data-testid="submit-reflection"
            >
              Complete Tutorial
              <CheckCircle2 className="inline-block w-4 h-4 ml-2" />
            </button>
          </motion.div>
        )}

        {/* Complete Phase */}
        {phase === 'complete' && (
          <motion.div
            key="complete"
            variants={CELEBRATION_ANIMATION}
            initial="initial"
            animate="celebrate"
            className="p-8 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 text-center"
          >
            <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
              Tutorial Complete!
            </h3>
            <p className="text-green-800 dark:text-green-300 mb-4">
              Time spent: {formatTime(timeSpent)}
              {challengeAttempts > 0 && ` • Challenge attempts: ${challengeAttempts}`}
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Review
              </button>
              {content.nextSteps && content.nextSteps.length > 0 && (
                <button
                  onClick={() => {
                    if (content.nextSteps && content.nextSteps[0]) {
                      window.location.href = `/tutorials/${content.nextSteps[0]}`;
                    }
                  }}
                  className={cn(
                    'px-6 py-3 rounded-xl font-semibold transition-all',
                    `bg-gradient-to-r ${LEARNING_COLORS.challenge} text-white`,
                    'hover:shadow-lg hover:scale-105 active:scale-100'
                  )}
                >
                  Next Tutorial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
