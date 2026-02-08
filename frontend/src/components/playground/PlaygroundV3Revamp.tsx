/**
 * DataFrame Playground v3 — Full Revamp
 * 
 * Per playground-v3-full-revamp-spec.md:
 * 
 * ┌──────────────────────────────────────────┐
 * │ Global Data Shape & Controls              │
 * ├───────────────┬──────────────────────────┤
 * │ Operation     │ Primary Visualization    │
 * │ Chain Builder │ (DAG / Partitions / Flow)│
 * ├───────────────┼──────────────────────────┤
 * │ Prediction &  │ Explanation Panel        │
 * │ Commit Area   │                          │
 * ├───────────────┴──────────────────────────┤
 * │ Timeline / History / Reset                │
 * └──────────────────────────────────────────┘
 * 
 * Core Philosophy:
 * - Prediction before explanation
 * - Shape over numbers
 * - Causality over completeness
 * - Truthful abstraction
 * - One mental model per interaction
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { DataShapePanel, type DataShape } from './DataShapePanel';
import { OperationsBuilder, type Operation } from './OperationsBuilder';
import { OperationControls } from './OperationControls';
import { ExecutionDAG } from './ExecutionDAG';
import { PartitionBars } from './PartitionBars';
import { 
  PredictionPrompt, 
  SparkReactionAnimation, 
  PredictionExplanation,
  EXPLANATIONS,
  type PredictionOption,
  type SparkReactionType,
  type PredictionType,
} from './prediction';
import { 
  useScenarioBridge, 
  ScenarioContext,
  SCENARIO_BRIDGE_CONFIG 
} from './ScenarioBridge';
import { HypothesisPrompt, ScenarioHeader, ExitWarningModal } from './HypothesisPrompt';
import { cn } from '@/lib/utils';

interface PlaygroundV3Props {
  className?: string;
  initialScenario?: string;
  initialIntentOperations?: Operation[];
}

// Default shape - total size is primary mental model
const DEFAULT_SHAPE: DataShape = {
  totalSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  avgRowSizeBytes: 100,
  rows: 100_000_000,
  partitions: 200,
  skewFactor: 1.0,
};

// Snapshot for history
interface PlaygroundSnapshot {
  id: string;
  timestamp: number;
  label: string;
  shape: DataShape;
  operations: Operation[];
}

// Prediction trigger conditions
interface PredictionTrigger {
  type: 'shuffle' | 'join_strategy' | 'skew' | 'spill_risk';
  question: string;
  options: PredictionOption[];
  expectedOutcome: SparkReactionType;
}

// Determine if we need to trigger a prediction
function checkPredictionTrigger(
  prevOps: Operation[],
  currentOps: Operation[],
  shape: DataShape
): PredictionTrigger | null {
  // New operation added?
  if (currentOps.length <= prevOps.length) return null;
  
  const newOp = currentOps[currentOps.length - 1];
  
  // Check for shuffle-inducing operations
  if (['groupby', 'repartition', 'orderby', 'distinct', 'window'].includes(newOp.type)) {
    return {
      type: 'shuffle',
      question: `You added a ${newOp.type}. What will Spark do?`,
      options: [
        { id: 'shuffle', label: 'Full shuffle across network' },
        { id: 'broadcast_join', label: 'Broadcast smaller side' },
        { id: 'no_shuffle', label: 'Process locally per partition' },
      ],
      expectedOutcome: 'shuffle',
    };
  }
  
  // Check for join - depends on sizes
  if (newOp.type === 'join') {
    const rightRows = (newOp.params.right_rows as number) || 100000;
    const rightSize = rightRows * shape.avgRowSizeBytes;
    const threshold = (newOp.params.broadcast_threshold as number) || 10 * 1024 * 1024;
    const willBroadcast = rightSize <= threshold;
    
    return {
      type: 'join_strategy',
      question: 'You added a join. How will Spark execute it?',
      options: [
        { id: 'shuffle', label: 'Sort-Merge Join (shuffle both sides)' },
        { id: 'broadcast_join', label: 'Broadcast Hash Join (no shuffle)' },
        { id: 'no_shuffle', label: 'Partition-local join' },
      ],
      expectedOutcome: willBroadcast ? 'broadcast' : 'shuffle',
    };
  }
  
  // Check for skew risk
  if (shape.skewFactor > 3 && ['groupby', 'join'].includes(newOp.type)) {
    return {
      type: 'skew',
      question: `With ${shape.skewFactor}x skew, what happens during ${newOp.type}?`,
      options: [
        { id: 'skewed', label: 'Some tasks take much longer (stragglers)' },
        { id: 'balanced', label: 'Data distributes evenly' },
        { id: 'spill_risk', label: 'Memory spills to disk' },
      ],
      expectedOutcome: 'skew',
    };
  }
  
  return null;
}

// Learning mode vs Expert mode
type PlaygroundMode = 'learning' | 'expert';

// Flow state for prediction
type FlowState = 
  | 'exploring'      // User is building/modifying
  | 'predicting'     // Prediction required
  | 'locked'         // Prediction committed
  | 'reacting'       // Spark reaction animating
  | 'explaining';    // Showing explanation

export function PlaygroundV3({ className = '', initialScenario, initialIntentOperations }: PlaygroundV3Props) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  
  // Scenario bridge context
  const scenarioBridge = useScenarioBridge();
  const { 
    isScenarioMode, 
    scenario, 
    hypothesisSelected, 
    selectedHypothesis,
    enterScenarioMode,
    exitScenarioMode,
    resetToBaseline,
    selectHypothesis,
    canModifyShape: _canModifyShape,
    getValueBounds,
  } = scenarioBridge;
  
  // Core state
  const [shape, setShape] = useState<DataShape>(DEFAULT_SHAPE);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [mode, setMode] = useState<PlaygroundMode>('learning');
  
  // Flow state
  const [flowState, setFlowState] = useState<FlowState>('exploring');
  const [predictionTrigger, setPredictionTrigger] = useState<PredictionTrigger | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionType | null>(null);
  const [previousOperations, setPreviousOperations] = useState<Operation[]>([]);
  
  // History
  const [snapshots, setSnapshots] = useState<PlaygroundSnapshot[]>([]);
  
  // Exit warning modal
  const [showExitWarning, setShowExitWarning] = useState(false);
  
  // Scenario loading state
  const [scenarioLoading, setScenarioLoading] = useState(false);
  
  const selectedOperation = operations.find(op => op.id === selectedOperationId);
  
  // Load scenario when initialScenario prop changes
  useEffect(() => {
    if (!initialScenario) return;
    
    const scenarioId = initialScenario; // Capture for async closure
    
    async function loadScenario() {
      setScenarioLoading(true);
      try {
        const res = await fetch(`/api/scenarios/${scenarioId}`);
        if (!res.ok) {
          console.error('Failed to load scenario');
          setScenarioLoading(false);
          return;
        }
        
        const data = await res.json();
        
        // Get bridge config for this scenario
        const bridgeConfig = SCENARIO_BRIDGE_CONFIG[scenarioId] || {
          allowedExperiments: ['change_data_size', 'change_partitions', 'adjust_skew'] as const,
          bounds: {},
        };
        
        // Create scenario context
        const playgroundDefaults = data.scenario.playground_defaults || {};
        const baselineShape: DataShape = {
          totalSizeBytes: (playgroundDefaults.rows || 10_000_000) * 100,
          avgRowSizeBytes: 100,
          rows: playgroundDefaults.rows || 10_000_000,
          partitions: playgroundDefaults.partitions || 200,
          skewFactor: playgroundDefaults.skew_factor || 1.0,
        };
        
        // Create initial operations from logical operations
        const baselineOps: Operation[] = (data.scenario.logical_operations || []).map(
          (opType: string, idx: number): Operation => ({
            id: `scenario-op-${idx}`,
            type: opType.toLowerCase().replace(/\s+/g, '_').replace(/_\(.*\)/, '') as Operation['type'],
            params: {},
          })
        );
        
        const scenarioContext: ScenarioContext = {
          id: data.scenario.id,
          title: data.scenario.title,
          story: data.scenario.story,
          learningGoal: data.scenario.explanation_goal,
          sparkConcepts: data.scenario.spark_concepts,
          baselineShape,
          baselineOperations: baselineOps,
          allowedExperiments: bridgeConfig.allowedExperiments,
          bounds: bridgeConfig.bounds,
        };
        
        // Enter scenario mode
        enterScenarioMode(scenarioContext);
        setShape(baselineShape);
        setOperations(baselineOps);
        setFlowState('exploring');
      } catch (error) {
        console.error('Error loading scenario:', error);
      } finally {
        setScenarioLoading(false);
      }
    }
    
    loadScenario();
  }, [initialScenario, enterScenarioMode]);

  // Load intent operations when provided (from notebook intent page)
  useEffect(() => {
    if (!initialIntentOperations || initialIntentOperations.length === 0) return;
    // Don't override if scenario is also loading
    if (initialScenario) return;

    setOperations(initialIntentOperations);
    setFlowState('exploring');
  }, [initialIntentOperations, initialScenario]);

  // Handle scenario reset
  const handleScenarioReset = useCallback(() => {
    if (!scenario) return;
    resetToBaseline();
    setShape(scenario.baselineShape);
    setOperations(scenario.baselineOperations);
    setFlowState('exploring');
    setPredictionTrigger(null);
    setSelectedPrediction(null);
  }, [scenario, resetToBaseline]);
  
  // Handle scenario exit
  const handleScenarioExit = useCallback(() => {
    setShowExitWarning(true);
  }, []);
  
  const confirmExit = useCallback(() => {
    exitScenarioMode();
    setShowExitWarning(false);
    setShape(DEFAULT_SHAPE);
    setOperations([]);
    setFlowState('exploring');
    // Update URL without scenario param — use Next.js router to keep internal state in sync
    router.replace('/playground');
  }, [exitScenarioMode, router]);
  
  // Handle hypothesis selection
  const handleHypothesisSelect = useCallback((hypothesis: string) => {
    selectHypothesis(hypothesis);
  }, [selectHypothesis]);
  
  // Check for prediction triggers when operations change
  useEffect(() => {
    // Skip in expert mode
    if (mode === 'expert') return;
    
    const trigger = checkPredictionTrigger(previousOperations, operations, shape);
    
    if (trigger && flowState === 'exploring') {
      setPredictionTrigger(trigger);
      setFlowState('predicting');
    }
    
    setPreviousOperations(operations);
    // Note: previousOperations intentionally excluded from deps to avoid cascading re-renders.
    // This effect should only fire when operations/shape/mode/flowState change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations, shape, mode, flowState]);
  
  // Handle prediction selection
  const handlePredictionSelect = useCallback((prediction: PredictionType) => {
    setSelectedPrediction(prediction);
  }, []);
  
  // Handle prediction commit
  const handlePredictionCommit = useCallback(() => {
    if (!selectedPrediction) return;
    
    setFlowState('locked');
    
    // Brief lock-in pause
    setTimeout(() => {
      setFlowState('reacting');
    }, reduceMotion ? 0 : 300);
  }, [selectedPrediction, reduceMotion]);
  
  // Handle reaction complete
  const handleReactionComplete = useCallback(() => {
    setFlowState('explaining');
  }, []);
  
  // Handle reset to exploring
  const handleResetFlow = useCallback(() => {
    setFlowState('exploring');
    setPredictionTrigger(null);
    setSelectedPrediction(null);
  }, []);
  
  // Skip prediction (expert mode shortcut)
  const handleSkipPrediction = useCallback(() => {
    setFlowState('exploring');
    setPredictionTrigger(null);
  }, []);
  
  // Update operation parameters
  const updateOperation = useCallback((updatedOp: Operation) => {
    setOperations(prev => prev.map(op => op.id === updatedOp.id ? updatedOp : op));
  }, []);
  
  // Snapshot current state
  const saveSnapshot = useCallback(() => {
    const snapshot: PlaygroundSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      label: `Snapshot ${snapshots.length + 1}`,
      shape: { ...shape },
      operations: operations.map(op => ({ ...op, params: { ...op.params } })),
    };
    setSnapshots(prev => [snapshot, ...prev].slice(0, 10));
  }, [shape, operations, snapshots.length]);
  
  // Revert to snapshot
  const revertToSnapshot = useCallback((snapshot: PlaygroundSnapshot) => {
    setShape(snapshot.shape);
    setOperations(snapshot.operations);
    setSelectedOperationId(null);
    setFlowState('exploring');
  }, []);
  
  // Global reset
  const handleGlobalReset = useCallback(() => {
    setShape(DEFAULT_SHAPE);
    setOperations([]);
    setSelectedOperationId(null);
    setFlowState('exploring');
    setPredictionTrigger(null);
    setSelectedPrediction(null);
  }, []);
  
  // Check if playground is "paused" for prediction or waiting for hypothesis
  const isPaused = flowState === 'predicting' || flowState === 'locked' || (isScenarioMode && !hypothesisSelected);
  
  // Get explanation content
  const explanation = predictionTrigger?.expectedOutcome 
    ? EXPLANATIONS[predictionTrigger.expectedOutcome]
    : undefined;
    
  // Create a scenario-aware shape setter
  const handleShapeChange = useCallback((newShape: DataShape) => {
    // In scenario mode, clamp values to allowed bounds
    if (isScenarioMode) {
      const rowBounds = getValueBounds('rows');
      const partitionBounds = getValueBounds('partitions');
      const skewBounds = getValueBounds('skew');
      
      const clampedShape: DataShape = {
        ...newShape,
        rows: Math.max(rowBounds.min, Math.min(rowBounds.max, newShape.rows)),
        partitions: Math.max(partitionBounds.min, Math.min(partitionBounds.max, newShape.partitions)),
        skewFactor: Math.max(skewBounds.min, Math.min(skewBounds.max, newShape.skewFactor)),
      };
      
      setShape(clampedShape);
    } else {
      setShape(newShape);
    }
  }, [isScenarioMode, getValueBounds]);
  
  // Scenario loading state
  if (scenarioLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Loading scenario...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-4", className)}
      data-testid="playground-v3"
      data-flow-state={flowState}
      data-mode={mode}
      data-scenario-mode={isScenarioMode}
    >
      {/* Exit Warning Modal */}
      <ExitWarningModal 
        isOpen={showExitWarning}
        onConfirm={confirmExit}
        onCancel={() => setShowExitWarning(false)}
      />
      
      {/* Scenario Header (when in scenario mode) */}
      <AnimatePresence>
        {isScenarioMode && scenario && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ScenarioHeader
              scenarioTitle={scenario.title}
              learningGoal={scenario.learningGoal}
              selectedHypothesis={selectedHypothesis}
              onReset={handleScenarioReset}
              onExit={handleScenarioExit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex items-center justify-between">
        {/* Mode Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-500 uppercase tracking-wider">Mode</span>
          <button
            onClick={() => setMode(mode === 'learning' ? 'expert' : 'learning')}
            className={cn(
              "relative px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
              mode === 'learning' 
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30' 
                : 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
            )}
            data-testid="mode-toggle"
          >
            {mode === 'learning' ? '📚 Learning' : '⚡ Expert'}
          </button>
        </div>
        
        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={saveSnapshot}
            className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-transparent"
            data-testid="save-snapshot"
          >
            📌 Snapshot
          </button>
          <button
            onClick={isScenarioMode ? handleScenarioReset : handleGlobalReset}
            className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/50 text-slate-700 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-300 rounded-lg transition-colors border border-slate-200 dark:border-transparent"
            data-testid="global-reset"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-slate-600 dark:text-slate-500 flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-900/20">
        <span className="text-yellow-600 dark:text-yellow-500">⚡</span>
        <span>Simulations are estimates — no actual Spark execution. Think before tuning.</span>
      </div>

      {/* === HYPOTHESIS PROMPT (Scenario Mode Only) === */}
      <AnimatePresence>
        {isScenarioMode && !hypothesisSelected && scenario && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <HypothesisPrompt
              scenarioId={scenario.id}
              onHypothesisSelected={handleHypothesisSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ZONE 1: Global Data Shape (Top) === */}
      <div className={cn(
        "p-5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800",
        isPaused && "opacity-60 pointer-events-none"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
            Data Shape
          </h3>
          {mode === 'learning' && !isScenarioMode && (
            <span className="text-xs text-slate-600 dark:text-slate-500">
              💡 Shape affects everything downstream
            </span>
          )}
          {isScenarioMode && scenario && (
            <span className="text-xs text-amber-500">
              🔒 Adjust within bounds for this scenario
            </span>
          )}
        </div>
        
        <DataShapePanel 
          shape={shape} 
          onChange={handleShapeChange}
          expertMode={mode === 'expert'}
        />
        
        {/* Partition Distribution Visualization */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <PartitionBars 
            partitions={shape.partitions}
            skewFactor={shape.skewFactor}
            avgPartitionSizeBytes={shape.totalSizeBytes / shape.partitions}
          />
        </div>
      </div>

      {/* === ZONES 2-3: Main Content Grid === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* === ZONE 2: Operation Chain Builder (Left) === */}
        <div className={cn(
          "lg:col-span-1 p-5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800",
          isPaused && "opacity-60 pointer-events-none"
        )}>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-4">
            Operation Chain
          </h3>
          
          <OperationsBuilder
            operations={operations}
            onChange={setOperations}
            onSelectOperation={(op) => setSelectedOperationId(op?.id || null)}
            selectedOperationId={selectedOperationId}
          />
          
          {/* Operation-specific controls */}
          <AnimatePresence>
            {selectedOperation && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800"
              >
                <OperationControls
                  operation={selectedOperation}
                  onChange={updateOperation}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === ZONE 3: Primary Visualization (Center) === */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
              Execution DAG
            </h3>
            {operations.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Normal
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Shuffle
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Broadcast
                </span>
              </div>
            )}
          </div>
          
          <ExecutionDAG
            operations={operations}
            shape={shape}
            isReacting={flowState === 'reacting'}
            reactionType={predictionTrigger?.expectedOutcome === 'shuffle' ? 'shuffle' 
              : predictionTrigger?.expectedOutcome === 'broadcast' ? 'broadcast'
              : predictionTrigger?.expectedOutcome === 'skew' ? 'skew'
              : null}
            onReactionComplete={handleReactionComplete}
          />
        </div>
      </div>

      {/* === ZONE 4-5: Prediction & Explanation (Conditional) === */}
      <AnimatePresence>
        {(flowState === 'predicting' || flowState === 'locked') && predictionTrigger && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-blue-50 dark:bg-slate-900/80 rounded-xl border-2 border-blue-300 dark:border-blue-500/50 shadow-lg dark:shadow-blue-500/10"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                🤔 Prediction Time
              </h3>
              {mode === 'expert' && (
                <button
                  onClick={handleSkipPrediction}
                  className="text-xs text-slate-600 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  Skip →
                </button>
              )}
            </div>
            
            <PredictionPrompt
              question={predictionTrigger.question}
              options={predictionTrigger.options}
              selectedPrediction={selectedPrediction}
              onSelect={handlePredictionSelect}
              onCommit={handlePredictionCommit}
              isLocked={flowState === 'locked'}
              isVisible={true}
            />
          </motion.div>
        )}
        
        {flowState === 'reacting' && predictionTrigger && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest mb-4">
              ⚡ Spark is reacting...
            </h3>
            <SparkReactionAnimation
              reactionType={predictionTrigger.expectedOutcome}
              isPlaying={true}
              onComplete={handleReactionComplete}
            />
          </motion.div>
        )}
        
        {flowState === 'explaining' && predictionTrigger && explanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <PredictionExplanation
              userPrediction={selectedPrediction}
              actualOutcome={predictionTrigger.expectedOutcome}
              explanation={explanation}
              isVisible={true}
              onReset={handleResetFlow}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* === ZONE 6: Timeline & History (Bottom) === */}
      <div className="p-5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
            History
          </h3>
          <span className="text-xs text-slate-600 dark:text-slate-500">
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {snapshots.length === 0 ? (
          <div className="text-center py-4 text-slate-600 dark:text-slate-500 text-sm">
            <span>📌 Click &quot;Snapshot&quot; to save current state for comparison</span>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                onClick={() => revertToSnapshot(snapshot)}
                className="flex-shrink-0 p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors text-left"
                data-testid={`snapshot-${snapshot.id}`}
              >
                <div className="text-xs text-slate-700 dark:text-slate-400 mb-1">{snapshot.label}</div>
                <div className="text-xs text-slate-600 dark:text-slate-500">
                  {snapshot.operations.length} ops • {formatBytes(snapshot.shape.totalSizeBytes)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default PlaygroundV3;
