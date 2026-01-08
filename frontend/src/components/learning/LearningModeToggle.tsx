'use client';

/**
 * Learning Mode Toggle Component
 * 
 * Allows users to switch between Expert and Learning modes.
 * Learning mode shows additional explanations for beginners.
 */

import { useLearningMode } from '@/lib/LearningModeContext';

interface LearningModeToggleProps {
  className?: string;
}

export function LearningModeToggle({ className = '' }: LearningModeToggleProps) {
  const { mode, toggleMode } = useLearningMode();

  return (
    <button
      onClick={toggleMode}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${mode === 'learning' 
          ? 'bg-purple-600 text-white hover:bg-purple-700' 
          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}
        ${className}
      `}
      aria-label={mode === 'learning' ? 'Learning Mode' : 'Expert Mode'}
    >
      <span className="text-base">
        {mode === 'learning' ? '📚' : '⚡'}
      </span>
      <span>
        {mode === 'learning' ? 'Learning Mode' : 'Expert Mode'}
      </span>
    </button>
  );
}

/**
 * Learning Hint Component
 * 
 * Shows additional explanations only in learning mode.
 */
interface LearningHintProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function LearningHint({ children, title = 'Why this matters', className = '' }: LearningHintProps) {
  const { isLearningMode } = useLearningMode();

  if (!isLearningMode) return null;

  return (
    <div 
      data-learning-hint
      className={`
        mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg
        ${className}
      `}
    >
      <div className="text-xs text-purple-400 uppercase tracking-wide mb-1 font-medium">
        {title}
      </div>
      <div className="text-sm text-slate-300">
        {children}
      </div>
    </div>
  );
}

export default LearningModeToggle;
