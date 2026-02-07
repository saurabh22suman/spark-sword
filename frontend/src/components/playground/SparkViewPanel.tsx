/**
 * Spark View Panel
 * 
 * Per dataframe-playground-spec.md Section 7:
 * - Mini Execution DAG
 * - Stage boundaries
 * - Shuffle points
 * - Spark Decision Box (mandatory)
 *   - Join strategy
 *   - Shuffle necessity
 *   - Dominant cost driver
 *   - "Spark chose this because..."
 */

'use client';

import type { Operation } from './OperationsBuilder';

interface ChainDAGNode {
  label: string;
  node_type: string;
  stage: number;
}

interface SparkViewPanelProps {
  operations: Operation[];
  chainResult?: {
    stage_count: number;
    total_shuffle_bytes: number;
    dag?: {
      nodes: ChainDAGNode[];
    };
  };
  sparkDecision?: {
    strategy: string;
    explanation: string;
    dominantFactor: string;
    confidence: 'high' | 'medium' | 'low';
  };
  className?: string;
}

// Node type styling
const NODE_STYLES: Record<string, { icon: string; bg: string; border: string }> = {
  read: { icon: '📖', bg: 'bg-green-500/20', border: 'border-green-500/50' },
  narrow_op: { icon: '🔍', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
  shuffle: { icon: '🔀', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
  filter: { icon: '🔍', bg: 'bg-green-500/20', border: 'border-green-500/50' },
  groupby: { icon: '📊', bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
  join: { icon: '🔗', bg: 'bg-purple-500/20', border: 'border-purple-500/50' },
  write: { icon: '💾', bg: 'bg-pink-500/20', border: 'border-pink-500/50' },
  window: { icon: '🪟', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50' },
  orderby: { icon: '↕️', bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
  distinct: { icon: '🎯', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
  repartition: { icon: '📦', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
  cache: { icon: '💎', bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
  union: { icon: '➕', bg: 'bg-green-500/20', border: 'border-green-500/50' },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function MiniDAG({ nodes, operations: _operations }: { nodes: ChainDAGNode[]; operations: Operation[] }) {
  let lastStage = -1;

  return (
    <div className="space-y-1">
      {nodes.map((node, index) => {
        const style = NODE_STYLES[node.node_type] || NODE_STYLES.narrow_op;
        const isShuffleBoundary = node.stage > lastStage && lastStage >= 0;
        const showStage = node.stage > lastStage;
        lastStage = node.stage;

        return (
          <div key={index}>
            {/* Stage boundary indicator */}
            {isShuffleBoundary && (
              <div className="flex items-center gap-2 py-1" data-testid="stage-boundary">
                <div className="flex-1 border-t border-dashed border-yellow-500/50" />
                <span className="text-xs text-yellow-400 font-medium px-2">
                  🔀 Shuffle → Stage {node.stage}
                </span>
                <div className="flex-1 border-t border-dashed border-yellow-500/50" />
              </div>
            )}

            {/* Arrow */}
            {index > 0 && !isShuffleBoundary && (
              <div className="flex justify-center text-slate-600 text-xs">│</div>
            )}

            {/* Node */}
            <div 
              className={`flex items-center gap-2 p-2 rounded border ${style.bg} ${style.border}`}
              data-testid={`dag-node-${node.node_type}`}
            >
              <span className="text-sm">{style.icon}</span>
              <span className="text-sm text-slate-300">{node.label}</span>
              {showStage && (
                <span className="text-xs text-slate-500 ml-auto">Stage {node.stage}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SparkDecisionBox({ 
  decision 
}: { 
  decision: SparkViewPanelProps['sparkDecision'] 
}) {
  if (!decision) {
    return (
      <div className="p-3 bg-slate-800/50 rounded border border-slate-700 text-sm text-slate-500">
        Add operations to see Spark&apos;s execution decisions
      </div>
    );
  }

  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-orange-400',
  };

  return (
    <div className="p-3 bg-slate-800/50 rounded border border-slate-700 space-y-3" data-testid="spark-decision-box">
      {/* Strategy badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Strategy</span>
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {decision.strategy}
        </span>
      </div>

      {/* Explanation - "Spark chose this because..." */}
      <div>
        <p className="text-xs text-slate-400 mb-1">Spark chose this because...</p>
        <p className="text-sm text-slate-300">{decision.explanation}</p>
      </div>

      {/* Dominant factor */}
      <div>
        <p className="text-xs text-slate-400 mb-1">Dominant Cost Driver</p>
        <p className="text-sm text-slate-300">{decision.dominantFactor}</p>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Confidence:</span>
        <span className={confidenceColors[decision.confidence]}>
          {decision.confidence.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

export function SparkViewPanel({
  operations,
  chainResult,
  sparkDecision,
  className = '',
}: SparkViewPanelProps) {
  // Build a simple DAG if no chain result
  const dagNodes: ChainDAGNode[] = chainResult?.dag?.nodes || [
    { label: 'Read', node_type: 'read', stage: 0 },
    ...operations.map((op, i) => ({
      label: op.type.charAt(0).toUpperCase() + op.type.slice(1),
      node_type: op.type,
      stage: ['groupby', 'join', 'repartition', 'orderby', 'distinct', 'window'].includes(op.type)
        ? 1 + operations.slice(0, i).filter(o => ['groupby', 'join', 'repartition', 'orderby', 'distinct', 'window'].includes(o.type)).length
        : i > 0 
          ? 1 + operations.slice(0, i).filter(o => ['groupby', 'join', 'repartition', 'orderby', 'distinct', 'window'].includes(o.type)).length 
          : 0,
    })),
  ];

  const stageCount = chainResult?.stage_count || Math.max(...dagNodes.map(n => n.stage)) + 1;
  const shuffleBytes = chainResult?.total_shuffle_bytes || 0;

  return (
    <div className={`space-y-4 ${className}`} data-testid="spark-view-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Spark View
        </h3>
        <div className="flex gap-3 text-xs text-slate-500">
          <span>{stageCount} Stages</span>
          <span className={shuffleBytes > 0 ? 'text-yellow-400' : ''}>
            {formatBytes(shuffleBytes)} Shuffle
          </span>
        </div>
      </div>

      {/* Mini DAG */}
      <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
        <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Execution DAG</h4>
        <MiniDAG nodes={dagNodes} operations={operations} />
      </div>

      {/* Spark Decision Box */}
      <div>
        <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Spark Decision</h4>
        <SparkDecisionBox decision={sparkDecision} />
      </div>
    </div>
  );
}

export default SparkViewPanel;
