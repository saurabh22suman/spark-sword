'use client';

/**
 * Learning Mode Context
 * 
 * Provides global state for learning mode toggle.
 * Per work-ahead.md:
 * - Experts should never feel slowed
 * - Beginners should never feel lost
 * 
 * Default is Expert Mode (concise).
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LearningMode = 'expert' | 'learning';

interface LearningModeContextValue {
  mode: LearningMode;
  toggleMode: () => void;
  isLearningMode: boolean;
}

const LearningModeContext = createContext<LearningModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'preprabbit-learning-mode';

export function LearningModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LearningMode>('expert');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'learning' || saved === 'expert') {
      setMode(saved);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode, isHydrated]);

  const toggleMode = () => {
    setMode(prev => prev === 'expert' ? 'learning' : 'expert');
  };

  return (
    <LearningModeContext.Provider value={{ mode, toggleMode, isLearningMode: mode === 'learning' }}>
      {children}
    </LearningModeContext.Provider>
  );
}

export function useLearningMode() {
  const context = useContext(LearningModeContext);
  if (context === undefined) {
    throw new Error('useLearningMode must be used within a LearningModeProvider');
  }
  return context;
}

export default LearningModeContext;
