/**
 * Mastery Tracking System
 * 
 * Tracks user progress across Spark concepts (Khan Academy pattern).
 * Evidence-based progression with localStorage persistence.
 * 
 * Core Principles:
 * - Track concept mastery through actual actions (not time-based)
 * - Provide clear, actionable feedback on progress
 * - Unlock advanced features based on demonstrated understanding
 * - Store locally with optional backend sync
 */

'use client';

/**
 * Mastery Concepts
 * Each concept requires multiple successful applications to master
 */
export type MasteryConcept =
  | 'understandsSelectivity'      // Filter impact prediction
  | 'understandsBroadcast'       // Broadcast threshold decisions
  | 'understandsSkew'            // Skew recognition and mitigation
  | 'understandsPartitioning'    // Optimal partition count selection
  | 'understandsCaching'         // Cache point identification
  | 'understandsWindowFunctions' // Window operation optimization
  | 'understandsAggregation'     // GroupBy optimization
  | 'understandsJoinStrategies'  // Join type selection
  | 'understandsShuffleBoundaries' // Shuffle trigger identification  
  | 'understandsCoalesce'        // Coalesce vs repartition distinction
  | 'understandsFilterPushdown'  // Early filtering application
  | 'understandsOrderBy'         // OrderBy shuffle minimization
  | 'understandsSkewMitigation'; // Salting application

/**
 * Mastery thresholds - number of successful demonstrations required
 */
export const MASTERY_THRESHOLDS: Record<MasteryConcept, number> = {
  understandsSelectivity: 3,
  understandsBroadcast: 3,
  understandsSkew: 2,
  understandsPartitioning: 3,
  understandsCaching: 2,
  understandsWindowFunctions: 2,
  understandsAggregation: 3,
  understandsJoinStrategies: 3,
  understandsShuffleBoundaries: 3,
  understandsCoalesce: 2,
  understandsFilterPushdown: 2,
  understandsOrderBy: 2,
  understandsSkewMitigation: 2,
};

/**
 * Concept metadata for display
 */
export interface ConceptMetadata {
  id: MasteryConcept;
  title: string;
  description: string;
  category: 'fundamental' | 'intermediate' | 'advanced';
  prerequisites?: MasteryConcept[];
  unlocksFeatures?: string[];
}

export const CONCEPT_METADATA: Record<MasteryConcept, ConceptMetadata> = {
  understandsSelectivity: {
    id: 'understandsSelectivity',
    title: 'Filter Selectivity',
    description: 'Predict how much data filters will reduce',
    category: 'fundamental',
    unlocksFeatures: ['advanced-filters'],
  },
  understandsBroadcast: {
    id: 'understandsBroadcast',
    title: 'Broadcast Joins',
    description: 'Know when Spark will broadcast vs shuffle join',
    category: 'fundamental',
    unlocksFeatures: ['broadcast-tuning'],
  },
  understandsSkew: {
    id: 'understandsSkew',
    title: 'Data Skew Recognition',
    description: 'Identify when partitions are imbalanced',
    category: 'fundamental',
  },
  understandsPartitioning: {
    id: 'understandsPartitioning',
    title: 'Partition Sizing',
    description: 'Choose optimal partition count for workload',
    category: 'fundamental',
    unlocksFeatures: ['partition-tuning'],
  },
  understandsCaching: {
    id: 'understandsCaching',
    title: 'Strategic Caching',
    description: 'Identify beneficial cache points',
    category: 'intermediate',
    prerequisites: ['understandsSelectivity'],
    unlocksFeatures: ['cache-hints'],
  },
  understandsWindowFunctions: {
    id: 'understandsWindowFunctions',
    title: 'Window Operations',
    description: 'Optimize windowing and ranking operations',
    category: 'intermediate',
    prerequisites: ['understandsPartitioning'],
  },
  understandsAggregation: {
    id: 'understandsAggregation',
    title: 'Aggregation Optimization',
    description: 'Optimize groupBy and aggregation patterns',
    category: 'fundamental',
  },
  understandsJoinStrategies: {
    id: 'understandsJoinStrategies',
    title: 'Join Strategy Selection',
    description: 'Choose the right join type for your data',
    category: 'intermediate',
    prerequisites: ['understandsBroadcast'],
    unlocksFeatures: ['join-strategy-hints'],
  },
  understandsShuffleBoundaries: {
    id: 'understandsShuffleBoundaries',
    title: 'Shuffle Boundaries',
    description: 'Identify which operations trigger shuffles',
    category: 'fundamental',
  },
  understandsCoalesce: {
    id: 'understandsCoalesce',
    title: 'Coalesce vs Repartition',
    description: 'Know the difference and when to use each',
    category: 'intermediate',
    prerequisites: ['understandsPartitioning',  'understandsShuffleBoundaries'],
  },
  understandsFilterPushdown: {
    id: 'understandsFilterPushdown',
    title: 'Filter Pushdown',
    description: 'Apply filters as early as possible',
    category: 'fundamental',
    prerequisites: ['understandsSelectivity'],
  },
  understandsOrderBy: {
    id: 'understandsOrderBy',
    title: 'OrderBy Optimization',
    description: 'Minimize shuffle cost of sorting',
    category: 'intermediate',
    prerequisites: ['understandsShuffleBoundaries'],
  },
  understandsSkewMitigation: {
    id: 'understandsSkewMitigation',
    title: 'Skew Mitigation',
    description: 'Apply techniques like salting to fix skew',
    category: 'advanced',
    prerequisites: ['understandsSkew', 'understandsPartitioning'],
    unlocksFeatures: ['skew-mitigation-wizard'],
  },
};

