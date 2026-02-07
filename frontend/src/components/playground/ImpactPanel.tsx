/**
 * Impact Panel
 * 
 * Per dataframe-playground-spec.md Section 8:
 * - Shows derived metrics: Shuffle Bytes, Task Count, Max Partition Size, Task Time Range
 * - Every metric has cause-effect annotation (what changed, why)
 */

'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImpactMetric {
  label: string;
  value: string;
  unit?: string;
  change?: {
    direction: 'up' | 'down' | 'neutral';
    reason: string;
  };
  warning?: string;
}

interface ImpactPanelProps {
  shuffleBytes: number;
  taskCount: number;
  maxPartitionSize: number;
  taskTimeRange: { min: number; max: number };
  previousState?: {
    shuffleBytes: number;
    taskCount: number;
    maxPartitionSize: number;
    taskTimeRange: { min: number; max: number };
  };
  dominantFactor?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function MetricCard({
  label,
  value,
  icon,
  change,
  warning,
  color = 'default',
}: {
  label: string;
  value: string;
  icon: string;
  change?: { direction: 'up' | 'down' | 'neutral'; reason: string };
  warning?: string;
  color?: 'default' | 'good' | 'warning' | 'bad';
}) {
  const colorClasses = {
    default: 'text-white',
    good: 'text-green-400',
    warning: 'text-yellow-400',
    bad: 'text-red-400',
  };

  const changeIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  const changeColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    neutral: 'text-slate-400',
  };

  return (
    <div className="p-3 bg-slate-800/50 rounded border border-slate-700" data-testid="impact-metric">
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
        <span className="text-sm">{icon}</span>
      </div>
      
      <div className={`text-xl font-semibold ${colorClasses[color]}`}>
        {value}
      </div>

      {/* Change indicator with reason */}
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${changeColors[change.direction]}`}>
          <span>{changeIcons[change.direction]}</span>
          <span className="text-slate-400">{change.reason}</span>
        </div>
      )}

      {/* Warning if applicable */}
      {warning && (
        <div className="mt-2 text-xs text-yellow-400">
          ⚠️ {warning}
        </div>
      )}
    </div>
  );
}

export function ImpactPanel({
  shuffleBytes,
  taskCount,
  maxPartitionSize,
  taskTimeRange,
  previousState,
  dominantFactor,
  className = '',
}: ImpactPanelProps) {
  // Calculate changes if we have previous state
  const shuffleChange = previousState && previousState.shuffleBytes !== shuffleBytes
    ? {
        direction: shuffleBytes > previousState.shuffleBytes ? 'up' as const : 'down' as const,
        reason: shuffleBytes > previousState.shuffleBytes 
          ? `+${formatBytes(shuffleBytes - previousState.shuffleBytes)} from operation`
          : `-${formatBytes(previousState.shuffleBytes - shuffleBytes)} reduced`,
      }
    : undefined;

  const taskChange = previousState && previousState.taskCount !== taskCount
    ? {
        direction: taskCount > previousState.taskCount ? 'up' as const : 'down' as const,
        reason: `${taskCount > previousState.taskCount ? '+' : ''}${taskCount - previousState.taskCount} tasks`,
      }
    : undefined;

  // Determine colors based on thresholds
  const shuffleColor = shuffleBytes === 0 ? 'good' : shuffleBytes > 1024 * 1024 * 1024 ? 'warning' : 'default';
  const partitionColor = maxPartitionSize > 2 * 1024 * 1024 * 1024 ? 'bad' : 
                         maxPartitionSize > 512 * 1024 * 1024 ? 'warning' : 'default';
  const taskTimeColor = taskTimeRange.max > taskTimeRange.min * 10 ? 'warning' : 'default';

  // Warnings
  const partitionWarning = maxPartitionSize > 2 * 1024 * 1024 * 1024 
    ? 'May cause disk spill' 
    : undefined;
  const stragglerWarning = taskTimeRange.max > taskTimeRange.min * 5
    ? 'Possible stragglers (high variance)'
    : undefined;

  return (
    <div className={`space-y-4 ${className}`} data-testid="impact-panel">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        Impact
      </h3>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Shuffle Bytes"
          value={formatBytes(shuffleBytes)}
          icon="🔀"
          color={shuffleColor}
          change={shuffleChange}
        />

        <MetricCard
          label="Task Count"
          value={taskCount.toLocaleString()}
          icon="📋"
          change={taskChange}
        />

        <MetricCard
          label="Max Partition"
          value={formatBytes(maxPartitionSize)}
          icon="📦"
          color={partitionColor}
          warning={partitionWarning}
        />

        <MetricCard
          label="Task Time Range"
          value={`${formatMs(taskTimeRange.min)} - ${formatMs(taskTimeRange.max)}`}
          icon="⏱️"
          color={taskTimeColor}
          warning={stragglerWarning}
        />
      </div>

      {/* Dominant factor explanation */}
      {dominantFactor && (
        <div className="p-3 bg-slate-900/50 rounded border border-slate-700">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Why This Impact?
          </div>
          <p className="text-sm text-slate-300">{dominantFactor}</p>
        </div>
      )}
    </div>
  );
}

export default ImpactPanel;
