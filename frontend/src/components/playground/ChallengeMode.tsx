/**
 * Challenge Mode Component
 * 
 * Provides scaffolded learning goals for the playground.
 * Users learn by completing specific, measurable tasks with progressive hints.
 * 
 * Core principles:
 * - Goals are specific and measurable
 * - Hints are progressive (minimal → detailed)
 * - Success criteria are clear
 * - Safe to experiment and reset
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Operation } from './OperationsBuilder';
import type { DataShape } from './DataShapePanel';

export interface Challenge {
  id: string;
  title: string;
  category: 'basics' | 'shuffle' | 'joins' | 'skew';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goal: string;
  successCriteria: SuccessCriterion[];
  hints: HintLevel[];
  initialShape?: Partial<DataShape>;
  recommendedOperations?: string[];
}

export interface SuccessCriterion {
  id: string;
  description: string;
  validate: (operations: Operation[], shape: DataShape) => boolean;
  weight: number; // For progress calculation
}

export interface HintLevel {
  level: number;
  text: string;
  detailLevel: 'minimal' | 'moderate' | 'detailed';
}

interface ChallengeModeProps {
  isEnabled: boolean;
  currentOperations: Operation[];
  currentShape: DataShape;
  onChallengeSelect: (challenge: Challenge | null) => void;
  onReset: () => void;
  isLearningMode: boolean;
}

// Challenge definitions
const CHALLENGES: Challenge[] = [
  {
    id: 'filter-only',
    title: 'Filter Without Shuffle',
    category: 'basics',
    difficulty: 'beginner',
    goal: 'Process data using only narrow transformations (filter). No shuffle should occur.',
    successCriteria: [
      {
        id: 'has-filter',
        description: 'Add a filter operation',
        validate: (ops, _shape) => ops.some(op => op.type === 'filter'),
        weight: 50,
      },
      {
        id: 'no-shuffle',
        description: 'No shuffle operations',
        validate: (ops, _shape) => !ops.some(op => ['groupby', 'join', 'repartition', 'orderby', 'distinct'].includes(op.type)),
        weight: 50,
      },
    ],
    hints: [
      { level: 1, text: 'Think about transformations that work on each partition independently.', detailLevel: 'minimal' },
      { level: 2, text: 'Filter is a narrow transformation - each partition can be filtered without communicating with others.', detailLevel: 'moderate' },
      { level: 3, text: 'Add a filter operation and observe the DAG. Notice there are no orange shuffle edges.', detailLevel: 'detailed' },
    ],
  },
  {
    id: 'minimize-shuffle',
    title: 'Minimize Shuffle Data',
    category: 'shuffle',
    difficulty: 'intermediate',
    goal: 'Aggregate data while minimizing shuffle volume. Filter before aggregating.',
    successCriteria: [
      {
        id: 'filter-before-groupby',
        description: 'Filter must come before GroupBy',
        validate: (ops, _shape) => {
          const filterIdx = ops.findIndex(op => op.type === 'filter');
          const groupbyIdx = ops.findIndex(op => op.type === 'groupby');
          return filterIdx >= 0 && groupbyIdx >= 0 && filterIdx < groupbyIdx;
        },
        weight: 60,
      },
      {
        id: 'has-groupby',
        description: 'Include a GroupBy operation',
        validate: (ops, _shape) => ops.some(op => op.type === 'groupby'),
        weight: 40,
      },
    ],
    hints: [
      { level: 1, text: 'What happens to shuffle volume if you reduce data size first?', detailLevel: 'minimal' },
      { level: 2, text: 'Filtering before aggregation reduces the amount of data that needs to shuffle.', detailLevel: 'moderate' },
      { level: 3, text: 'Add a filter with high selectivity (< 0.5), then add a groupby. Observe the shuffle bytes.', detailLevel: 'detailed' },
    ],
  },
  {
    id: 'broadcast-join',
    title: 'Efficient Broadcast Join',
    category: 'joins',
    difficulty: 'intermediate',
    goal: 'Perform a join without shuffle by using broadcast join strategy.',
    successCriteria: [
      {
        id: 'has-join',
        description: 'Add a join operation',
        validate: (ops, _shape) => ops.some(op => op.type === 'join'),
        weight: 30,
      },
      {
        id: 'right-table-small',
        description: 'Right table size < 10 MB',
        validate: (ops, _shape) => {
          const join = ops.find(op => op.type === 'join');
          if (!join) return false;
          const rightRows = (join.params.right_rows as number) || 0;
          const rightSize = rightRows * 100; // Assuming 100 bytes per row
          return rightSize < 10 * 1024 * 1024;
        },
        weight: 40,
      },
      {
        id: 'no-shuffle-join',
        description: 'Join should not shuffle',
        validate: (ops, _shape) => {
          const join = ops.find(op => op.type === 'join');
          if (!join) return false;
          const rightRows = (join.params.right_rows as number) || 0;
          const broadcastThreshold = (join.params.broadcast_threshold as number) || 10485760;
          return (rightRows * 100) < broadcastThreshold;
        },
        weight: 30,
      },
    ],
    hints: [
      { level: 1, text: 'Some joins can avoid shuffle if one side is small enough.', detailLevel: 'minimal' },
      { level: 2, text: 'Broadcast join sends small table to all executors, avoiding shuffle.', detailLevel: 'moderate' },
      { level: 3, text: 'Add a join and set right_rows to a small value (e.g., 10,000). Watch how Spark chooses broadcast.', detailLevel: 'detailed' },
    ],
  },
  {
    id: 'handle-skew',
    title: 'Manage Data Skew',
    category: 'skew',
    difficulty: 'advanced',
    goal: 'Recognize and handle skewed data distribution before aggregation.',
    successCriteria: [
      {
        id: 'detect-skew',
        description: 'Identify skew factor > 2.0',
        validate: (_, shape) => shape.skewFactor > 2.0,
        weight: 30,
      },
      {
        id: 'repartition-before-agg',
        description: 'Repartition before GroupBy',
        validate: (ops, _shape) => {
          const repartitionIdx = ops.findIndex(op => op.type === 'repartition');
          const groupbyIdx = ops.findIndex(op => op.type === 'groupby');
          return repartitionIdx >= 0 && groupbyIdx >= 0 && repartitionIdx < groupbyIdx;
        },
        weight: 40,
      },
      {
        id: 'increase-partitions',
        description: 'Increase partition count',
        validate: (ops, _shape) => {
          const repartition = ops.find(op => op.type === 'repartition');
          return !!repartition && (repartition.params.new_partitions as number) > 200;
        },
        weight: 30,
      },
    ],
    hints: [
      { level: 1, text: 'Skewed data causes some tasks to process much more data than others.', detailLevel: 'minimal' },
      { level: 2, text: 'Repartitioning can redistribute data more evenly before expensive operations.', detailLevel: 'moderate' },
      { level: 3, text: 'Set skew factor > 2.0, add repartition with higher partition count, then groupby.', detailLevel: 'detailed' },
    ],
    initialShape: { skewFactor: 3.0 },
  },
];

export function ChallengeMode({
  isEnabled,
  currentOperations,
  currentShape,
  onChallengeSelect,
  onReset,
  isLearningMode,
}: ChallengeModeProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Calculate progress
  const progress = selectedChallenge
    ? selectedChallenge.successCriteria.reduce((acc, criterion) => {
        const passed = criterion.validate(currentOperations, currentShape);
        return acc + (passed ? criterion.weight : 0);
      }, 0)
    : 0;

  const isComplete = progress === 100;

  // Reset hints when challenge changes
  useEffect(() => {
    setRevealedHints(isLearningMode ? 1 : 0);
  }, [selectedChallenge?.id, isLearningMode]);

  const handleChallengeClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setRevealedHints(isLearningMode ? 1 : 0);
    onChallengeSelect(challenge);
  };

  const handleExit = () => {
    if (selectedChallenge && progress > 0 && progress < 100) {
      setShowExitConfirm(true);
    } else {
      setSelectedChallenge(null);
      onChallengeSelect(null);
    }
  };

  const confirmExit = () => {
    setSelectedChallenge(null);
    setShowExitConfirm(false);
    onChallengeSelect(null);
  };

  const handleReset = () => {
    setRevealedHints(isLearningMode ? 1 : 0);
    onReset();
  };

  const revealNextHint = () => {
    if (selectedChallenge && revealedHints < selectedChallenge.hints.length) {
      setRevealedHints(prev => prev + 1);
    }
  };

  if (!isEnabled) return null;

  // Challenge selector view
  if (!selectedChallenge) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
        data-testid="challenge-selector"
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4">🎯 Choose a Challenge</h3>
        
        {(['basics', 'shuffle', 'joins', 'skew'] as const).map(category => {
          const categoryChallenges = CHALLENGES.filter(c => c.category === category);
          if (categoryChallenges.length === 0) return null;

          return (
            <div key={category} className="mb-6" data-testid={`challenge-category-${category}`}>
              <h4 className="text-sm font-medium text-slate-400 uppercase mb-3">
                {category === 'basics' && '📚 Basics'}
                {category === 'shuffle' && '🔀 Shuffle Optimization'}
                {category === 'joins' && '🔗 Join Strategies'}
                {category === 'skew' && '⚖️ Data Skew'}
              </h4>
              <div className="space-y-2">
                {categoryChallenges.map(challenge => (
                  <button
                    key={challenge.id}
                    onClick={() => handleChallengeClick(challenge)}
                    className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                    data-testid={`challenge-${challenge.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-slate-200">{challenge.title}</div>
                        <div className="text-xs text-slate-400 mt-1">{challenge.goal}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        challenge.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        challenge.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    );
  }

  // Active challenge view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Challenge header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="text-lg font-semibold text-slate-200">{selectedChallenge.title}</h3>
            </div>
            <p className="text-sm text-slate-300 mt-2" data-testid="challenge-goal">
              {selectedChallenge.goal}
            </p>
          </div>
          <button
            onClick={handleExit}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Exit
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div 
            className="h-2 bg-slate-700 rounded-full overflow-hidden"
            data-testid="challenge-progress"
            aria-valuenow={progress}
          >
            <motion.div
              className={`h-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Success criteria */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4" data-testid="challenge-criteria">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Success Criteria</h4>
        <div className="space-y-2">
          {selectedChallenge.successCriteria.map(criterion => {
            const passed = criterion.validate(currentOperations, currentShape);
            return (
              <div key={criterion.id} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  passed ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
                }`}>
                  {passed ? '✓' : '○'}
                </div>
                <span className={`text-sm ${passed ? 'text-slate-300' : 'text-slate-400'}`}>
                  {criterion.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hints */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">💡 Hints</h4>
        <div className="space-y-3">
          {selectedChallenge.hints.slice(0, revealedHints).map((hint, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-slate-400 p-3 bg-slate-700/30 rounded-lg"
              data-testid={`hint-level-${hint.level}`}
            >
              <span className="text-blue-400 font-medium">Hint {hint.level}:</span> {hint.text}
            </motion.div>
          ))}
          
          {revealedHints < selectedChallenge.hints.length && (
            <button
              onClick={revealNextHint}
              className="text-sm text-blue-400 hover:text-blue-300"
              data-testid="reveal-hint-button"
            >
              → Reveal next hint
            </button>
          )}
        </div>
      </div>

      {/* Success message */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center"
            data-testid="challenge-success"
          >
            <div className="text-4xl mb-2">🎉</div>
            <h4 className="text-lg font-semibold text-green-400 mb-1">Challenge Complete!</h4>
            <p className="text-sm text-green-300/80">
              You&apos;ve successfully completed this challenge. Try another one!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
        data-testid="reset-challenge"
      >
        Reset Challenge
      </button>

      {/* Exit confirmation dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md mx-4"
              role="dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-200 mb-2">Exit Challenge?</h3>
              <p className="text-sm text-slate-400 mb-4">
                Your progress will be lost if you exit now. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ChallengeMode;
