/** Common TypeScript types for PrepRabbit frontend */

// ============================================================
// Spark Event Log Types (matching backend models)
// ============================================================

export interface JobInfo {
  job_id: number;
  submission_time?: number;
  completion_time?: number;
  stage_ids: number[];
  status: string;
  num_tasks: number;
}

export interface StageInfo {
  stage_id: number;
  attempt_id: number;
  name: string;
  num_tasks: number;
  parent_ids: number[];
  submission_time?: number;
  completion_time?: number;
  status: string;
  input_bytes: number;
  output_bytes: number;
  shuffle_read_bytes: number;
  shuffle_write_bytes: number;
  spill_bytes: number;
}

export interface TaskInfo {
  task_id: number;
  stage_id: number;
  attempt: number;
  executor_id: string;
  host: string;
  launch_time?: number;
  finish_time?: number;
  duration_ms?: number;
  status: string;
  input_bytes: number;
  output_bytes: number;
  shuffle_read_bytes: number;
  shuffle_write_bytes: number;
  spill_bytes: number;
}

export interface ParsedEventLog {
  application_id?: string;
  application_name?: string;
  spark_version?: string;
  start_time?: number;
  end_time?: number;
  jobs: JobInfo[];
  stages: StageInfo[];
  tasks: TaskInfo[];
  total_events: number;
  unknown_events: number;
}

// ============================================================
// Failure Pattern Types
// ============================================================

export type FailureSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface FailurePattern {
  type: string;  // STUCK_TASK, HIGH_GC_PRESSURE, EXCESSIVE_SPILL, EXECUTOR_LOSS
  severity: FailureSeverity;
  description: string;
  explanation: string;
  suggested_fix: string;
  metrics: Record<string, string | number | boolean>;
  stage_id?: number;
  executor_id?: string;
}

export interface FailureAnalysisResult {
  patterns: FailurePattern[];
  total_patterns: number;
  has_critical: boolean;
  has_high: boolean;
}

// ============================================================
// Intent Graph Types (per notebook-intent-extraction-spec.md)
// ============================================================

export type SparkConsequence =
  | 'Narrow transformation'
  | 'Shuffle required'
  | 'Shuffle on both sides'
  | 'Broadcast join likely'
  | 'Full shuffle'
  | 'No shuffle'
  | 'Shuffle + sort'
  | 'Memory pressure risk'
  | 'Possible file explosion'
  | 'Unknown consequence';

export interface EditableAssumptions {
  join_type?: 'inner' | 'left' | 'right' | 'outer' | 'cross';
  broadcast_hint?: boolean;
  is_skewed?: boolean;
  selectivity?: number;
}

export interface IntentGraphNodeDetails {
  code_snippet: string;
  keys?: string[];
  columns?: string[];
  editable?: EditableAssumptions;
}

export interface IntentGraphNode {
  step: number;
  operation: string;
  details: IntentGraphNodeDetails;
  spark_consequence: SparkConsequence;
  is_uncertain: boolean;
  uncertainty_reason: string | null;
}

export interface InferredIntent {
  label: string;
  is_inferred: boolean;
  summary: string;
  code_cells: string[];
  transformations: DetectedTransformation[];
  intent_graph: IntentGraphNode[];
  uncertainties: string[];
  schema: null;
  row_count: null;
  data_size: null;
  // UI state
  is_confirmed?: boolean;
}

export interface DetectedTransformation {
  operation: string;
  line_number: number;
  cell_index: number;
  code_snippet: string;
  causes_shuffle: boolean;
}

// ============================================================
// DataFrame Shape Playground Types
// ============================================================

export interface DataFrameShape {
  row_count: number;
  key_cardinality: number;
  skew_percentage: number;
  avg_row_bytes: number;
  partition_count: number;
}

export interface JoinSimulationInput {
  left: DataFrameShape;
  right: DataFrameShape;
  join_type: 'inner' | 'left' | 'right' | 'outer' | 'cross';
  join_keys: string[];
}

export interface JoinSimulationResult {
  predicted_strategy: 'broadcast' | 'sort_merge' | 'shuffle_hash';
  estimated_shuffle_bytes: number;
  confidence: 'high' | 'medium' | 'low';
  conditions: string[];
}

// ============================================================
// Insight Types
// ============================================================

export type InsightConfidence = 'high' | 'medium' | 'low';

export interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  evidence: string[];
  confidence: InsightConfidence;
  affected_stages: number[];
  suggestions: string[];
}

export interface OptimizationInsight {
  id?: string;
  type: string;
  title: string;
  description: string;
  evidence: string[];
  confidence: InsightConfidence;
  stage_id?: number;
  affected_stages?: number[];
  suggestions: string[];
}