/**
 * Mastery state for a single concept
 */
export interface ConceptMastery {
  concept: MasteryConcept;
  successCount: number;
  totalAttempts: number;
  lastPracticed?: Date;
  isMastered: boolean;
  evidence: MasteryEvidence[];
}

/**
 * Evidence of mastery - specific actions demonstrating understanding
 */
export interface MasteryEvidence {
  timestamp: Date;
  action: string; // e.g., "Correctly predicted broadcast join"
  context?: Record<string, any>; // Additional details
  wasCorrect: boolean;
}

/**
 * Complete mastery state
 */
export interface MasteryState {
  concepts: Record<MasteryConcept, ConceptMastery>;
  totalMastered: number;
  lastUpdated: Date;
}

/**
 * Mastery Tracker Class
 */
export class MasteryTracker {
  private state: MasteryState;
  private storageKey = 'spark-sword-mastery';

  constructor() {
    this.state = this.loadFromStorage() || this.createInitialState();
  }

  /**
   * Create initial mastery state with all concepts unmastered
   */
  private createInitialState(): MasteryState {
    const concepts: Record<MasteryConcept, ConceptMastery> = {} as any;
    
    Object.keys(MASTERY_THRESHOLDS).forEach((concept) => {
      concepts[concept as MasteryConcept] = {
        concept: concept as MasteryConcept,
        successCount: 0,
        totalAttempts: 0,
        isMastered: false,
        evidence: [],
      };
    });

    return {
      concepts,
      totalMastered: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Record a mastery attempt
   */
  recordAttempt(
    concept: MasteryConcept,
    wasCorrect: boolean,
    action: string,
    context?: Record<string, any>
  ): void {
    const conceptState = this.state.concepts[concept];
    
    conceptState.totalAttempts++;
    if (wasCorrect) {
      conceptState.successCount++;
    }

    // Add evidence
    conceptState.evidence.push({
      timestamp: new Date(),
      action,
      context,
      wasCorrect,
    });

    // Keep only last 10 evidence items
    if (conceptState.evidence.length > 10) {
      conceptState.evidence = conceptState.evidence.slice(-10);
    }

    // Update mastery status
    const threshold = MASTERY_THRESHOLDS[concept];
    conceptState.isMastered = conceptState.successCount >= threshold;
    conceptState.lastPracticed = new Date();

    // Update total mastered count
    this.state.totalMastered = Object.values(this.state.concepts).filter(
      (c) => c.isMastered
    ).length;

    this.state.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Check if concept is mastered
   */
  isMastered(concept: MasteryConcept): boolean {
    return this.state.concepts[concept].isMastered;
  }

  /**
   * Get progress for a concept (0-1)
   */
  getProgress(concept: MasteryConcept): number {
    const conceptState = this.state.concepts[concept];
    const threshold = MASTERY_THRESHOLDS[concept];
    return Math.min(conceptState.successCount / threshold, 1);
  }

  /**
   * Get all mastered concepts
   */
  getMasteredConcepts(): MasteryConcept[] {
    return Object.values(this.state.concepts)
      .filter((c) => c.isMastered)
      .map((c) => c.concept);
  }

  /**
   * Get concepts available to learn (prerequisites met)
   */
  getAvailableConcepts(): MasteryConcept[] {
    return Object.keys(CONCEPT_METADATA).filter((concept) => {
      const metadata = CONCEPT_METADATA[concept as MasteryConcept];
      if (!metadata.prerequisites) return true;

      return metadata.prerequisites.every((prereq) => this.isMastered(prereq));
    }) as MasteryConcept[];
  }

  /**
   * Get next concept to learn
   */
  getNextConcept(): MasteryConcept | null {
    const available = this.getAvailableConcepts();
    const notMastered = available.filter((c) => !this.isMastered(c));

    if (notMastered.length === 0) return null;

    // Sort by category priority and progress
    notMastered.sort((a, b) => {
      const categoryOrder = { fundamental: 0, intermediate: 1, advanced: 2 };
      const orderA = categoryOrder[CONCEPT_METADATA[a].category];
      const orderB = categoryOrder[CONCEPT_METADATA[b].category];

      if (orderA !== orderB) return orderA - orderB;

      // Within same category, prefer partially completed
      return this.getProgress(b) - this.getProgress(a);
    });

    return notMastered[0];
  }

  /**
   * Get full mastery state
   */
  getState(): MasteryState {
    return this.state;
  }

  /**
   * Reset all progress (for testing or new start)
   */
  reset(): void {
    this.state = this.createInitialState();
    this.saveToStorage();
  }

  /**
   * Export progress for sharing/backup
   */
  export(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Import progress from backup
   */
  import(data: string): void {
    try {
      const imported = JSON.parse(data);
      // Convert date strings to Date objects
      imported.lastUpdated = new Date(imported.lastUpdated);
      Object.values(imported.concepts).forEach((concept: any) => {
        if (concept.lastPracticed) {
          concept.lastPracticed = new Date(concept.lastPracticed);
        }
        concept.evidence = concept.evidence.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
      });
      this.state = imported;
      this.saveToStorage();
    } catch (error) {
      console.error('Failed to import mastery data:', error);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, this.export());
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): MasteryState | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
}

// Singleton instance
let trackerInstance: MasteryTracker | null = null;

/**
 * Get or create mastery tracker instance
 */
export function getMasteryTracker(): MasteryTracker {
  if (!trackerInstance) {
    trackerInstance = new MasteryTracker();
  }
  return trackerInstance;
}
