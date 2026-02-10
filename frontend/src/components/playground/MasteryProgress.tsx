/**
 * Mastery Progress Dashboard
 * 
 * Visualizes learning progress across all Spark concepts (Khan Academy pattern).
 * Shows mastered concepts, current progress, and suggested next steps.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Lock, TrendingUp, Award, Target } from 'lucide-react';
import {
  getMasteryTracker,
  type MasteryConcept,
  type ConceptMastery,
  CONCEPT_METADATA,
  MASTERY_THRESHOLDS,
} from '@/lib/mastery-tracker';

interface MasteryProgressProps {
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Callback when user wants to practice a concept */
  onPracticeConcept?: (concept: MasteryConcept) => void;
}

export function MasteryProgress({
  compact = false,
  onPracticeConcept,
}: MasteryProgressProps) {
  const [tracker] = useState(() => getMasteryTracker());
  const [state, setState] = useState(() => tracker.getState());
  const [expandedCategory, setExpandedCategory] = useState<string | null>('fundamental');

  // Refresh state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(tracker.getState());
    }, 1000);
    return () => clearInterval(interval);
  }, [tracker]);

  const totalConcepts = Object.keys(CONCEPT_METADATA).length;
  const masteredCount = state.totalMastered;
  const progressPercent = Math.round((masteredCount / totalConcepts) * 100);

  // Group concepts by category
  const conceptsByCategory = {
    fundamental: [] as MasteryConcept[],
    intermediate: [] as MasteryConcept[],
    advanced: [] as MasteryConcept[],
  };

  Object.keys(CONCEPT_METADATA).forEach((concept) => {
    const metadata = CONCEPT_METADATA[concept as MasteryConcept];
    conceptsByCategory[metadata.category].push(concept as MasteryConcept);
  });

  const nextConcept = tracker.getNextConcept();

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
        <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Spark Mastery: {masteredCount}/{totalConcepts}
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {progressPercent}%
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
            Your Spark Mastery Journey
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {masteredCount} of {totalConcepts} concepts mastered
          </p>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
            {progressPercent}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div>
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Next Concept Suggestion */}
      {nextConcept && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Recommended Next: {CONCEPT_METADATA[nextConcept].title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {CONCEPT_METADATA[nextConcept].description}
              </div>
              {onPracticeConcept && (
                <button
                  onClick={() => onPracticeConcept(nextConcept)}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Practice Now
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Concepts by Category */}
      {(['fundamental', 'intermediate', 'advanced'] as const).map((category) => {
        const concepts = conceptsByCategory[category];
        const masteredInCategory = concepts.filter((c) => tracker.isMastered(c)).length;
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
              className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {category} Concepts
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {masteredInCategory} of {concepts.length} mastered
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(masteredInCategory / concepts.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-3">
                {concepts.map((concept) => {
                  const conceptState = state.concepts[concept];
                  const metadata = CONCEPT_METADATA[concept];
                  const progress = tracker.getProgress(concept);
                  const threshold = MASTERY_THRESHOLDS[concept];
                  const isLocked =
                    metadata.prerequisites &&
                    !metadata.prerequisites.every((p) => tracker.isMastered(p));

                  return (
                    <ConceptCard
                      key={concept}
                      concept={concept}
                      state={conceptState}
                      progress={progress}
                      threshold={threshold}
                      isLocked={!!isLocked}
                      onPractice={onPracticeConcept}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ConceptCardProps {
  concept: MasteryConcept;
  state: ConceptMastery;
  progress: number;
  threshold: number;
  isLocked: boolean;
  onPractice?: (concept: MasteryConcept) => void;
}

function ConceptCard({
  concept,
  state,
  progress,
  threshold,
  isLocked,
  onPractice,
}: ConceptCardProps) {
  const metadata = CONCEPT_METADATA[concept];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`p-4 rounded-lg border ${
        state.isMastered
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          : isLocked
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {state.isMastered ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : isLocked ? (
            <Lock className="w-5 h-5 text-gray-400" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {metadata.title}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {metadata.description}
          </div>

          {!isLocked && !state.isMastered && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>
                  Progress: {state.successCount}/{threshold}
                </span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {state.isMastered && state.lastPracticed && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-2">
              ✓ Mastered on {new Date(state.lastPracticed).toLocaleDateString()}
            </div>
          )}

          {isLocked && metadata.prerequisites && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              🔒 Requires: {metadata.prerequisites.map((p) => CONCEPT_METADATA[p].title).join(', ')}
            </div>
          )}

          {metadata.unlocksFeatures && state.isMastered && (
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              🎁 Unlocked: {metadata.unlocksFeatures.join(', ')}
            </div>
          )}

          {onPractice && !isLocked && !state.isMastered && (
            <button
              onClick={() => onPractice(concept)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Practice this concept →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default MasteryProgress;