// ============================================================
// Stage Explanation Types (Feature 2: Explanation Engine)
// ============================================================

export interface StageExplanation {
  stage_id: number;
  observation: string;          // What happened
  spark_rule: string;           // Spark Rule Involved
  cost_driver: string | null;   // Cost Driver (if expensive)
  is_shuffle_boundary: boolean;
  is_expensive: boolean;
  expense_reason: string | null;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// DAG Visualization Types
// ============================================================

export interface DAGNodeMetadata {
  job_id?: number;
  stage_id?: number;
  status?: string;
  num_tasks?: number;
  duration_ms?: number;
  input_bytes?: number;
  output_bytes?: number;
  shuffle_read_bytes?: number;
  shuffle_write_bytes?: number;
  spill_bytes?: number;
  has_shuffle?: boolean;
  parent_ids?: number[];
}

export interface DAGNodeData {
  id: string;
  type: 'job' | 'stage';
  label: string;
  metadata: DAGNodeMetadata;
}

export interface DAGNodeWrapper {
  id: string;
  type: 'job' | 'stage';
  data: DAGNodeData;
  position?: { x: number; y: number };
}

export interface DAGEdgeData {
  source: string;
  target: string;
  type: 'dependency' | 'shuffle';
}

export interface DAGData {
  nodes: DAGNodeWrapper[];
  edges: DAGEdgeData[];
}

export interface DAGNode {
  id: string;
  type: 'job' | 'stage';
  data: JobInfo | StageInfo;
  position: { x: number; y: number };
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

// ============================================================
// Scenario Types (Real-Life Scenarios Feature)
// ============================================================

export type ScenarioLevel = 'basic' | 'intermediate';

export interface ScenarioSummary {
  id: string;
  title: string;
  level: ScenarioLevel;
  spark_concepts: string[];
  real_world_context: string;
}

export interface PlaygroundDefaults {
  rows: number;
  avg_row_size_bytes: number;
  partitions: number;
  skew_factor?: number;
  operation: 'filter' | 'groupby' | 'join' | 'repartition';
  selectivity?: number;
  num_groups?: number;
  right_rows?: number;
  new_partitions?: number;
}

export interface ScenarioDetail {
  id: string;
  title: string;
  level: ScenarioLevel;
  spark_concepts: string[];
  real_world_context: string;
  story: string;
  logical_operations: string[];
  expected_stages: number;
  expected_shuffles: number;
  expected_skew: boolean;
  evidence_signals: string[];
  explanation_goal: string;
  playground_defaults: PlaygroundDefaults;
  learning_goals: string[];
  key_takeaways: string[];
  common_mistakes: string[];
}

export interface SimulationPreview {
  shuffle_bytes: number;
  estimated_min_task_ms: number;
  estimated_max_task_ms: number;
  confidence: string;
  spark_path_explanation: string;
  dominant_factor: string;
  notes: string[];
}

// ============================================================
// Scenario DAG Types (per scenario-dag-spec.md)
// ============================================================

export type ScenarioDAGNodeType = 
  | 'read'
  | 'narrow_op'
  | 'shuffle'
  | 'join'
  | 'aggregate'
  | 'sort'
  | 'write';

export interface ScenarioDAGNode {
  node_type: ScenarioDAGNodeType;
  label: string;
  stage: number;
  what_spark_does: string;
  why_required: string;
  is_stage_boundary: boolean;
}

export interface ScenarioDAGData {
  nodes: ScenarioDAGNode[];
  stage_count: number;
  shuffle_count: number;
}

export interface ScenarioWithSimulation {
  scenario: ScenarioDetail;
  simulation: SimulationPreview;
  dag?: ScenarioDAGData;
}

// ============================================================
// Tutorial Types (Interactive Learning System)
// ============================================================

export interface PredictionChallenge {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  misconception?: string;
  hints?: string[];
}

export interface InteractiveTutorial {
  id: string;
  title: string;
  description: string;
  component_type: string;
  learning_outcome: string;
  prediction_challenge?: PredictionChallenge;  // DEPRECATED: Kept for backward compatibility
  prediction_challenges?: PredictionChallenge[];  // Question bank - pick one randomly
  docs_url?: string;
}

export interface TutorialTopic {
  id: string;
  title: string;
  description: string;
  tutorials: InteractiveTutorial[];
}

export interface TutorialGroup {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  topics: string[];
  learning_outcome: string;
  tutorial_topics: TutorialTopic[];
  key_takeaways: string[];
  common_mistakes: string[];
}

export interface TutorialGroupSummary {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  topic_count: number;
  tutorial_count: number;
}
