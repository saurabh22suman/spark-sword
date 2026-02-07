'use client';

/**
 * Scenario → Playground Bridge Context
 * 
 * Per scenario-to-playground-bridge-spec.md:
 * - Controlled handoff from narrative → experimentation
 * - Preserves learning intent
 * - Prevents random tinkering
 * - Encourages hypothesis-driven exploration
 * 
 * State Types:
 * - Locked: Scenario name, context, primary learning goal, initial operations
 * - Editable: Data size, partition count, skew factor (within bounds)
 * - Disabled: Configuration tuning, arbitrary operation insertion
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { type DataShape } from '@/components/playground/DataShapePanel';
import { type Operation } from '@/components/playground/OperationsBuilder';

// ============================================================================
// TYPES
// ============================================================================

export interface ScenarioContext {
  id: string;
  title: string;
  story: string;
  learningGoal: string;
  sparkConcepts: string[];
  
  // Initial state (baseline for reset)
  baselineShape: DataShape;
  baselineOperations: Operation[];
  
  // Allowed experiments
  allowedExperiments: AllowedExperiment[];
  
  // Bounds for editable values
  bounds: {
    minRows?: number;
    maxRows?: number;
    minPartitions?: number;
    maxPartitions?: number;
    minSkew?: number;
    maxSkew?: number;
  };
}

export type AllowedExperiment = 
  | 'adjust_skew'
  | 'change_partitions'
  | 'change_data_size'
  | 'toggle_cache'
  | 'adjust_broadcast_threshold';

export interface ScenarioBridgeState {
  // Whether we're in scenario mode
  isScenarioMode: boolean;
  
  // The active scenario context (null if free mode)
  scenario: ScenarioContext | null;
  
  // Whether hypothesis has been selected
  hypothesisSelected: boolean;
  selectedHypothesis: string | null;
  
  // Current modifications from baseline
  modifications: {
    shape: Partial<DataShape>;
    experimentsUsed: AllowedExperiment[];
  };
}

interface ScenarioBridgeContextType extends ScenarioBridgeState {
  // Actions
  enterScenarioMode: (scenario: ScenarioContext) => void;
  exitScenarioMode: () => void;
  resetToBaseline: () => void;
  selectHypothesis: (hypothesis: string) => void;
  
  // Experiment tracking
  recordExperiment: (experiment: AllowedExperiment) => void;
  isExperimentAllowed: (experiment: AllowedExperiment) => boolean;
  canModifyShape: (field: keyof DataShape) => boolean;
  
  // Value bounds
  getValueBounds: (field: 'rows' | 'partitions' | 'skew') => { min: number; max: number };
}

// ============================================================================
// HYPOTHESIS OPTIONS
// ============================================================================

export const HYPOTHESIS_OPTIONS: Record<string, { label: string; icon: string }[]> = {
  simple_filter: [
    { label: 'Reducing data will speed up the stage', icon: '📉' },
    { label: 'Filter has no effect on performance', icon: '🔄' },
    { label: 'More partitions will help', icon: '📊' },
  ],
  groupby_aggregation: [
    { label: 'Reducing partitions will reduce shuffle', icon: '📉' },
    { label: 'More partitions will help parallelism', icon: '📈' },
    { label: 'Skew will make the shuffle worse', icon: '⚠️' },
  ],
  join_without_broadcast: [
    { label: 'Smaller right table enables broadcast join', icon: '📡' },
    { label: 'More partitions will speed up shuffle', icon: '📊' },
    { label: 'The join strategy won\'t change', icon: '🔄' },
  ],
  skewed_join_key: [
    { label: 'Reducing skew will balance task durations', icon: '⚖️' },
    { label: 'More partitions will fix the straggler', icon: '📊' },
    { label: 'Skew affects shuffle size, not duration', icon: '🔄' },
  ],
  too_many_output_files: [
    { label: 'Fewer partitions means fewer files', icon: '📂' },
    { label: 'Coalesce before write will help', icon: '🗜️' },
    { label: 'File count doesn\'t affect performance', icon: '🔄' },
  ],
  default: [
    { label: 'Changing the data shape will change Spark\'s behavior', icon: '🔄' },
    { label: 'The execution plan will stay the same', icon: '📋' },
    { label: 'I want to see what happens', icon: '🔬' },
  ],
};

// ============================================================================
// CONTEXT
// ============================================================================

const ScenarioBridgeContext = createContext<ScenarioBridgeContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function ScenarioBridgeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScenarioBridgeState>({
    isScenarioMode: false,
    scenario: null,
    hypothesisSelected: false,
    selectedHypothesis: null,
    modifications: {
      shape: {},
      experimentsUsed: [],
    },
  });

  const enterScenarioMode = useCallback((scenario: ScenarioContext) => {
    setState({
      isScenarioMode: true,
      scenario,
      hypothesisSelected: false,
      selectedHypothesis: null,
      modifications: {
        shape: {},
        experimentsUsed: [],
      },
    });
  }, []);

  const exitScenarioMode = useCallback(() => {
    setState({
      isScenarioMode: false,
      scenario: null,
      hypothesisSelected: false,
      selectedHypothesis: null,
      modifications: {
        shape: {},
        experimentsUsed: [],
      },
    });
  }, []);

  const resetToBaseline = useCallback(() => {
    setState(prev => ({
      ...prev,
      hypothesisSelected: false,
      selectedHypothesis: null,
      modifications: {
        shape: {},
        experimentsUsed: [],
      },
    }));
  }, []);

  const selectHypothesis = useCallback((hypothesis: string) => {
    setState(prev => ({
      ...prev,
      hypothesisSelected: true,
      selectedHypothesis: hypothesis,
    }));
  }, []);

  const recordExperiment = useCallback((experiment: AllowedExperiment) => {
    setState(prev => ({
      ...prev,
      modifications: {
        ...prev.modifications,
        experimentsUsed: prev.modifications.experimentsUsed.includes(experiment)
          ? prev.modifications.experimentsUsed
          : [...prev.modifications.experimentsUsed, experiment],
      },
    }));
  }, []);

  const isExperimentAllowed = useCallback((experiment: AllowedExperiment): boolean => {
    if (!state.isScenarioMode || !state.scenario) return true;
    return state.scenario.allowedExperiments.includes(experiment);
  }, [state.isScenarioMode, state.scenario]);

  const canModifyShape = useCallback((field: keyof DataShape): boolean => {
    if (!state.isScenarioMode) return true;
    
    const fieldToExperiment: Record<string, AllowedExperiment> = {
      rows: 'change_data_size',
      totalSizeBytes: 'change_data_size',
      partitions: 'change_partitions',
      skewFactor: 'adjust_skew',
    };
    
    const experiment = fieldToExperiment[field];
    if (!experiment) return false;
    
    return isExperimentAllowed(experiment);
  }, [state.isScenarioMode, isExperimentAllowed]);

  const getValueBounds = useCallback((field: 'rows' | 'partitions' | 'skew'): { min: number; max: number } => {
    const defaults = {
      rows: { min: 100_000, max: 1_000_000_000 },
      partitions: { min: 1, max: 1000 },
      skew: { min: 1, max: 20 },
    };

    if (!state.scenario) return defaults[field];

    const bounds = state.scenario.bounds;
    
    switch (field) {
      case 'rows':
        return {
          min: bounds.minRows ?? defaults.rows.min,
          max: bounds.maxRows ?? defaults.rows.max,
        };
      case 'partitions':
        return {
          min: bounds.minPartitions ?? defaults.partitions.min,
          max: bounds.maxPartitions ?? defaults.partitions.max,
        };
      case 'skew':
        return {
          min: bounds.minSkew ?? defaults.skew.min,
          max: bounds.maxSkew ?? defaults.skew.max,
        };
    }
  }, [state.scenario]);

  return (
    <ScenarioBridgeContext.Provider value={{
      ...state,
      enterScenarioMode,
      exitScenarioMode,
      resetToBaseline,
      selectHypothesis,
      recordExperiment,
      isExperimentAllowed,
      canModifyShape,
      getValueBounds,
    }}>
      {children}
    </ScenarioBridgeContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useScenarioBridge() {
  const context = useContext(ScenarioBridgeContext);
  if (!context) {
    throw new Error('useScenarioBridge must be used within a ScenarioBridgeProvider');
  }
  return context;
}

// ============================================================================
// SCENARIO CONFIG MAPPING
// ============================================================================

/**
 * Maps scenario IDs to their bridge configuration
 */
