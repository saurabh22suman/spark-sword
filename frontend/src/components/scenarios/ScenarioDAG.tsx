/**
 * Scenario DAG Component
 * 
 * Per scenario-dag-spec.md Part A:
 * - Teaching DAG, not forensic DAG
 * - Shows how Spark executes this scenario
 * - Stage boundaries and shuffles obvious at a glance
 * 
 * Layout: Top → Bottom (vertical flow per A3.1)
 * Interactions: Hover → tooltip, Click → explanation (per A3.4)
 */

'use client';

import { useState } from 'react';
import type { ScenarioDAGData, ScenarioDAGNode, ScenarioDAGNodeType } from '@/types';

// Node type icons and colors per spec A3.2
const NODE_CONFIG: Record<ScenarioDAGNodeType, { icon: string; color: string; bgColor: string }> = {
  read: { icon: '📖', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50' },
  narrow_op: { icon: '🔍', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50' },
  shuffle: { icon: '🔀', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/50' },
  join: { icon: '🔗', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/50' },
  aggregate: { icon: '📊', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/50' },
  sort: { icon: '↕️', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/50' },
  write: { icon: '💾', color: 'text-pink-400', bgColor: 'bg-pink-500/20 border-pink-500/50' },
};

interface DAGNodeProps {
  node: ScenarioDAGNode;
  isSelected: boolean;
  onClick: () => void;
}

function DAGNode({ node, isSelected, onClick }: DAGNodeProps) {
  const config = NODE_CONFIG[node.node_type] || NODE_CONFIG.narrow_op;
  
  return (
    <button
      onClick={onClick}
      data-testid="dag-node"
      data-node-type={node.node_type}
      className={`
        w-full p-3 rounded-lg border-2 transition-all text-left
        ${isSelected 
          ? 'border-spark-orange bg-spark-orange/10 ring-2 ring-spark-orange/30' 
          : `${config.bgColor} hover:border-opacity-80`
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${config.color}`}>{node.label}</div>
          <div className="text-xs text-slate-500">Stage {node.stage}</div>
        </div>
        {node.is_stage_boundary && (
          <span className="px-1.5 py-0.5 text-xs bg-yellow-500/30 text-yellow-400 rounded">
            Stage Boundary
          </span>
        )}
      </div>
    </button>
  );
}

interface StageBoundaryProps {
  fromStage: number;
  toStage: number;
}

function StageBoundary({ fromStage, toStage }: StageBoundaryProps) {
  return (
    <div className="flex items-center gap-2 py-1 px-4" data-testid="stage-boundary">
      <div className="flex-1 border-t border-dashed border-yellow-500/50" />
      <span className="text-xs text-yellow-400 font-medium whitespace-nowrap">
        Stage {fromStage} → Stage {toStage}
      </span>
      <div className="flex-1 border-t border-dashed border-yellow-500/50" />
    </div>
  );
}

interface NodeDetailsPanelProps {
  node: ScenarioDAGNode;
}

function NodeDetailsPanel({ node }: NodeDetailsPanelProps) {
  const config = NODE_CONFIG[node.node_type] || NODE_CONFIG.narrow_op;
  
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <h4 className={`font-semibold ${config.color}`}>{node.label}</h4>
          <p className="text-xs text-slate-500">Stage {node.stage} · {node.node_type}</p>
        </div>
      </div>
      
      {/* What Spark is doing - per spec A4 */}
      <div>
        <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
          What Spark Does
        </h5>
        <p className="text-sm text-slate-300">{node.what_spark_does}</p>
      </div>
      
      {/* Why it is required - per spec A4 */}
      <div>
        <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
          Why Required
        </h5>
        <p className="text-sm text-slate-300">{node.why_required}</p>
      </div>
      
      {node.is_stage_boundary && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
          <p className="text-xs text-yellow-400">
            ⚠️ This operation creates a stage boundary. Spark must complete all previous 
            tasks before proceeding.
          </p>
        </div>
      )}
    </div>
  );
}

interface ScenarioDAGProps {
  dag: ScenarioDAGData;
}

export function ScenarioDAG({ dag }: ScenarioDAGProps) {
  const [selectedNode, setSelectedNode] = useState<ScenarioDAGNode | null>(
    dag.nodes.length > 0 ? dag.nodes[0] : null
  );
  
  // Group nodes by stage for rendering stage boundaries
  let lastStage = 0;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Execution DAG
        </h3>
        <div className="flex gap-3 text-xs text-slate-500">
          <span data-testid="dag-stage-count">{dag.stage_count} Stages</span>
          <span data-testid="dag-shuffle-count">{dag.shuffle_count} Shuffles</span>
        </div>
      </div>
      
      {/* Two-column layout: DAG + Details */}
      <div className="grid grid-cols-2 gap-4">
        {/* DAG Column - Vertical flow per spec A3.1 */}
        <div className="space-y-2">
          {dag.nodes.map((node, index) => {
            const showBoundary = node.stage > lastStage && index > 0;
            const previousStage = lastStage;
            lastStage = node.stage;
            
            return (
              <div key={`${node.label}-${index}`}>
                {/* Stage boundary indicator per spec A3.3 */}
                {showBoundary && (
                  <StageBoundary fromStage={previousStage} toStage={node.stage} />
                )}
                
                {/* Connector line */}
                {index > 0 && !showBoundary && (
                  <div className="flex justify-center">
                    <div className="w-0.5 h-2 bg-slate-600" />
                  </div>
                )}
                
                {/* Arrow down */}
                {index > 0 && (
                  <div className="flex justify-center text-slate-500 text-xs mb-1">↓</div>
                )}
                
                {/* Node */}
                <DAGNode
                  node={node}
                  isSelected={selectedNode?.label === node.label}
                  onClick={() => setSelectedNode(node)}
                />
              </div>
            );
          })}
        </div>
        
        {/* Details Column */}
        <div>
          {selectedNode ? (
            <NodeDetailsPanel node={selectedNode} />
          ) : (
            <div className="text-slate-500 text-sm text-center py-8">
              Click a node to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
