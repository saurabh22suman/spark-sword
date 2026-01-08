'use client';

/**
 * Shape Playground Component
 * 
 * Interactive UI for DataFrame shape simulation.
 * Allows users to experiment with data shapes and see
 * how they affect Spark execution estimates.
 */

import { useState, useCallback } from 'react';
import { LearningHint } from '@/components/learning';

interface DataFrameShapeInput {
  rows: number;
  avgRowSizeBytes: number;
  partitions: number;
  skewFactor: number;
}

interface SimulationResult {
  outputRows: number;
  shuffleBytes: number;
  broadcastBytes: number;
  estimatedMinTaskMs: number;
  estimatedMaxTaskMs: number;
  confidence: 'high' | 'medium' | 'low';
  hasWarning: boolean;
  warningMessage: string;
  notes: string[];
}

interface ShapePlaygroundProps {
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

const defaultShape: DataFrameShapeInput = {
  rows: 10_000_000,
  avgRowSizeBytes: 100,
  partitions: 200,
  skewFactor: 1.0,
};

function ShapeInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm text-slate-400">
          {typeof value === 'number' && value >= 1000 ? formatNumber(value) : value}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}

function OperationSelector({
  operation,
  onChange,
}: {
  operation: string;
  onChange: (op: string) => void;
}) {
  const operations = [
    { id: 'filter', label: 'Filter', icon: '🔍' },
    { id: 'groupby', label: 'GroupBy', icon: '📊' },
    { id: 'join', label: 'Join', icon: '🔗' },
    { id: 'repartition', label: 'Repartition', icon: '📦' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {operations.map((op) => (
        <button
          key={op.id}
          onClick={() => onChange(op.id)}
          className={`
            p-3 rounded-lg border transition-all text-left
            ${operation === op.id
              ? 'border-blue-500 bg-blue-500/10 text-white'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}
          `}
        >
          <span className="text-lg mr-2">{op.icon}</span>
          <span className="text-sm font-medium">{op.label}</span>
        </button>
      ))}
    </div>
  );
}

function ResultDisplay({ result }: { result: SimulationResult | null }) {
  if (!result) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="text-3xl mb-2">🎯</div>
        <p>Select an operation and adjust parameters to see simulation results</p>
      </div>
    );
  }

  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-orange-400',
  };

  return (
    <div className="space-y-4">
      {/* Warning */}
      {result.hasWarning && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400">⚠️</span>
            <p className="text-sm text-yellow-400">{result.warningMessage}</p>
          </div>
        </div>
      )}

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Output Rows
          </div>
          <div className="text-xl font-semibold text-white">
            {formatNumber(result.outputRows)}
          </div>
        </div>

        <div className="p-4 bg-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Shuffle Data
          </div>
          <div className={`text-xl font-semibold ${result.shuffleBytes > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {formatBytes(result.shuffleBytes)}
          </div>
        </div>

        {result.broadcastBytes > 0 && (
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Broadcast
            </div>
            <div className="text-xl font-semibold text-blue-400">
              {formatBytes(result.broadcastBytes)}
            </div>
          </div>
        )}

        <div className="p-4 bg-slate-800 rounded-lg">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Task Time (est.)
          </div>
          <div className="text-xl font-semibold text-white">
            {result.estimatedMinTaskMs}ms - {result.estimatedMaxTaskMs}ms
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Confidence:</span>
        <span className={confidenceColors[result.confidence]}>
          {result.confidence.toUpperCase()}
        </span>
      </div>

      {/* Notes */}
      {result.notes.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Notes</div>
          {result.notes.map((note, idx) => (
            <p key={idx} className="text-sm text-slate-400">• {note}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShapePlayground({ className = '' }: ShapePlaygroundProps) {
  const [shape, setShape] = useState<DataFrameShapeInput>(defaultShape);
  const [operation, setOperation] = useState<string>('filter');
  const [operationParams, setOperationParams] = useState({
    filterSelectivity: 0.1,
    groupByGroups: 1000,
    joinRightRows: 100_000,
    newPartitions: 500,
  });
  const [result, setResult] = useState<SimulationResult | null>(null);

  const updateShape = useCallback((key: keyof DataFrameShapeInput, value: number) => {
    setShape(prev => ({ ...prev, [key]: value }));
  }, []);

  const totalSize = shape.rows * shape.avgRowSizeBytes;
  const partitionSize = totalSize / shape.partitions;
  
  // Spill risk calculation
  // Typical executor memory fraction for task execution: ~60% of 4GB = 2.4GB
  // If max partition size exceeds this, spill to disk is likely
  const TYPICAL_TASK_MEMORY_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
  const maxPartitionSize = partitionSize * shape.skewFactor;
  const spillRisk = maxPartitionSize > TYPICAL_TASK_MEMORY_BYTES;
  const spillRiskLevel = maxPartitionSize > TYPICAL_TASK_MEMORY_BYTES * 2 ? 'high' : 
                        maxPartitionSize > TYPICAL_TASK_MEMORY_BYTES ? 'medium' : 'low';

  // Simulate operation (client-side for demo - would call API in production)
  const simulate = useCallback(() => {
    let outputRows = shape.rows;
    let shuffleBytes = 0;
    let broadcastBytes = 0;
    const notes: string[] = [];
    let hasWarning = false;
    let warningMessage = '';
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    switch (operation) {
      case 'filter':
        outputRows = Math.round(shape.rows * operationParams.filterSelectivity);
        confidence = 'high';
        notes.push('Filter is a narrow transformation - no shuffle required');
        break;

      case 'groupby':
        outputRows = operationParams.groupByGroups;
        shuffleBytes = totalSize;
        notes.push(`Full shuffle required: ~${formatBytes(shuffleBytes)}`);
        if (shape.skewFactor > 3) {
          hasWarning = true;
          warningMessage = `High skew factor (${shape.skewFactor}x) may cause stragglers`;
        }
        break;

      case 'join':
        const rightSize = operationParams.joinRightRows * shape.avgRowSizeBytes;
        if (rightSize <= 10 * 1024 * 1024) {
          broadcastBytes = rightSize;
          notes.push('Broadcast join possible - small table will be broadcast');
          confidence = 'high';
        } else {
          shuffleBytes = totalSize + rightSize;
          notes.push('Sort-merge join required - both tables shuffled');
        }
        outputRows = Math.min(shape.rows, operationParams.joinRightRows);
        break;

      case 'repartition':
        outputRows = shape.rows;
        shuffleBytes = totalSize;
        notes.push(`Full shuffle to redistribute into ${operationParams.newPartitions} partitions`);
        confidence = 'high';
        break;
    }
    
    // Add spill risk warning for shuffle operations
    if (shuffleBytes > 0 && spillRisk) {
      if (!hasWarning) {
        hasWarning = true;
        warningMessage = `Large partition size (~${formatBytes(maxPartitionSize)}) may cause spill to disk`;
      } else {
        warningMessage += `. Also: large partition may spill`;
      }
      notes.push(`⚠️ Spill risk: partition size ${formatBytes(maxPartitionSize)} exceeds typical task memory`);
    }

    // Calculate task time estimates
    const bytesPerMs = 1000; // 1MB/s estimate
    const baseTime = partitionSize / bytesPerMs;
    const estimatedMinTaskMs = Math.round(baseTime);
    const estimatedMaxTaskMs = Math.round(baseTime * shape.skewFactor * (shuffleBytes > 0 ? 3 : 1));

    setResult({
      outputRows,
      shuffleBytes,
      broadcastBytes,
      estimatedMinTaskMs,
      estimatedMaxTaskMs,
      confidence,
      hasWarning,
      warningMessage,
      notes,
    });
  }, [shape, operation, operationParams, totalSize, partitionSize, spillRisk, maxPartitionSize]);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Input panel */}
      <div className="space-y-6 p-6 bg-slate-900/50 rounded-xl border border-slate-800">
        <h3 className="text-lg font-semibold text-white">DataFrame Shape</h3>
        
        <LearningHint title="Why shape matters">
          Spark&apos;s performance is determined by <strong>how data is shaped</strong>, not what values it contains. 
          The number of rows, partitions, and skew factor all affect how Spark distributes work across executors.
          Understanding these parameters helps you predict and optimize Spark jobs before running them.
        </LearningHint>
        
        {/* Shape stats */}
        <div className="flex flex-wrap gap-4 p-3 bg-slate-800/50 rounded-lg text-sm">
          <div>
            <span className="text-slate-500">Total Size:</span>
            <span className="ml-2 text-white">{formatBytes(totalSize)}</span>
          </div>
          <div>
            <span className="text-slate-500">Per Partition:</span>
            <span className="ml-2 text-white">{formatBytes(partitionSize)}</span>
          </div>
          <div>
            <span className="text-slate-500">Max Partition (w/ skew):</span>
            <span className={`ml-2 ${spillRisk ? 'text-red-400' : 'text-white'}`}>
              {formatBytes(maxPartitionSize)}
            </span>
          </div>
        </div>
        
        {/* Spill Risk Indicator */}
        {spillRisk && (
          <div className={`p-3 rounded-lg border ${
            spillRiskLevel === 'high' 
              ? 'bg-red-500/10 border-red-500/30' 
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div className="flex items-start gap-2">
              <span className={spillRiskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'}>
                ⚠️
              </span>
              <div>
                <p className={`text-sm font-medium ${spillRiskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {spillRiskLevel === 'high' ? 'High Spill Risk' : 'Spill Risk Detected'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Max partition size ({formatBytes(maxPartitionSize)}) exceeds typical task memory (~2GB).
                  This may cause disk spill during shuffle operations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shape inputs */}
        <div className="space-y-4">
          <ShapeInput
            label="Row Count"
            value={shape.rows}
            onChange={(v) => updateShape('rows', v)}
            min={1000}
            max={1_000_000_000}
            step={1000}
            description="Number of rows in the DataFrame"
          />

          <ShapeInput
            label="Avg Row Size"
            value={shape.avgRowSizeBytes}
            onChange={(v) => updateShape('avgRowSizeBytes', v)}
            min={10}
            max={10000}
            step={10}
            unit="bytes"
            description="Average size of each row in bytes"
          />

          <ShapeInput
            label="Partitions"
            value={shape.partitions}
            onChange={(v) => updateShape('partitions', v)}
            min={1}
            max={10000}
            description="Number of partitions"
          />

          <ShapeInput
            label="Skew Factor"
            value={shape.skewFactor}
            onChange={(v) => updateShape('skewFactor', v)}
            min={1}
            max={20}
            step={0.5}
            unit="x"
            description="How much larger the largest partition is vs average"
          />
        </div>

        {/* Operation selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">Operation</h4>
          <OperationSelector operation={operation} onChange={setOperation} />
          
          <LearningHint title="Understanding operations">
            <strong>Filter</strong> is a narrow transformation - no shuffle needed.{' '}
            <strong>GroupBy</strong> and <strong>Join</strong> are wide transformations that require shuffling data across the cluster.{' '}
            <strong>Repartition</strong> always triggers a full shuffle. The choice of operation dramatically affects performance.
          </LearningHint>
        </div>

        {/* Operation-specific params */}
        <div className="space-y-4">
          {operation === 'filter' && (
            <ShapeInput
              label="Selectivity"
              value={operationParams.filterSelectivity}
              onChange={(v) => setOperationParams(p => ({ ...p, filterSelectivity: v }))}
              min={0.01}
              max={1}
              step={0.01}
              description="Fraction of rows that pass the filter"
            />
          )}

          {operation === 'groupby' && (
            <ShapeInput
              label="Number of Groups"
              value={operationParams.groupByGroups}
              onChange={(v) => setOperationParams(p => ({ ...p, groupByGroups: v }))}
              min={1}
              max={10_000_000}
              step={100}
              description="Estimated number of unique groups"
            />
          )}

          {operation === 'join' && (
            <ShapeInput
              label="Right Table Rows"
              value={operationParams.joinRightRows}
              onChange={(v) => setOperationParams(p => ({ ...p, joinRightRows: v }))}
              min={100}
              max={100_000_000}
              step={1000}
              description="Number of rows in the table to join with"
            />
          )}

          {operation === 'repartition' && (
            <ShapeInput
              label="New Partitions"
              value={operationParams.newPartitions}
              onChange={(v) => setOperationParams(p => ({ ...p, newPartitions: v }))}
              min={1}
              max={10000}
              description="Target number of partitions"
            />
          )}
        </div>

        {/* Simulate button */}
        <button
          onClick={simulate}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Simulate
        </button>
      </div>

      {/* Result panel */}
      <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Simulation Results</h3>
        <ResultDisplay result={result} />
      </div>
    </div>
  );
}

export default ShapePlayground;
