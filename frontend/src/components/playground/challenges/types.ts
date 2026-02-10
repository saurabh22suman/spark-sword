/**
 * Challenge Mode Types
 * 
 * Defines the structure for scaffolded learning challenges
 * in the DataFrame Playground.
 */

import type { Operation } from '../OperationsBuilder';
import type { DataShape } from '../DataShapePanel';

export type ChallengeCategory = 'basics' | 'shuffle' | 'joins' | 'skew' | 'optimization';

export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Success criteria for a challenge
 */
export interface SuccessCriteria {
  type: 'operation_count' | 'shuffle_bytes' | 'operation_sequence' | 'partition_count' | 'custom';
  description: string;
  validator: (operations: Operation[], shape: DataShape, simulationResult?: any) => boolean;
}

/**
 * Progressive hint system
 */
export interface ChallengeHint {
  level: number; // 1 = gentle nudge, 2 = more specific, 3 = very specific
  text: string;
  learningModeText?: string; // More detailed version for learning mode
}

/**
 * A single challenge definition
 */
export interface Challenge {
  id: string;
  title: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  
  // The goal statement
  goal: string;
  
  // What the user should learn
  learningObjective: string;
  
  // Initial state (optional)
  initialShape?: Partial<DataShape>;
  initialOperations?: Operation[];
  
  // Success criteria
  successCriteria: SuccessCriteria[];
  
  // Progressive hints
  hints: ChallengeHint[];
  
  // Explanation shown after success
  successExplanation: string;
  
  // Estimated time to complete (minutes)
  estimatedMinutes: number;
}

/**
 * Challenge progress tracking
 */
export interface ChallengeProgress {
  challengeId: string;
  startedAt: number;
  completedAt?: number;
  hintsRevealed: number;
  attempts: number;
  completed: boolean;
}

/**
 * Active challenge state
 */
export interface ActiveChallenge {
  challenge: Challenge;
  progress: ChallengeProgress;
  currentHintLevel: number;
  partiallyComplete: boolean;
  completionPercentage: number;
}
