/**
 * Learning System Type Definitions
 * 
 * Types for Brilliant-style interactive learning components
 */

import { ReactNode } from 'react';

/**
 * Prediction option for multiple choice challenges
 */
export interface PredictionOption {
  id: string;
  label: string;
  description?: string;
  visual?: ReactNode;
  isCorrect?: boolean;  // Only used internally after submission
}

/**
 * Prediction challenge configuration
 */
export interface PredictionChallenge {
  id: string;
  question: string;
  context?: string;
  options: PredictionOption[];
  correctAnswerId: string;
  explanation: string;
  visualDemo?: ReactNode;
  relatedConcepts?: string[];
  commonMisconception?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Concept reveal step for progressive disclosure
 */
export interface ConceptStep {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  visual?: ReactNode;
  interactiveDemo?: ReactNode;
  keyTakeaway?: string;
}

/**
 * Myth for myth-busting challenges
 */
export interface Myth {
  id: string;
  statement: string;
  category?: string;
  truthValue: 'true' | 'false' | 'depends';
  explanation: string;
  counterexample?: string;
  proofDemo?: ReactNode;
  relatedScenarios?: string[];
  relatedTutorials?: string[];
}

/**
 * Tutorial content structure
 */
export interface TutorialContent {
  id: string;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningOutcome: string;
  prerequisites?: string[];
  
  // Brilliant-style structure
  setup?: {
    context: string;
    motivation: string;
  };
  challenge?: PredictionChallenge;
  concepts?: ConceptStep[];
  interactiveComponent?: ReactNode;
  reflection?: {
    question: string;
    guidedAnswer?: string;
  };
  nextSteps?: string[];
}

/**
 * User progress for a specific tutorial/concept
 */
export interface LearningProgress {
  tutorialId: string;
  userId: string;
  started: boolean;
  completed: boolean;
  challengeAttempts: number;
  challengeCorrect: boolean;
  conceptsRevealed: string[];
  reflectionSubmitted: boolean;
  timeSpentSeconds: number;
  lastAccessedAt: string;
}

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'tutorials' | 'challenges' | 'scenarios' | 'streak' | 'mastery';
  requirement: {
    type: string;
    count?: number;
    specific?: string[];
  };
  unlockedAt?: string;
}

/**
 * Hint for progressive help system
 */
export interface Hint {
  level: number;
  text: string;
  cost?: number;  // Optional point cost for using hint
}

/**
 * Feedback type for user predictions
 */
export type FeedbackType = 'correct' | 'incorrect' | 'partial' | 'try-again';

/**
 * Learning mode settings
 */
export interface LearningMode {
  showHints: boolean;
  allowMultipleAttempts: boolean;
  showExplanationAfterCorrect: boolean;
  enableCelebrations: boolean;
  progressiveHintReveal: boolean;
}
