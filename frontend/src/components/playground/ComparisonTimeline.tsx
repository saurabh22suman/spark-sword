/**
 * Comparison Timeline
 * 
 * Per dataframe-playground-spec.md Section 9:
 * - Pin any state as snapshot
 * - Compare against current
 * - Highlight deltas
 * - Timeline shows last N interactions
 * - Click to revert
 */

'use client';

import { useState } from 'react';
import type { DataShape } from './DataShapePanel';
import type { Operation } from './OperationsBuilder';

interface PlaygroundSnapshot {
  id: string;
  timestamp: number;
  label: string;
  shape: DataShape;
  operations: Operation[];
  metrics: {
    shuffleBytes: number;
    taskCount: number;
    maxPartitionSize: number;
  };
}

interface ComparisonTimelineProps {
  currentShape: DataShape;
  currentOperations: Operation[];
  currentMetrics: {
    shuffleBytes: number;
    taskCount: number;
    maxPartitionSize: number;
  };
  onRevert: (shape: DataShape, operations: Operation[]) => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

export function ComparisonTimeline({
  currentShape,
  currentOperations,
  currentMetrics,
  onRevert,
  className = '',
}: ComparisonTimelineProps) {
  const [snapshots, setSnapshots] = useState<PlaygroundSnapshot[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const pinCurrentState = () => {
    const snapshot: PlaygroundSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: Date.now(),
      label: `Snapshot ${snapshots.length + 1}`,
      shape: { ...currentShape },
      operations: currentOperations.map(op => ({ ...op, params: { ...op.params } })),
      metrics: { ...currentMetrics },
    };
    setSnapshots(prev => [snapshot, ...prev].slice(0, 10)); // Keep last 10
  };

  const pinnedSnapshot = snapshots.find(s => s.id === pinnedId);

  // Calculate delta if we have a pinned snapshot
  const delta = pinnedSnapshot ? {
    shuffleBytes: currentMetrics.shuffleBytes - pinnedSnapshot.metrics.shuffleBytes,
    taskCount: currentMetrics.taskCount - pinnedSnapshot.metrics.taskCount,
    maxPartitionSize: currentMetrics.maxPartitionSize - pinnedSnapshot.metrics.maxPartitionSize,
  } : null;

  return (
    <div className={`space-y-3 ${className}`} data-testid="comparison-timeline">
      {/* Header with pin button */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Comparison & History
        </h4>
        <button
          onClick={pinCurrentState}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded 
                     bg-blue-500/10 text-blue-400 border border-blue-500/30
                     hover:bg-blue-500/20 transition-colors"
        >
          📌 Pin State
        </button>
      </div>

      {/* Delta comparison if pinned */}
      {delta && pinnedSnapshot && (
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Comparing to: {pinnedSnapshot.label}</span>
            <button
              onClick={() => setPinnedId(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕ Clear
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-xs text-slate-500">Shuffle</div>
              <div className={delta.shuffleBytes > 0 ? 'text-red-400' : delta.shuffleBytes < 0 ? 'text-green-400' : 'text-slate-400'}>
                {delta.shuffleBytes > 0 ? '+' : ''}{formatBytes(delta.shuffleBytes)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Tasks</div>
              <div className={delta.taskCount > 0 ? 'text-yellow-400' : delta.taskCount < 0 ? 'text-green-400' : 'text-slate-400'}>
                {delta.taskCount > 0 ? '+' : ''}{delta.taskCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Max Part.</div>
              <div className={delta.maxPartitionSize > 0 ? 'text-yellow-400' : delta.maxPartitionSize < 0 ? 'text-green-400' : 'text-slate-400'}>
                {delta.maxPartitionSize > 0 ? '+' : ''}{formatBytes(delta.maxPartitionSize)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {snapshots.length > 0 && (
        <div className="space-y-1">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-all
                         ${pinnedId === snapshot.id 
                           ? 'bg-blue-500/10 border border-blue-500/30' 
                           : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/50'
                         }`}
            >
              <button
                onClick={() => setPinnedId(pinnedId === snapshot.id ? null : snapshot.id)}
                className="text-slate-500 hover:text-blue-400"
                title={pinnedId === snapshot.id ? 'Unpin' : 'Pin for comparison'}
              >
                {pinnedId === snapshot.id ? '📌' : '○'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-slate-300 truncate">{snapshot.label}</div>
                <div className="text-xs text-slate-500">
                  {snapshot.operations.length} ops · {formatBytes(snapshot.metrics.shuffleBytes)} shuffle
                </div>
              </div>
              <span className="text-xs text-slate-600">{formatTime(snapshot.timestamp)}</span>
              <button
                onClick={() => onRevert(snapshot.shape, snapshot.operations)}
                className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded 
                           hover:bg-slate-700 transition-colors"
                title="Revert to this state"
              >
                ↩️
              </button>
            </div>
          ))}
        </div>
      )}

      {snapshots.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-2">
          Pin states to compare different configurations
        </p>
      )}
    </div>
  );
}

export default ComparisonTimeline;