export const SCENARIO_BRIDGE_CONFIG: Record<string, {
  allowedExperiments: AllowedExperiment[];
  bounds: ScenarioContext['bounds'];
}> = {
  simple_filter: {
    allowedExperiments: ['change_data_size', 'change_partitions'],
    bounds: {
      minRows: 1_000_000,
      maxRows: 100_000_000,
      minPartitions: 10,
      maxPartitions: 500,
    },
  },
  groupby_aggregation: {
    allowedExperiments: ['change_partitions', 'adjust_skew'],
    bounds: {
      minPartitions: 10,
      maxPartitions: 1000,
      minSkew: 1,
      maxSkew: 15,
    },
  },
  join_without_broadcast: {
    allowedExperiments: ['change_data_size', 'adjust_broadcast_threshold'],
    bounds: {
      minRows: 1_000_000,
      maxRows: 500_000_000,
    },
  },
  skewed_join_key: {
    allowedExperiments: ['adjust_skew', 'change_partitions'],
    bounds: {
      minSkew: 1,
      maxSkew: 20,
      minPartitions: 50,
      maxPartitions: 500,
    },
  },
  too_many_output_files: {
    allowedExperiments: ['change_partitions', 'toggle_cache'],
    bounds: {
      minPartitions: 1,
      maxPartitions: 500,
    },
  },
};
