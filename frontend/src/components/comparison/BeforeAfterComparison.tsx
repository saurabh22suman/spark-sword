'use client';

/**
 * Before/After Comparison Component
 * 
 * Shows side-by-side comparison of current execution vs simulated changes.
 * Implements Phase 4 of work-ahead: "Teach causality"
 * 
 * This is explanatory, not predictive.
 */

import { useState, useMemo } from 'react';

interface MetricComparison {
  label: string;
  before: number;
  after: number;
  unit: 'bytes' | 'ms' | 'count' | 'percent';
  lowerIsBetter: boolean;
}

interface ComparisonScenario {
  id: string;
  name: string;
  description: string;
  changes: string[];
  metrics: MetricComparison[];
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

interface BeforeAfterComparisonProps {
  currentMetrics: {
    shuffleBytes: number;
    spillBytes: number;
    taskDurationMs: number;
    partitions: number;
    stages: number;
  };
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatValue(value: number, unit: string): string {
  switch (unit) {
    case 'bytes':
      return formatBytes(value);
    case 'ms':
      return formatDuration(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
}

function calculateChange(before: number, after: number): { percent: number; direction: 'up' | 'down' | 'same' } {
  if (before === 0) return { percent: after > 0 ? 100 : 0, direction: after > 0 ? 'up' : 'same' };
  const percent = ((after - before) / before) * 100;
  return {
    percent: Math.abs(percent),
    direction: percent > 1 ? 'up' : percent < -1 ? 'down' : 'same',
  };
}

function MetricRow({ metric }: { metric: MetricComparison }) {
  const change = calculateChange(metric.before, metric.after);
  const isImprovement = 
    (metric.lowerIsBetter && change.direction === 'down') ||
    (!metric.lowerIsBetter && change.direction === 'up');
  const isRegression = 
    (metric.lowerIsBetter && change.direction === 'up') ||
    (!metric.lowerIsBetter && change.direction === 'down');

  return (
    <div className="flex items-center py-3 border-b border-slate-700 last:border-0">
      {/* Label */}
      <div className="w-1/4 text-sm text-slate-400">{metric.label}</div>
      
      {/* Before */}
      <div className="w-1/4 text-right font-mono text-slate-300">
        {formatValue(metric.before, metric.unit)}
      </div>
      
      {/* Arrow / Change */}
      <div className="w-1/4 flex justify-center items-center gap-2">
        <span className={`
          text-lg
          ${change.direction === 'same' ? 'text-slate-500' : ''}
          ${isImprovement ? 'text-green-400' : ''}
          ${isRegression ? 'text-red-400' : ''}
        `}>
          {change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→'}
        </span>
        {change.direction !== 'same' && (
          <span className={`
            text-xs font-medium
            ${isImprovement ? 'text-green-400' : ''}
            ${isRegression ? 'text-red-400' : ''}
          `}>
            {change.percent.toFixed(0)}%
          </span>
        )}
      </div>
      
      {/* After */}
      <div className={`
        w-1/4 text-right font-mono
        ${isImprovement ? 'text-green-400' : ''}
        ${isRegression ? 'text-red-400' : ''}
        ${change.direction === 'same' ? 'text-slate-300' : ''}
      `}>
        {formatValue(metric.after, metric.unit)}
      </div>
    </div>
  );
}

function ScenarioCard({ 
  scenario, 
  isSelected, 
  onClick 
}: { 
  scenario: ComparisonScenario; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const improvements = scenario.metrics.filter(m => {
    const change = calculateChange(m.before, m.after);
    return (m.lowerIsBetter && change.direction === 'down') ||
           (!m.lowerIsBetter && change.direction === 'up');
  }).length;

  const regressions = scenario.metrics.filter(m => {
    const change = calculateChange(m.before, m.after);
    return (m.lowerIsBetter && change.direction === 'up') ||
           (!m.lowerIsBetter && change.direction === 'down');
  }).length;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-lg border transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-white">{scenario.name}</div>
          <div className="text-xs text-slate-500 mt-1">{scenario.description}</div>
        </div>
        <span className={`
          px-2 py-0.5 text-xs rounded
          ${scenario.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
            scenario.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-orange-500/20 text-orange-400'}
        `}>
          {scenario.confidence}
        </span>
      </div>
      
      <div className="flex gap-4 mt-2 text-xs">
        {improvements > 0 && (
          <span className="text-green-400">
            ✓ {improvements} improvement{improvements > 1 ? 's' : ''}
          </span>
        )}
        {regressions > 0 && (
          <span className="text-red-400">
            ⚠ {regressions} trade-off{regressions > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}

export function BeforeAfterComparison({
  currentMetrics,
  className = '',
}: BeforeAfterComparisonProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Generate comparison scenarios based on current metrics
  const scenarios = useMemo<ComparisonScenario[]>(() => {
    const result: ComparisonScenario[] = [];

    // Scenario 1: Increase shuffle partitions (if large shuffle)
    if (currentMetrics.shuffleBytes > 100 * 1024 * 1024) { // > 100MB
      result.push({
        id: 'increase-partitions',
        name: 'Increase Shuffle Partitions',
        description: 'Double spark.sql.shuffle.partitions from current setting',
        changes: [
          'spark.sql.shuffle.partitions: 200 → 400',
        ],
        metrics: [
          { label: 'Task Duration', before: currentMetrics.taskDurationMs, after: currentMetrics.taskDurationMs * 0.6, unit: 'ms', lowerIsBetter: true },
          { label: 'Partition Size', before: currentMetrics.shuffleBytes / currentMetrics.partitions, after: currentMetrics.shuffleBytes / (currentMetrics.partitions * 2), unit: 'bytes', lowerIsBetter: true },
          { label: 'Stage Count', before: currentMetrics.stages, after: currentMetrics.stages, unit: 'count', lowerIsBetter: true },
          { label: 'Scheduler Overhead', before: 0, after: 15, unit: 'percent', lowerIsBetter: true },
        ],
        confidence: 'medium',
        notes: [
          'More partitions = smaller tasks = less memory pressure',
          'Trade-off: more scheduling overhead',
        ],
      });
    }

    // Scenario 2: Enable broadcast join (if spill detected)
    if (currentMetrics.spillBytes > 0) {
      result.push({
        id: 'broadcast-join',
        name: 'Use Broadcast Join',
        description: 'Increase broadcast threshold to avoid shuffle join',
        changes: [
          'spark.sql.autoBroadcastJoinThreshold: 10MB → 100MB',
        ],
        metrics: [
          { label: 'Shuffle Bytes', before: currentMetrics.shuffleBytes, after: currentMetrics.shuffleBytes * 0.3, unit: 'bytes', lowerIsBetter: true },
          { label: 'Spill', before: currentMetrics.spillBytes, after: 0, unit: 'bytes', lowerIsBetter: true },
          { label: 'Memory Usage', before: 60, after: 80, unit: 'percent', lowerIsBetter: true },
          { label: 'Task Duration', before: currentMetrics.taskDurationMs, after: currentMetrics.taskDurationMs * 0.5, unit: 'ms', lowerIsBetter: true },
        ],
        confidence: 'high',
        notes: [
          'Broadcast eliminates shuffle for small tables',
          'Trade-off: higher executor memory usage',
          'Only effective if one side fits in memory',
        ],
      });
    }

    // Scenario 3: Coalesce before write
    result.push({
      id: 'coalesce-output',
      name: 'Coalesce Output Partitions',
      description: 'Reduce output partitions before writing',
      changes: [
        '.coalesce(100) before .write()',
      ],
      metrics: [
        { label: 'Output Files', before: currentMetrics.partitions, after: 100, unit: 'count', lowerIsBetter: true },
        { label: 'File Overhead', before: currentMetrics.partitions * 1024, after: 100 * 1024, unit: 'bytes', lowerIsBetter: true },
        { label: 'Write Parallelism', before: 100, after: 50, unit: 'percent', lowerIsBetter: false },
      ],
      confidence: 'high',
      notes: [
        'Fewer files = faster reads downstream',
        'Trade-off: reduced write parallelism',
        'Use coalesce (not repartition) to avoid shuffle',
      ],
    });

    // Scenario 4: Enable AQE
    result.push({
      id: 'enable-aqe',
      name: 'Enable Adaptive Query Execution',
      description: 'Let Spark optimize at runtime',
      changes: [
        'spark.sql.adaptive.enabled: true',
        'spark.sql.adaptive.coalescePartitions.enabled: true',
        'spark.sql.adaptive.skewJoin.enabled: true',
      ],
      metrics: [
        { label: 'Partition Count', before: currentMetrics.partitions, after: Math.min(currentMetrics.partitions, 50), unit: 'count', lowerIsBetter: false },
        { label: 'Shuffle Bytes', before: currentMetrics.shuffleBytes, after: currentMetrics.shuffleBytes * 0.8, unit: 'bytes', lowerIsBetter: true },
        { label: 'Skew Handling', before: 0, after: 100, unit: 'percent', lowerIsBetter: false },
      ],
      confidence: 'medium',
      notes: [
        'AQE auto-coalesces small partitions',
        'Handles skew by splitting large partitions',
        'Trade-off: slightly less predictable plans',
      ],
    });

    return result;
  }, [currentMetrics]);

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Scenarios list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">What-If Scenarios</h3>
        <p className="text-sm text-slate-400">
          Explore how changes might affect your job. These are <span className="text-yellow-400">estimates</span>, 
          not guarantees.
        </p>
        
        <div className="space-y-2">
          {scenarios.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isSelected={selectedScenarioId === scenario.id}
              onClick={() => setSelectedScenarioId(scenario.id)}
            />
          ))}
        </div>
      </div>

      {/* Comparison view */}
      <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        {selectedScenario ? (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{selectedScenario.name}</h3>
                <span className={`
                  px-2 py-0.5 text-xs rounded
                  ${selectedScenario.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                    selectedScenario.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-orange-500/20 text-orange-400'}
                `}>
                  {selectedScenario.confidence} confidence
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{selectedScenario.description}</p>
            </div>

            {/* Changes */}
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Configuration Changes</div>
              <div className="space-y-1">
                {selectedScenario.changes.map((change, idx) => (
                  <div key={idx} className="font-mono text-sm text-blue-400">
                    {change}
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics comparison */}
            <div>
              <div className="flex items-center text-xs text-slate-500 uppercase tracking-wide mb-2">
                <span className="w-1/4">Metric</span>
                <span className="w-1/4 text-right">Before</span>
                <span className="w-1/4 text-center">Change</span>
                <span className="w-1/4 text-right">After</span>
              </div>
              <div className="bg-slate-800/30 rounded-lg">
                {selectedScenario.metrics.map((metric, idx) => (
                  <MetricRow key={idx} metric={metric} />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-xs text-yellow-400 uppercase tracking-wide mb-2">Important Notes</div>
              <ul className="space-y-1">
                {selectedScenario.notes.map((note, idx) => (
                  <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-slate-500 text-center">
              These estimates are based on typical Spark behavior. Actual results depend on data characteristics, 
              cluster configuration, and runtime conditions.
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">🔬</div>
            <p className="text-lg">Select a scenario to compare</p>
            <p className="text-sm mt-2">See how changes might affect execution</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BeforeAfterComparison;
