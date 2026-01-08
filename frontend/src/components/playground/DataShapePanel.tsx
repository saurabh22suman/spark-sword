/**
 * Global Data Shape Panel
 * 
 * Per dataframe-playground-spec.md Section 4.1:
 * - Total Data Size (MB-TB) - Primary mental model
 * - Avg Row Size - Secondary (derived by default)
 * - Row Count - Derived, editable in Expert Mode
 * - Partitions - Parallelism control
 * - Skew Factor - Straggler modeling
 * 
 * Changes here affect ALL operations.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { PartitionBars } from './PartitionBars';

export interface DataShape {
  totalSizeBytes: number;
  avgRowSizeBytes: number;
  rows: number;
  partitions: number;
  skewFactor: number;
}

interface DataShapePanelProps {
  shape: DataShape;
  onChange: (shape: DataShape) => void;
  expertMode?: boolean;
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

// Size presets in bytes
const SIZE_PRESETS = [
  { label: '100 MB', value: 100 * 1024 * 1024 },
  { label: '1 GB', value: 1024 * 1024 * 1024 },
  { label: '10 GB', value: 10 * 1024 * 1024 * 1024 },
  { label: '100 GB', value: 100 * 1024 * 1024 * 1024 },
  { label: '1 TB', value: 1024 * 1024 * 1024 * 1024 },
];

export function DataShapePanel({
  shape,
  onChange,
  expertMode = false,
  className = '',
}: DataShapePanelProps) {
  // Derive row count from size and avg row size
  const derivedRows = Math.floor(shape.totalSizeBytes / shape.avgRowSizeBytes);
  const partitionSizeBytes = shape.partitions > 0 
    ? shape.totalSizeBytes / shape.partitions 
    : shape.totalSizeBytes;

  // Update derived values when primary values change
  const updateSize = useCallback((totalSizeBytes: number) => {
    const rows = Math.floor(totalSizeBytes / shape.avgRowSizeBytes);
    onChange({ ...shape, totalSizeBytes, rows });
  }, [shape, onChange]);

  const updateRowSize = useCallback((avgRowSizeBytes: number) => {
    const rows = Math.floor(shape.totalSizeBytes / avgRowSizeBytes);
    onChange({ ...shape, avgRowSizeBytes, rows });
  }, [shape, onChange]);

  const updatePartitions = useCallback((partitions: number) => {
    onChange({ ...shape, partitions });
  }, [shape, onChange]);

  const updateSkew = useCallback((skewFactor: number) => {
    onChange({ ...shape, skewFactor });
  }, [shape, onChange]);

  // In expert mode, allow direct row count editing
  const updateRows = useCallback((rows: number) => {
    const avgRowSizeBytes = Math.floor(shape.totalSizeBytes / rows);
    onChange({ ...shape, rows, avgRowSizeBytes });
  }, [shape, onChange]);

  return (
    <div className={`space-y-4 ${className}`} data-testid="data-shape-panel">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-lg font-semibold text-white">{formatBytes(shape.totalSizeBytes)}</div>
          <div className="text-xs text-slate-500">Total Size</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-lg font-semibold text-white">{formatNumber(derivedRows)}</div>
          <div className="text-xs text-slate-500">Rows</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-lg font-semibold text-white">{shape.partitions}</div>
          <div className="text-xs text-slate-500">Partitions</div>
        </div>
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="text-lg font-semibold text-white">{formatBytes(partitionSizeBytes)}</div>
          <div className="text-xs text-slate-500">Per Partition</div>
        </div>
      </div>

      {/* Total Data Size - Primary control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Total Data Size</label>
          <span className="text-sm text-white font-medium">{formatBytes(shape.totalSizeBytes)}</span>
        </div>
        <div className="flex gap-1">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => updateSize(preset.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                Math.abs(shape.totalSizeBytes - preset.value) < preset.value * 0.1
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={10 * 1024 * 1024}  // 10 MB
          max={10 * 1024 * 1024 * 1024 * 1024}  // 10 TB
          step={10 * 1024 * 1024}  // 10 MB steps
          value={shape.totalSizeBytes}
          onChange={(e) => updateSize(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Avg Row Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Avg Row Size</label>
          <span className="text-sm text-slate-400">{shape.avgRowSizeBytes} bytes</span>
        </div>
        <input
          type="range"
          min={10}
          max={10000}
          step={10}
          value={shape.avgRowSizeBytes}
          onChange={(e) => updateRowSize(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Row Count - only in expert mode */}
      {expertMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Row Count</label>
            <span className="text-sm text-slate-400">{formatNumber(shape.rows)}</span>
          </div>
          <input
            type="range"
            min={1000}
            max={10_000_000_000}
            step={1000}
            value={shape.rows}
            onChange={(e) => updateRows(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {/* Partitions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Partitions</label>
          <span className="text-sm text-slate-400">{shape.partitions}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10000}
          step={1}
          value={shape.partitions}
          onChange={(e) => updatePartitions(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Skew Factor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Skew Factor</label>
          <span className={`text-sm font-medium ${
            shape.skewFactor > 5 ? 'text-red-400' : 
            shape.skewFactor > 2 ? 'text-yellow-400' : 'text-slate-400'
          }`}>
            {shape.skewFactor.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={0.5}
          value={shape.skewFactor}
          onChange={(e) => updateSkew(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <p className="text-xs text-slate-500">
          How much larger the largest partition is vs average (1 = uniform)
        </p>
      </div>

      {/* Visual partition bars */}
      <PartitionBars
        partitions={shape.partitions}
        skewFactor={shape.skewFactor}
        avgPartitionSizeBytes={partitionSizeBytes}
      />
    </div>
  );
}

export default DataShapePanel;
