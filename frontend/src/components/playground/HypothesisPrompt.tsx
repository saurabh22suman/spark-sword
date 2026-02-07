'use client';

/**
 * Hypothesis Prompt Component
 * 
 * Per scenario-to-playground-bridge-spec.md Section 5:
 * - Shows before any simulation in scenario mode
 * - Requires hypothesis selection before proceeding
 * - Establishes learning intent
 */

import { motion, AnimatePresence } from 'framer-motion';
import { HYPOTHESIS_OPTIONS, useScenarioBridge } from './ScenarioBridge';

interface HypothesisPromptProps {
  scenarioId: string;
  onHypothesisSelected: (hypothesis: string) => void;
  className?: string;
}

export function HypothesisPrompt({ 
  scenarioId, 
  onHypothesisSelected,
  className = '' 
}: HypothesisPromptProps) {
  const { selectedHypothesis } = useScenarioBridge();
  
  const options = HYPOTHESIS_OPTIONS[scenarioId] || HYPOTHESIS_OPTIONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 
                  rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span className="text-xl">🤔</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Before you experiment...
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            What do you think will happen?
          </p>
        </div>
      </div>

      {/* Prompt */}
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Select a hypothesis about what will change when you adjust the data shape:
      </p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onHypothesisSelected(option.label)}
            className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3
                       ${selectedHypothesis === option.label
                         ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 shadow-md'
                         : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                       }`}
          >
            <span className="text-xl flex-shrink-0">{option.icon}</span>
            <span className={`text-sm ${selectedHypothesis === option.label 
              ? 'text-blue-900 dark:text-blue-100 font-medium' 
              : 'text-gray-700 dark:text-gray-300'}`}>
              {option.label}
            </span>
            {selectedHypothesis === option.label && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto text-blue-500"
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Encouragement text */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 text-center">
        There&apos;s no wrong answer — this helps you learn by testing your intuition!
      </p>
    </motion.div>
  );
}

// ============================================================================
// SCENARIO HEADER COMPONENT
// ============================================================================

interface ScenarioHeaderProps {
  scenarioTitle: string;
  learningGoal: string;
  selectedHypothesis: string | null;
  onReset: () => void;
  onExit: () => void;
  className?: string;
}

export function ScenarioHeader({
  scenarioTitle,
  learningGoal,
  selectedHypothesis,
  onReset,
  onExit,
  className = '',
}: ScenarioHeaderProps) {
  return (
    <div className={`bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 
                     rounded-r-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Scenario Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
                           text-xs font-medium bg-amber-100 dark:bg-amber-800 
                           text-amber-800 dark:text-amber-200">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scenario Mode
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {scenarioTitle}
            </span>
          </div>

          {/* Learning Goal */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="font-medium">Goal:</span> {learningGoal}
          </p>

          {/* Selected Hypothesis */}
          {selectedHypothesis && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-500">Your hypothesis:</span>
              <span className="italic text-blue-600 dark:text-blue-400">
                &ldquo;{selectedHypothesis}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300
                       hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded-md transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            Exit Scenario
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXIT WARNING MODAL
// ============================================================================

interface ExitWarningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitWarningModal({ isOpen, onConfirm, onCancel }: ExitWarningModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 
                              flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Exit Scenario Mode?
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Leaving scenario mode will switch to free exploration. Your current 
              hypothesis and progress won&apos;t be saved.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Stay in Scenario
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 
                           hover:bg-amber-600 rounded-lg transition-colors"
              >
                Exit to Free Mode
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
