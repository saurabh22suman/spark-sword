/**
 * Presets Bar
 * 
 * Per dataframe-playground-spec.md Section 10.1:
 * Mandatory presets:
 * - Small dim, large fact
 * - High skew aggregation
 * - Too many partitions
 * - Looks fine, runs slow
 * 
 * One click = instant learning
 */

'use client';

import type { DataShape } from './DataShapePanel';
import type { Operation } from './OperationsBuilder';

interface Preset {
  id: string;
  label: string;
  description: string;
  icon: string;
  shape: DataShape;
  operations: Operation[];
  lesson: string;
}

const PRESETS: Preset[] = [
  {
    id: 'dim-fact',
    label: 'Small Dim, Large Fact',
    description: 'Classic broadcast join scenario',
    icon: '🔗',
    shape: {
      totalSizeBytes: 100 * 1024 * 1024 * 1024, // 100GB fact table
      avgRowSizeBytes: 100,
      rows: 1_000_000_000,
      partitions: 1000,
      skewFactor: 1.0,
    },
    operations: [
      { id: 'p1-join', type: 'join', params: { right_rows: 10000, join_type: 'inner', broadcast_threshold: 10485760 } },
    ],
    lesson: 'When joining large fact with small dimension, broadcast the small table to avoid shuffle.',
  },
  {
    id: 'high-skew',
    label: 'High Skew Aggregation',
    description: 'GroupBy with data imbalance',
    icon: '📊',
    shape: {
      totalSizeBytes: 10 * 1024 * 1024 * 1024, // 10GB
      avgRowSizeBytes: 100,
      rows: 100_000_000,
      partitions: 200,
      skewFactor: 10.0, // High skew!
    },
    operations: [
      { id: 'p2-group', type: 'groupby', params: { num_groups: 100, partial_aggregation: true } },
    ],
    lesson: 'Skewed keys cause straggler tasks. Consider salting or two-phase aggregation.',
  },
  {
    id: 'too-many-partitions',
    label: 'Too Many Partitions',
    description: 'Small data, excessive parallelism',
    icon: '📦',
    shape: {
      totalSizeBytes: 100 * 1024 * 1024, // 100MB
      avgRowSizeBytes: 100,
      rows: 1_000_000,
      partitions: 10000, // Way too many!
      skewFactor: 1.0,
    },
    operations: [
      { id: 'p3-group', type: 'groupby', params: { num_groups: 50, partial_aggregation: true } },
    ],
    lesson: 'Too many small partitions create scheduling overhead. Coalesce to reduce partition count.',
  },
  {
    id: 'looks-fine-slow',
    label: 'Looks Fine, Runs Slow',
    description: 'Hidden shuffle problem',
    icon: '🐌',
    shape: {
      totalSizeBytes: 50 * 1024 * 1024 * 1024, // 50GB
      avgRowSizeBytes: 200,
      rows: 250_000_000,
      partitions: 500,
      skewFactor: 1.5,
    },
    operations: [
      { id: 'p4-group', type: 'groupby', params: { num_groups: 10000, partial_aggregation: false } },
      { id: 'p4-order', type: 'orderby', params: {} },
    ],
    lesson: 'Multiple wide transformations chain shuffles. Filter early to reduce data before expensive operations.',
  },
  {
    id: 'filter-first',
    label: 'Filter First Pattern',
    description: 'Reduce data before shuffle',
    icon: '🔍',
    shape: {
      totalSizeBytes: 100 * 1024 * 1024 * 1024, // 100GB
      avgRowSizeBytes: 100,
      rows: 1_000_000_000,
      partitions: 1000,
      skewFactor: 1.0,
    },
    operations: [
      { id: 'p5-filter', type: 'filter', params: { selectivity: 0.1 } },
      { id: 'p5-group', type: 'groupby', params: { num_groups: 1000, partial_aggregation: true } },
    ],
    lesson: 'Filtering before GroupBy reduces shuffle volume by 90%. Order matters!',
  },
  {
    id: 'window-danger',
    label: 'Window Without Partition',
    description: 'Dangerous window function',
    icon: '🪟',
    shape: {
      totalSizeBytes: 10 * 1024 * 1024 * 1024, // 10GB
      avgRowSizeBytes: 100,
      rows: 100_000_000,
      partitions: 200,
      skewFactor: 1.0,
    },
    operations: [
      { id: 'p6-window', type: 'window', params: { partition_columns: 0, has_order_by: true } },
    ],
    lesson: 'Window without partitionBy forces all data to single partition. Always add partitionBy!',
  },
];

interface PresetsBarProps {
  onApply: (shape: DataShape, operations: Operation[]) => void;
  className?: string;
}

export function PresetsBar({ onApply, className = '' }: PresetsBarProps) {
  return (
    <div className={`space-y-2 ${className}`} data-testid="presets-bar">
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        Quick Presets
      </h4>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onApply(preset.shape, preset.operations)}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 
                       bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800 
                       transition-all text-left"
            title={preset.lesson}
            data-testid={`preset-${preset.id}`}
          >
            <span className="text-lg">{preset.icon}</span>
            <div>
              <div className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                {preset.label}
              </div>
              <div className="text-xs text-slate-500">{preset.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PresetsBar;
