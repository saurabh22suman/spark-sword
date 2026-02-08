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

// Node type icons and colors per spec A3.2 with modern glass morphism
const NODE_CONFIG: Record<ScenarioDAGNodeType, { 
  icon: string; 
  color: string; 
  bgColor: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  read: { 
    icon: '📖', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'glass border-blue-500/30',
    glowColor: 'shadow-blue-500/20',
    gradientFrom: 'from-blue-500/10',
    gradientTo: 'to-blue-600/5'
  },
  narrow_op: { 
    icon: '🔍', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'glass border-green-500/30',
    glowColor: 'shadow-green-500/20',
    gradientFrom: 'from-green-500/10',
    gradientTo: 'to-green-600/5'
  },
  shuffle: { 
    icon: '🔀', 
    color: 'text-yellow-600 dark:text-yellow-400', 
    bgColor: 'glass border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
    gradientFrom: 'from-yellow-500/10',
    gradientTo: 'to-yellow-600/5'
  },
  join: { 
    icon: '🔗', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'glass border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
    gradientFrom: 'from-purple-500/10',
    gradientTo: 'to-purple-600/5'
  },
  aggregate: { 
    icon: '📊', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'glass border-orange-500/30',
    glowColor: 'shadow-orange-500/20',
    gradientFrom: 'from-orange-500/10',
    gradientTo: 'to-orange-600/5'
  },
  sort: { 
    icon: '↕️', 
    color: 'text-cyan-600 dark:text-cyan-400', 
    bgColor: 'glass border-cyan-500/30',
    glowColor: 'shadow-cyan-500/20',
    gradientFrom: 'from-cyan-500/10',
    gradientTo: 'to-cyan-600/5'
  },
  write: { 
    icon: '💾', 
    color: 'text-pink-600 dark:text-pink-400', 
    bgColor: 'glass border-pink-500/30',
    glowColor: 'shadow-pink-500/20',
    gradientFrom: 'from-pink-500/10',
    gradientTo: 'to-pink-600/5'
  },
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
        group w-full p-4 rounded-xl border-2 smooth-transition text-left
        bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}
        ${isSelected 
          ? 'border-blue-500 glass-lg glow-primary ring-2 ring-blue-500/30 shadow-xl' 
          : `${config.bgColor} ${config.glowColor} hover:shadow-lg hover:scale-[1.02] hover:border-opacity-100`
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          text-2xl p-2 rounded-lg bg-slate-100 dark:bg-slate-800/30 backdrop-blur-sm
          group-hover:scale-110 smooth-transition
        `}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base ${config.color} group-hover:text-gradient smooth-transition`}>
            {node.label}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Stage {node.stage}
          </div>
        </div>
        {node.is_stage_boundary && (
          <span className="px-2 py-1 text-xs glass border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 rounded-md font-medium shadow-yellow-500/10">
            🔀 Shuffle
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
    <div className="flex items-center gap-3 py-2 px-4" data-testid="stage-boundary">
      <div className="flex-1 border-t-2 border-dashed border-yellow-500/40" />
      <span className="px-3 py-1.5 text-xs glass border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold whitespace-nowrap rounded-full shadow-yellow-500/20 shadow-lg">
        🔀 Stage {fromStage} → {toStage}
      </span>
      <div className="flex-1 border-t-2 border-dashed border-yellow-500/40" />
    </div>
  );
}

interface NodeDetailsPanelProps {
  node: ScenarioDAGNode;
}

function NodeDetailsPanel({ node }: NodeDetailsPanelProps) {
  const config = NODE_CONFIG[node.node_type] || NODE_CONFIG.narrow_op;
  
  return (
    <div className="glass-lg rounded-xl border-2 border-slate-200 dark:border-slate-600/30 p-5 space-y-4 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/40 dark:to-slate-900/40">
      <div className="flex items-center gap-3">
        <div className={`
          text-3xl p-3 rounded-xl glass border-2 ${config.bgColor}
          ${config.glowColor} shadow-lg
        `}>
          {config.icon}
        </div>
        <div>
          <h4 className={`font-bold text-lg ${config.color} text-gradient`}>{node.label}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Stage {node.stage} · {node.node_type.replace('_', ' ')}
          </p>
        </div>
      </div>
      
      {/* What Spark is doing - per spec A4 */}
      <div className="glass-sm rounded-lg p-3 border border-blue-200 dark:border-blue-500/20">
        <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <span>⚡</span> What Spark Does
        </h5>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{node.what_spark_does}</p>
      </div>
      
      {/* Why it is required - per spec A4 */}
      <div className="glass-sm rounded-lg p-3 border border-purple-200 dark:border-purple-500/20">
        <h5 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <span>💡</span> Why Required
        </h5>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{node.why_required}</p>
      </div>
      
      {node.is_stage_boundary && (
        <div className="glass border-2 border-yellow-300 dark:border-yellow-500/30 rounded-lg p-3 shadow-yellow-500/10 shadow-lg">
          <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium leading-relaxed">
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
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Execution DAG
        </h3>
        <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-500">
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
                    <div className="w-0.5 h-2 bg-slate-300 dark:bg-slate-600" />
                  </div>
                )}
                
                {/* Arrow down */}
                {index > 0 && (
                  <div className="flex justify-center text-slate-400 dark:text-slate-500 text-xs mb-1">↓</div>
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
            <div className="text-slate-500 dark:text-slate-500 text-sm text-center py-8">
              Click a node to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
