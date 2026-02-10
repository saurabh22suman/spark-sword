// Legacy playground
export { ShapePlayground } from './ShapePlayground';

// Playground v3 components per dataframe-playground-spec.md
export { PartitionBars } from './PartitionBars';
export { DraggablePartitionBars } from './DraggablePartitionBars';
export { DataShapePanel } from './DataShapePanel';
export type { DataShape } from './DataShapePanel';
export { OperationsBuilder } from './OperationsBuilder';
export type { Operation } from './OperationsBuilder';
export { OperationControls } from './OperationControls';
export { SelectivityScrubber } from './SelectivityScrubber';
export { ChallengeMode } from './ChallengeMode';
export type { Challenge } from './ChallengeMode';
export { ValidationWarningsPanel } from './ValidationWarningsPanel';
export { validatePlaygroundState } from './ValidationWarnings';
export type { ValidationWarning } from './ValidationWarnings';
export { ExampleGallery } from './ExampleGallery';
export type { PlaygroundExample, ExampleCategory } from './ExampleGallery';
export { HoverSyncProvider, useHoverSync } from './HoverSyncContext';
export type { HoverState } from './HoverSyncContext';
export { SparkViewPanel } from './SparkViewPanel';
export { ImpactPanel } from './ImpactPanel';
export { PresetsBar } from './PresetsBar';
export { ComparisonTimeline } from './ComparisonTimeline';
export { PlaygroundV3 } from './PlaygroundV3';

// Playground v3 Revamp per playground-v3-full-revamp-spec.md
export { PlaygroundV3Revamp } from './PlaygroundV3Revamp';
export { ExecutionDAG } from './ExecutionDAG';

// Scenario → Playground Bridge per scenario-to-playground-bridge-spec.md
export { 
  ScenarioBridgeProvider, 
  useScenarioBridge, 
  HYPOTHESIS_OPTIONS,
  SCENARIO_BRIDGE_CONFIG,
} from './ScenarioBridge';
export type { ScenarioContext, AllowedExperiment } from './ScenarioBridge';
export { HypothesisPrompt, ScenarioHeader, ExitWarningModal } from './HypothesisPrompt';

// Prediction flow components per playground-predicition-animation-flow-spec.md
export { 
  PredictionPrompt,
  SparkReactionAnimation,
  PredictionExplanation,
  PredictionFlow,
  usePredictionTrigger,
  EXPLANATIONS,
} from './prediction';
export type { 
  PredictionType, 
  PredictionOption,
  SparkReactionType,
  ExplanationContent,
  PredictionFlowState,
  PredictionTrigger,
} from './prediction';