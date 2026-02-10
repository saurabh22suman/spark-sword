/**
 * Worked Example Component
 * 
 * Displays step-by-step solutions showing expert problem-solving process.
 * Khan Academy pattern: Show complete solution with explanations,
 * then offer "Your Turn" variant for practice.
 * 
 * Features:
 * - Step-by-step navigation
 * - Visual highlighting of changes
 * - Spark reasoning explanations
 * - Trade-off discussions
 * - Practice variant
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkedExample, WorkedExampleStep } from '@/data/worked-examples';

interface WorkedExampleProps {
  example: WorkedExample;
  onTryYourTurn?: () => void;
  onClose?: () => void;
}

export default function WorkedExampleComponent({ example, onTryYourTurn, onClose }: WorkedExampleProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showKeyTakeaways, setShowKeyTakeaways] = useState(false);

  const step = currentStep === -1 ? null : example.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === example.steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      setShowKeyTakeaways(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (showKeyTakeaways) {
      setShowKeyTakeaways(false);
    } else {
      setCurrentStep(prev => Math.max(0, prev - 1));
    }
  };

  const handleJumpToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setShowKeyTakeaways(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basics': return '📚';
      case 'joins': return '🔗';
      case 'shuffle': return '🔀';
      case 'skew': return '⚖️';
      case 'performance': return '⚡';
      default: return '📖';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{getCategoryIcon(example.category)}</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {example.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(example.difficulty)}`}>
                {example.difficulty}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {example.category}
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close worked example"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Problem Statement */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Problem</p>
          <p className="text-gray-700 dark:text-gray-300">{example.problemStatement}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {showKeyTakeaways ? 'Key Takeaways' : `Step ${currentStep + 1} of ${example.steps.length}`}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {!showKeyTakeaways && step ? step.title : ''}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: showKeyTakeaways ? '100%' : `${((currentStep + 1) / example.steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto">
        {example.steps.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleJumpToStep(idx)}
            className={`
              flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all
              ${idx === currentStep && !showKeyTakeaways
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
              ${idx < currentStep ? 'opacity-50' : ''}
            `}
            aria-label={`Jump to step ${idx + 1}: ${s.title}`}
          >
            {idx + 1}
          </button>
        ))}
        <button
          onClick={() => setShowKeyTakeaways(true)}
          className={`
            flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all
            ${showKeyTakeaways
              ? 'bg-green-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
          aria-label="View key takeaways"
        >
          ✓
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          {showKeyTakeaways ? (
            <motion.div
              key="takeaways"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  🎯 Key Takeaways
                </h3>
                <ul className="space-y-3">
                  {example.keyTakeaways.map((takeaway, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 pt-0.5">{takeaway}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Your Turn Variant */}
              {example.yourTurnVariant && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎓</span>
                    <h4 className="text-lg font-bold text-purple-900 dark:text-purple-200">
                      Your Turn: {example.yourTurnVariant.title}
                    </h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {example.yourTurnVariant.problemStatement}
                  </p>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">💡 Hint:</p>
                    <p className="text-gray-700 dark:text-gray-300">{example.yourTurnVariant.hint}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">✓ Success Criteria:</p>
                    <p className="text-gray-700 dark:text-gray-300">{example.yourTurnVariant.successCriteria}</p>
                  </div>
                  {onTryYourTurn && (
                    <button
                      onClick={onTryYourTurn}
                      className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Try This Challenge in Playground →
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : step ? (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Step Title */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {step.stepNumber}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Action Taken */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  🛠️ Action
                </p>
                <p className="text-gray-900 dark:text-gray-100">{step.action}</p>
              </div>

              {/* What Changed */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  📊 What Changed
                </p>
                <p className="text-gray-900 dark:text-gray-100">{step.whatChanged}</p>
              </div>

              {/* Spark Reasoning */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border-l-4 border-purple-500">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  🧠 Spark's Reasoning
                </p>
                <p className="text-gray-900 dark:text-gray-100">{step.sparkReasoning}</p>
              </div>

              {/* Trade-off (if present) */}
              {step.tradeOff && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border-l-4 border-amber-500">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                    ⚖️ Trade-off
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">{step.tradeOff}</p>
                </div>
              )}

              {/* Metrics Highlight */}
              {step.highlightMetric && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                    📈 Key Metric to Watch
                  </p>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">
                    {step.highlightMetric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={isFirst && !showKeyTakeaways}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {showKeyTakeaways ? 'Review complete!' : `${currentStep + 1} / ${example.steps.length}`}
        </div>

        <button
          onClick={handleNext}
          disabled={showKeyTakeaways && !example.yourTurnVariant}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showKeyTakeaways ? 'Done' : isLast ? 'See Takeaways' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
