'use client';

/**
 * Config Simulator Component
 * 
 * Interactive UI for exploring Spark configuration impacts.
 * Allows users to see how different configs affect execution
 * with clear explanations of trade-offs.
 */

import { useState, useMemo } from 'react';
import { LearningHint } from '@/components/learning';

interface ConfigOption {
  name: string;
  category: string;
  description: string;
  defaultValue: string | number | boolean;
  suggestedValues: Array<{
    value: string | number | boolean;
    label: string;
    impact: string;
  }>;
  benefits: string[];
  drawbacks: string[];
  relevantFor: string[];
}

interface ConfigImpact {
  config: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  benefits: string[];
  drawbacks: string[];
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

interface ConfigSimulatorProps {
  className?: string;
}

// Common Spark configurations with their impacts
const SPARK_CONFIGS: ConfigOption[] = [
  {
    name: 'spark.sql.shuffle.partitions',
    category: 'Shuffle',
    description: 'Number of partitions used for shuffles (joins, aggregations)',
    defaultValue: 200,
    suggestedValues: [
      { value: 50, label: 'Small data (<10GB)', impact: 'Less overhead' },
      { value: 200, label: 'Default', impact: 'Balanced' },
      { value: 1000, label: 'Large data (>100GB)', impact: 'Better parallelism' },
      { value: 2000, label: 'Very large data', impact: 'Maximum parallelism' },
    ],
    benefits: ['Controls parallelism for wide transformations', 'Can reduce shuffle overhead'],
    drawbacks: ['Too high: small tasks, driver overhead', 'Too low: task stragglers, OOM'],
    relevantFor: ['groupBy', 'join', 'orderBy'],
  },
  {
    name: 'spark.sql.autoBroadcastJoinThreshold',
    category: 'Joins',
    description: 'Maximum size (bytes) for broadcast joins. Set to -1 to disable.',
    defaultValue: '10MB',
    suggestedValues: [
      { value: '-1', label: 'Disabled', impact: 'Force sort-merge join' },
      { value: '10MB', label: 'Default', impact: 'Small tables broadcast' },
      { value: '100MB', label: 'More broadcast', impact: 'Larger tables broadcast' },
      { value: '500MB', label: 'Aggressive', impact: 'Most joins are broadcast' },
    ],
    benefits: ['Broadcast joins avoid shuffle', 'Faster for small dimension tables'],
    drawbacks: ['Uses executor memory', 'OOM risk if threshold too high'],
    relevantFor: ['join', 'lookup tables'],
  },
  {
    name: 'spark.sql.adaptive.enabled',
    category: 'Adaptive',
    description: 'Enable Adaptive Query Execution for runtime optimization',
    defaultValue: true,
    suggestedValues: [
      { value: true, label: 'Enabled (recommended)', impact: 'Runtime optimization' },
      { value: false, label: 'Disabled', impact: 'Static query plan' },
    ],
    benefits: ['Automatic coalescing', 'Skew handling', 'Join strategy changes'],
    drawbacks: ['Some planning overhead', 'Less predictable plans'],
    relevantFor: ['all queries'],
  },
  {
    name: 'spark.sql.adaptive.coalescePartitions.enabled',
    category: 'Adaptive',
    description: 'Coalesce shuffle partitions when data is small',
    defaultValue: true,
    suggestedValues: [
      { value: true, label: 'Enabled', impact: 'Auto-reduce partitions' },
      { value: false, label: 'Disabled', impact: 'Keep all partitions' },
    ],
    benefits: ['Reduces small partitions', 'Less task overhead'],
    drawbacks: ['May create larger partitions', 'Less parallelism'],
    relevantFor: ['shuffle operations'],
  },
  {
    name: 'spark.sql.adaptive.skewJoin.enabled',
    category: 'Skew',
    description: 'Enable skew join optimization in AQE',
    defaultValue: true,
    suggestedValues: [
      { value: true, label: 'Enabled', impact: 'Split skewed partitions' },
      { value: false, label: 'Disabled', impact: 'No skew handling' },
    ],
    benefits: ['Splits large partitions', 'Prevents stragglers'],
    drawbacks: ['Additional shuffle overhead', 'Plan changes'],
    relevantFor: ['skewed joins'],
  },
  {
    name: 'spark.default.parallelism',
    category: 'Parallelism',
    description: 'Default number of partitions for RDD transformations',
    defaultValue: 'numCores * 2-3',
    suggestedValues: [
      { value: 100, label: 'Small cluster', impact: 'Lower parallelism' },
      { value: 200, label: 'Medium cluster', impact: 'Balanced' },
      { value: 500, label: 'Large cluster', impact: 'Higher parallelism' },
    ],
    benefits: ['Controls RDD parallelism', 'Affects repartition defaults'],
    drawbacks: ['Only affects RDDs', 'Not shuffle partitions'],
    relevantFor: ['RDD operations', 'sc.parallelize'],
  },
  {
    name: 'spark.memory.fraction',
    category: 'Memory',
    description: 'Fraction of heap used for execution and storage',
    defaultValue: 0.6,
    suggestedValues: [
      { value: 0.6, label: 'Default', impact: 'Balanced cache/execution' },
      { value: 0.7, label: 'More execution', impact: 'More memory for operations' },
      { value: 0.8, label: 'Aggressive', impact: 'Maximum execution memory' },
    ],
    benefits: ['More memory for shuffles/joins', 'Less spill to disk'],
    drawbacks: ['Less memory for user data', 'May affect caching'],
    relevantFor: ['memory-intensive operations'],
  },
  {
    name: 'spark.executor.memory',
    category: 'Memory',
    description: 'Amount of memory allocated to each executor',
    defaultValue: '4g',
    suggestedValues: [
      { value: '2g', label: 'Small (2GB)', impact: 'More executors, less memory each' },
      { value: '4g', label: 'Default (4GB)', impact: 'Balanced' },
      { value: '8g', label: 'Medium (8GB)', impact: 'Larger partitions supported' },
      { value: '16g', label: 'Large (16GB)', impact: 'Memory-heavy operations' },
    ],
    benefits: ['More memory for caching', 'Less spill to disk', 'Larger broadcast joins'],
    drawbacks: ['Fewer executors per node', 'Longer GC pauses', 'Memory waste if underutilized'],
    relevantFor: ['caching', 'broadcast joins', 'large aggregations'],
  },
  {
    name: 'spark.sql.files.maxPartitionBytes',
    category: 'I/O',
    description: 'Maximum bytes packed into a single partition when reading files',
    defaultValue: '128MB',
    suggestedValues: [
      { value: '64MB', label: 'More parallelism', impact: 'More, smaller tasks' },
      { value: '128MB', label: 'Default', impact: 'Balanced' },
      { value: '256MB', label: 'Fewer tasks', impact: 'Less overhead' },
    ],
    benefits: ['Controls read parallelism', 'Affects initial partitioning'],
    drawbacks: ['Too small: many tasks', 'Too large: less parallelism'],
    relevantFor: ['file reads', 'data loading'],
  },
];

function ConfigCard({
  config,
  selectedValue,
  onValueChange,
  isExpanded,
  onToggle,
}: {
  config: ConfigOption;
  selectedValue: string | number | boolean;
  onValueChange: (value: string | number | boolean) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const currentSuggestion = config.suggestedValues.find(s => String(s.value) === String(selectedValue));

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-blue-400">{config.name}</span>
              <span className="px-2 py-0.5 text-xs bg-slate-700 rounded text-slate-400">
                {config.category}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{config.description}</p>
          </div>
          <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700 pt-4">
          {/* Value selector */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wide">Select Value</label>
            <div className="grid grid-cols-2 gap-2">
              {config.suggestedValues.map((suggestion) => (
                <button
                  key={String(suggestion.value)}
                  onClick={() => onValueChange(suggestion.value)}
                  className={`
                    p-3 rounded border text-left transition-all
                    ${String(selectedValue) === String(suggestion.value)
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-600'}
                  `}
                >
                  <div className="font-mono text-sm text-white">{String(suggestion.value)}</div>
                  <div className="text-xs text-slate-400">{suggestion.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{suggestion.impact}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Current impact */}
          {currentSuggestion && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-xs text-blue-400 uppercase tracking-wide mb-1">
                Current Impact
              </div>
              <div className="text-sm text-white">{currentSuggestion.impact}</div>
            </div>
          )}

          {/* Benefits & Drawbacks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-green-400 uppercase tracking-wide mb-2">Benefits</div>
              <ul className="space-y-1">
                {config.benefits.map((benefit, idx) => (
                  <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-green-400">+</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-red-400 uppercase tracking-wide mb-2">Trade-offs</div>
              <ul className="space-y-1">
                {config.drawbacks.map((drawback, idx) => (
                  <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-red-400">-</span>
                    {drawback}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Relevant for */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Relevant For</div>
            <div className="flex flex-wrap gap-2">
              {config.relevantFor.map((item, idx) => (
                <span key={idx} className="px-2 py-1 text-xs bg-slate-700 rounded text-slate-400">
                  {item}
                </span>
              ))}
            </div>
          </div>
          
          {/* Learning hint for config understanding */}
          <LearningHint title="Why this matters">
            Every Spark configuration is a <strong>trade-off</strong>. There&apos;s no single &quot;best&quot; value - 
            the optimal setting depends on your data size, cluster resources, and workload pattern. 
            Experiment with different values and observe how they affect your specific jobs.
          </LearningHint>
        </div>
      )}
    </div>
  );
}

function ImpactSummary({ impacts }: { impacts: ConfigImpact[] }) {
  if (impacts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="text-3xl mb-2">⚙️</div>
        <p>Modify configuration values to see impact analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {impacts.map((impact, idx) => (
        <div key={idx} className="p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-blue-400">{impact.config}</span>
            <span className={`
              px-2 py-0.5 text-xs rounded
              ${impact.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                impact.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-orange-500/20 text-orange-400'}
            `}>
              {impact.confidence} confidence
            </span>
          </div>
          
          <div className="text-sm text-slate-400 mb-3">
            <span className="text-slate-500">{String(impact.oldValue)}</span>
            <span className="mx-2">→</span>
            <span className="text-white font-medium">{String(impact.newValue)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              {impact.benefits.map((b, i) => (
                <div key={i} className="text-green-400 flex items-start gap-1">
                  <span>✓</span> {b}
                </div>
              ))}
            </div>
            <div>
              {impact.drawbacks.map((d, i) => (
                <div key={i} className="text-orange-400 flex items-start gap-1">
                  <span>!</span> {d}
                </div>
              ))}
            </div>
          </div>

          {impact.notes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              {impact.notes.map((note, i) => (
                <p key={i} className="text-xs text-slate-500">{note}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ConfigSimulator({ className = '' }: ConfigSimulatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());
  const [configValues, setConfigValues] = useState<Record<string, string | number | boolean>>(() => {
    const initial: Record<string, string | number | boolean> = {};
    SPARK_CONFIGS.forEach(config => {
      initial[config.name] = config.defaultValue;
    });
    return initial;
  });

  const categories = ['all', ...Array.from(new Set(SPARK_CONFIGS.map(c => c.category)))];

  const filteredConfigs = useMemo(() => {
    if (selectedCategory === 'all') return SPARK_CONFIGS;
    return SPARK_CONFIGS.filter(c => c.category === selectedCategory);
  }, [selectedCategory]);

  const toggleExpand = (name: string) => {
    setExpandedConfigs(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const updateValue = (name: string, value: string | number | boolean) => {
    setConfigValues(prev => ({ ...prev, [name]: value }));
  };

  // Calculate impacts for changed configs
  const impacts = useMemo<ConfigImpact[]>(() => {
    const changed: ConfigImpact[] = [];
    
    SPARK_CONFIGS.forEach(config => {
      const currentValue = configValues[config.name];
      if (String(currentValue) !== String(config.defaultValue)) {
        changed.push({
          config: config.name,
          oldValue: config.defaultValue,
          newValue: currentValue,
          benefits: config.benefits,
          drawbacks: config.drawbacks,
          confidence: 'medium',
          notes: [`Changing from default (${String(config.defaultValue)}) to ${String(currentValue)}`],
        });
      }
    });

    return changed;
  }, [configValues]);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Config list */}
      <div className="lg:col-span-2 space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'}
              `}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Config cards */}
        <div className="space-y-3">
          {filteredConfigs.map((config) => (
            <ConfigCard
              key={config.name}
              config={config}
              selectedValue={configValues[config.name]}
              onValueChange={(value) => updateValue(config.name, value)}
              isExpanded={expandedConfigs.has(config.name)}
              onToggle={() => toggleExpand(config.name)}
            />
          ))}
        </div>
      </div>

      {/* Impact summary */}
      <div className="space-y-4">
        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 sticky top-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            Impact Summary
            {impacts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 rounded-full">
                {impacts.length} changes
              </span>
            )}
          </h3>
          <ImpactSummary impacts={impacts} />
          
          {impacts.length > 0 && (
            <button
              onClick={() => {
                const initial: Record<string, string | number | boolean> = {};
                SPARK_CONFIGS.forEach(config => {
                  initial[config.name] = config.defaultValue;
                });
                setConfigValues(initial);
              }}
              className="mt-4 w-full py-2 px-4 border border-slate-600 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Reset to Defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfigSimulator;
