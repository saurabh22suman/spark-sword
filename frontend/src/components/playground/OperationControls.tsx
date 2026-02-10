/**
 * Operation Controls Panel
 * 
 * Per dataframe-playground-spec.md Section 6:
 * Controls appear ONLY when an operation is selected.
 * Each operation has specific, contextual controls.
 */

'use client';

import type { Operation } from './OperationsBuilder';
import { SelectivityScrubber } from './SelectivityScrubber';

interface OperationControlsProps {
  operation: Operation;
  onChange: (operation: Operation) => void;
  inputRows?: number; // For showing impact of operations
  className?: string;
}

function SliderControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  description,
  format,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  format?: (value: number) => string;
}) {
  const displayValue = format ? format(value) : value.toString();
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-sm text-slate-400">
          {displayValue}{unit ? ` ${unit}` : ''}
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
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}

function ToggleControl({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <button
          onClick={() => onChange(!value)}
          className={`w-10 h-5 rounded-full transition-colors ${
            value ? 'bg-blue-500' : 'bg-slate-600'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function OperationControls({ operation, onChange, inputRows, className = '' }: OperationControlsProps) {
  const updateParam = (key: string, value: number | string | boolean) => {
    onChange({
      ...operation,
      params: { ...operation.params, [key]: value },
    });
  };

  const renderControls = () => {
    switch (operation.type) {
      case 'filter':
        return (
          <SelectivityScrubber
            value={operation.params.selectivity as number}
            onChange={(v) => updateParam('selectivity', v)}
            inputRows={inputRows}
          />
        );

      case 'groupby':
        return (
          <>
            <SliderControl
              label="Key Cardinality (Groups)"
              value={operation.params.num_groups as number}
              onChange={(v) => updateParam('num_groups', v)}
              min={1}
              max={10_000_000}
              step={100}
              format={formatNumber}
              description="Estimated number of unique group keys"
            />
            <ToggleControl
              label="Partial Aggregation"
              value={operation.params.partial_aggregation as boolean}
              onChange={(v) => updateParam('partial_aggregation', v)}
              description="Aggregate locally before shuffle (reduces data)"
            />
          </>
        );

      case 'join':
        return (
          <>
            <SliderControl
              label="Right Table Rows"
              value={operation.params.right_rows as number}
              onChange={(v) => updateParam('right_rows', v)}
              min={100}
              max={100_000_000}
              step={1000}
              format={formatNumber}
              description="Number of rows in the table to join with"
            />
            <SelectControl
              label="Join Type"
              value={operation.params.join_type as string}
              onChange={(v) => updateParam('join_type', v)}
              options={[
                { value: 'inner', label: 'Inner Join' },
                { value: 'left', label: 'Left Join' },
                { value: 'right', label: 'Right Join' },
                { value: 'outer', label: 'Full Outer Join' },
              ]}
            />
            <SliderControl
              label="Broadcast Threshold"
              value={operation.params.broadcast_threshold as number}
              onChange={(v) => updateParam('broadcast_threshold', v)}
              min={1024 * 1024}
              max={1024 * 1024 * 1024}
              step={1024 * 1024}
              format={formatBytes}
              description="Max table size for broadcast join"
            />
          </>
        );

      case 'write':
        return (
          <>
            <SliderControl
              label="Output Partitions"
              value={operation.params.output_partitions as number}
              onChange={(v) => updateParam('output_partitions', v)}
              min={1}
              max={10000}
              description="Number of output files/partitions"
            />
            <SliderControl
              label="Target File Size"
              value={operation.params.file_size_target as number}
              onChange={(v) => updateParam('file_size_target', v)}
              min={10 * 1024 * 1024}
              max={1024 * 1024 * 1024}
              step={10 * 1024 * 1024}
              format={formatBytes}
              description="Target size for each output file"
            />
          </>
        );

      case 'window':
        return (
          <>
            <SliderControl
              label="Partition Columns"
              value={operation.params.partition_columns as number}
              onChange={(v) => updateParam('partition_columns', v)}
              min={0}
              max={5}
              description="0 = no partitionBy (dangerous!)"
            />
            <ToggleControl
              label="Has ORDER BY"
              value={operation.params.has_order_by as boolean}
              onChange={(v) => updateParam('has_order_by', v)}
              description="Window includes ordering within partitions"
            />
          </>
        );

      case 'distinct':
        return (
          <SliderControl
            label="Estimated Duplicates"
            value={operation.params.duplicates_ratio as number}
            onChange={(v) => updateParam('duplicates_ratio', v)}
            min={0}
            max={0.99}
            step={0.01}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            description="Fraction of rows that are duplicates"
          />
        );

      case 'union':
        return (
          <SliderControl
            label="Other DataFrame Rows"
            value={operation.params.other_rows as number}
            onChange={(v) => updateParam('other_rows', v)}
            min={1000}
            max={100_000_000}
            step={1000}
            format={formatNumber}
            description="Rows in the DataFrame to union with"
          />
        );

      case 'repartition':
        return (
          <SliderControl
            label="New Partitions"
            value={operation.params.new_partitions as number}
            onChange={(v) => updateParam('new_partitions', v)}
            min={1}
            max={10000}
            description="Target number of partitions (causes full shuffle)"
          />
        );

      case 'coalesce':
        return (
          <SliderControl
            label="New Partitions"
            value={operation.params.new_partitions as number}
            onChange={(v) => updateParam('new_partitions', v)}
            min={1}
            max={1000}
            description="Target partitions (can only reduce, no shuffle)"
          />
        );

      case 'cache':
        return (
          <SelectControl
            label="Storage Level"
            value={operation.params.storage_level as string}
            onChange={(v) => updateParam('storage_level', v)}
            options={[
              { value: 'MEMORY_ONLY', label: 'Memory Only' },
              { value: 'MEMORY_AND_DISK', label: 'Memory + Disk' },
              { value: 'DISK_ONLY', label: 'Disk Only' },
            ]}
            description="Where to store cached data"
          />
        );

      case 'orderby':
        return (
          <div className="text-sm text-slate-400 p-3 bg-slate-800/50 rounded">
            <p>OrderBy requires a full shuffle for global sorting.</p>
            <p className="mt-2 text-xs text-slate-500">
              Spark uses range partitioning to achieve sorted output.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-sm text-slate-500">
            No parameters for this operation
          </div>
        );
    }
  };

  const getOperationTitle = () => {
    const titles: Record<string, string> = {
      filter: '🔍 Filter Settings',
      groupby: '📊 GroupBy Settings',
      join: '🔗 Join Settings',
      write: '💾 Write Settings',
      window: '🪟 Window Settings',
      distinct: '🎯 Distinct Settings',
      union: '➕ Union Settings',
      repartition: '📦 Repartition Settings',
      coalesce: '🔽 Coalesce Settings',
      cache: '💎 Cache Settings',
      orderby: '↕️ OrderBy Settings',
    };
    return titles[operation.type] || 'Operation Settings';
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="operation-controls">
      <h4 className="text-sm font-semibold text-slate-300">{getOperationTitle()}</h4>
      <div className="space-y-4">
        {renderControls()}
      </div>
    </div>
  );
}

export default OperationControls;
