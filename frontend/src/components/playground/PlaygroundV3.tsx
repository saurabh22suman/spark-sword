/**
 * DataFrame Playground v3
 * 
 * Per dataframe-playground-spec.md - Complete revamp following mandatory layout:
 * 
 * ┌────────────────────────────────────────────┐
 * │  Presets / Scenarios                       │
 * ├────────────────────────────────────────────┤
 * │  Data Shape (Global)                       │
 * ├───────────────┬───────────────┬────────────┤
 * │  Operations   │  Spark View   │  Impact    │
 * │  Builder      │  (DAG +       │  Panel     │
 * │               │   Decision)   │            │
 * ├───────────────┴───────────────┴────────────┤
 * │  Comparison Timeline / History             │
 * └────────────────────────────────────────────┘
 * 
 * Core principles:
 * 1. Shape-first, always
 * 2. Cause → Effect → Trade-off
 * 3. Live & Comparative
 * 4. Progressive complexity
 * 5. No execution, no guarantees
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { DataShapePanel, type DataShape } from './DataShapePanel';
import { OperationsBuilder, type Operation } from './OperationsBuilder';
import { OperationControls } from './OperationControls';
import { SparkViewPanel } from './SparkViewPanel';
import { ImpactPanel } from './ImpactPanel';
import { PresetsBar } from './PresetsBar';
import { ComparisonTimeline } from './ComparisonTimeline';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PlaygroundV3Props {
  className?: string;
  initialScenario?: string;
}

// Default shape
const DEFAULT_SHAPE: DataShape = {
  totalSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  avgRowSizeBytes: 100,
  rows: 100_000_000,
  partitions: 200,
  skewFactor: 1.0,
};

// Simulate operation chain locally for instant feedback
function simulateChain(shape: DataShape, operations: Operation[]) {
  let shuffleBytes = 0;
  let currentRows = shape.rows;
  let currentSize = shape.totalSizeBytes;
  const steps: Array<{
    type: string;
    shuffle: number;
    outputRows: number;
    isStageBoundary: boolean;
  }> = [];
  
  // Wide transformations that cause shuffle
  const SHUFFLE_OPS = ['groupby', 'join', 'repartition', 'orderby', 'distinct', 'window'];
  
  for (const op of operations) {
    let opShuffle = 0;
    let outputRows = currentRows;
    const isStageBoundary = SHUFFLE_OPS.includes(op.type);
    
    switch (op.type) {
      case 'filter':
        const selectivity = (op.params.selectivity as number) || 0.5;
        outputRows = Math.floor(currentRows * selectivity);
        currentSize = Math.floor(currentSize * selectivity);
        break;
        
      case 'groupby':
        opShuffle = currentSize;
        outputRows = (op.params.num_groups as number) || 1000;
        break;
        
      case 'join':
        const rightRows = (op.params.right_rows as number) || 100000;
        const rightSize = rightRows * shape.avgRowSizeBytes;
        const threshold = (op.params.broadcast_threshold as number) || 10 * 1024 * 1024;
        if (rightSize > threshold) {
          opShuffle = currentSize + rightSize;
        }
        outputRows = Math.min(currentRows, rightRows);
        break;
        
      case 'repartition':
        opShuffle = currentSize;
        break;
        
      case 'orderby':
        opShuffle = currentSize;
        break;
        
      case 'distinct':
        opShuffle = currentSize;
        const dupRatio = (op.params.duplicates_ratio as number) || 0.1;
        outputRows = Math.floor(currentRows * (1 - dupRatio));
        break;
        
      case 'window':
        opShuffle = currentSize;
        break;
        
      case 'union':
        const otherRows = (op.params.other_rows as number) || currentRows;
        outputRows = currentRows + otherRows;
        currentSize = currentSize + otherRows * shape.avgRowSizeBytes;
        break;
    }
    
    shuffleBytes += opShuffle;
    currentRows = outputRows;
    
    steps.push({
      type: op.type,
      shuffle: opShuffle,
      outputRows,
      isStageBoundary,
    });
  }
  
  // Calculate stage count
  const stageCount = 1 + steps.filter(s => s.isStageBoundary).length;
  
  // Task count = partitions
  const taskCount = shape.partitions;
  
  // Max partition size
  const maxPartitionSize = (shape.totalSizeBytes / shape.partitions) * shape.skewFactor;
  
  // Task time estimates
  const bytesPerMs = 1000;
  const baseTime = (shape.totalSizeBytes / shape.partitions) / bytesPerMs;
  const shuffleOverhead = shuffleBytes > 0 ? 3 : 1;
  const minTaskTime = Math.floor(baseTime);
  const maxTaskTime = Math.floor(baseTime * shape.skewFactor * shuffleOverhead);
  
  return {
    shuffleBytes,
    taskCount,
    maxPartitionSize,
    taskTimeRange: { min: minTaskTime, max: maxTaskTime },
    stageCount,
    steps,
    outputRows: currentRows,
  };
}

// Generate Spark decision based on operations
function generateSparkDecision(shape: DataShape, operations: Operation[]) {
  if (operations.length === 0) {
    return undefined;
  }
  
  const lastOp = operations[operations.length - 1];
  const simulation = simulateChain(shape, operations);
  
  let strategy = 'Sequential Execution';
  let explanation = 'Spark processes operations in sequence.';
  let dominantFactor = 'Data size determines overall cost.';
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  switch (lastOp.type) {
    case 'filter':
      strategy = 'Narrow Transformation';
      explanation = 'Filter processes each partition independently without moving data.';
      dominantFactor = `With ${((lastOp.params.selectivity as number) * 100).toFixed(0)}% selectivity, output is significantly reduced.`;
      confidence = 'high';
      break;
      
    case 'groupby':
      strategy = 'Hash Aggregation + Shuffle';
      explanation = 'Spark shuffles all data to colocate rows with identical keys for aggregation.';
      dominantFactor = shape.skewFactor > 2 
        ? `High skew (${shape.skewFactor}x) causes uneven task times.`
        : `${(simulation.shuffleBytes / 1024 / 1024 / 1024).toFixed(1)}GB shuffle drives cost.`;
      confidence = shape.skewFactor > 3 ? 'low' : 'medium';
      break;
      
    case 'join':
      const rightSize = ((lastOp.params.right_rows as number) || 100000) * shape.avgRowSizeBytes;
      const threshold = (lastOp.params.broadcast_threshold as number) || 10 * 1024 * 1024;
      if (rightSize <= threshold) {
        strategy = 'Broadcast Hash Join';
        explanation = `Right table (${(rightSize / 1024 / 1024).toFixed(1)}MB) is below threshold, broadcasting to all executors.`;
        dominantFactor = 'Broadcast eliminates shuffle, making join cost proportional to scan.';
        confidence = 'high';
      } else {
        strategy = 'Sort-Merge Join';
        explanation = 'Both tables exceed broadcast threshold, requiring full shuffle of both sides.';
        dominantFactor = `${(simulation.shuffleBytes / 1024 / 1024 / 1024).toFixed(1)}GB total shuffle across network.`;
        confidence = 'medium';
      }
      break;
      
    case 'orderby':
      strategy = 'Range Partitioning + Sort';
      explanation = 'Spark samples data to determine range boundaries, then shuffles to achieve global order.';
      dominantFactor = 'Full data shuffle plus local sort within each partition.';
      confidence = 'medium';
      break;
      
    case 'window':
      if ((lastOp.params.partition_columns as number) === 0) {
        strategy = 'Single Partition Window';
        explanation = 'Without partitionBy, all data moves to one partition for window computation.';
        dominantFactor = 'Single-threaded execution eliminates parallelism.';
        confidence = 'high';
      } else {
        strategy = 'Partitioned Window';
        explanation = 'Data shuffled by partition columns, then window computed within each partition.';
        dominantFactor = 'Shuffle cost plus sorting overhead for ORDER BY.';
        confidence = 'medium';
      }
      break;
      
    case 'repartition':
      strategy = 'Full Shuffle Repartition';
      explanation = 'All data moves across network to new partition assignments.';
      dominantFactor = `Redistributing ${(simulation.shuffleBytes / 1024 / 1024 / 1024).toFixed(1)}GB across ${lastOp.params.new_partitions} partitions.`;
      confidence = 'high';
      break;
  }
  
  return { strategy, explanation, dominantFactor, confidence };
}

export function PlaygroundV3({ className = '', initialScenario: _initialScenario }: PlaygroundV3Props) {
  const [shape, setShape] = useState<DataShape>(DEFAULT_SHAPE);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  
  const selectedOperation = operations.find(op => op.id === selectedOperationId);
  
  // Live simulation (debounced in production)
  const simulation = useMemo(() => simulateChain(shape, operations), [shape, operations]);
  const sparkDecision = useMemo(() => generateSparkDecision(shape, operations), [shape, operations]);
  
  // Update operation parameters
  const updateOperation = useCallback((updatedOp: Operation) => {
    setOperations(prev => prev.map(op => op.id === updatedOp.id ? updatedOp : op));
  }, []);
  
  // Apply preset
  const applyPreset = useCallback((presetShape: DataShape, presetOps: Operation[]) => {
    setShape(presetShape);
    setOperations(presetOps);
    setSelectedOperationId(presetOps.length > 0 ? presetOps[0].id : null);
  }, []);
  
  // Revert to snapshot
  const revertToSnapshot = useCallback((snapshotShape: DataShape, snapshotOps: Operation[]) => {
    setShape(snapshotShape);
    setOperations(snapshotOps);
    setSelectedOperationId(null);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("space-y-6", className)}
    >
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Mode:</span>
          <button
            onClick={() => setExpertMode(!expertMode)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-full transition-all uppercase tracking-wider",
              expertMode 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {expertMode ? 'Expert' : 'Standard'}
          </button>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-1.5 rounded-full border border-yellow-100 dark:border-yellow-900/20 text-yellow-700 dark:text-yellow-500">
          <span className="text-base">⚡</span> All simulations are estimates — no actual Spark execution
        </div>
      </div>

      {/* Presets / Scenarios */}
      <PresetsBar onApply={applyPreset} />

      {/* Data Shape (Global) */}
      <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
          Global Data Shape
        </h3>
        <DataShapePanel 
          shape={shape} 
          onChange={setShape} 
          expertMode={expertMode}
        />
      </div>

      {/* Three-column layout: Operations | Spark View | Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations Builder (Left) */}
        <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Pipeline</h3>
          <OperationsBuilder
            operations={operations}
            onChange={setOperations}
            onSelectOperation={(op) => setSelectedOperationId(op?.id || null)}
            selectedOperationId={selectedOperationId}
          />
          
          {/* Operation-specific controls */}
          {selectedOperation && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800"
            >
              <OperationControls
                operation={selectedOperation}
                onChange={updateOperation}
              />
            </motion.div>
          )}
        </div>

        {/* Spark View (Center) */}
        <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Execution Plan</h3>
          <SparkViewPanel
            operations={operations}
            chainResult={{
              stage_count: simulation.stageCount,
              total_shuffle_bytes: simulation.shuffleBytes,
            }}
            sparkDecision={sparkDecision}
          />
        </div>

        {/* Impact Panel (Right) */}
        <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Impact Analysis</h3>
          <ImpactPanel
            shuffleBytes={simulation.shuffleBytes}
            taskCount={simulation.taskCount}
            maxPartitionSize={simulation.maxPartitionSize}
            taskTimeRange={simulation.taskTimeRange}
            dominantFactor={sparkDecision?.dominantFactor}
          />
        </div>
      </div>

      {/* Comparison Timeline / History */}
      <div className="p-6 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">History Log</h3>
        <ComparisonTimeline
          currentShape={shape}
          currentOperations={operations}
          currentMetrics={{
            shuffleBytes: simulation.shuffleBytes,
            taskCount: simulation.taskCount,
            maxPartitionSize: simulation.maxPartitionSize,
          }}
          onRevert={revertToSnapshot}
        />
      </div>
    </motion.div>
  );
}

export default PlaygroundV3;
