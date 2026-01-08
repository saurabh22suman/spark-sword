/**
 * Intent Graph Component
 * 
 * Per intent-graph-ui-spec.md Section 4:
 * - Vertical or left-to-right flow
 * - Each node = one logical operation
 * - Nodes show: Operation name, Key columns, Spark consequence badge
 * - Uncertainty indicators with ⚠️ badge
 */

'use client';

import { useState } from 'react';
import type { IntentGraphNode, EditableAssumptions, SparkConsequence } from '@/types';

// Operation icons per spec Section 4.1
const OPERATION_ICONS: Record<string, string> = {
  filter: '🔍',
  where: '🔍',
  groupBy: '📊',
  groupByKey: '📊',
  join: '🔗',
  leftjoin: '🔗',
  rightjoin: '🔗',
  write: '💾',
  save: '💾',
  cache: '💾',
  persist: '💾',
  select: '📋',
  repartition: '🔀',
  coalesce: '🔀',
  sort: '↕️',
  sortBy: '↕️',
  orderBy: '↕️',
  distinct: '✨',
};

// Consequence colors
const CONSEQUENCE_COLORS: Record<string, string> = {
  'Narrow transformation': 'bg-green-500/20 text-green-400 border-green-500/50',
  'Shuffle required': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'Shuffle on both sides': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  'Broadcast join likely': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'Full shuffle': 'bg-red-500/20 text-red-400 border-red-500/50',
  'No shuffle': 'bg-green-500/20 text-green-400 border-green-500/50',
  'Shuffle + sort': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  'Memory pressure risk': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'Possible file explosion': 'bg-red-500/20 text-red-400 border-red-500/50',
  'Unknown consequence': 'bg-slate-500/20 text-slate-400 border-slate-500/50',
};

interface IntentGraphProps {
  nodes: IntentGraphNode[];
  selectedNode: IntentGraphNode | null;
  onSelectNode: (node: IntentGraphNode) => void;
  uncertainties: string[];
}

function ConsequenceBadge({ consequence }: { consequence: SparkConsequence }) {
  const colorClass = CONSEQUENCE_COLORS[consequence] || CONSEQUENCE_COLORS['Unknown consequence'];
  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colorClass}`}>
      → {consequence}
    </span>
  );
}

function IntentNode({ 
  node, 
  isSelected, 
  onClick 
}: { 
  node: IntentGraphNode; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const icon = OPERATION_ICONS[node.operation.toLowerCase()] || OPERATION_ICONS[node.operation] || '⚙️';
  const keys = node.details.keys || node.details.columns || [];
  
  return (
    <div className="flex items-center gap-2">
      {/* Connector line */}
      {node.step > 1 && (
        <div className="w-8 h-0.5 bg-slate-600" />
      )}
      
      {/* Node */}
      <button
        onClick={onClick}
        className={`
          flex-shrink-0 p-4 rounded-lg border-2 transition-all min-w-[180px] text-left
          ${isSelected 
            ? 'border-spark-orange bg-spark-orange/10' 
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
          }
        `}
      >
        {/* Header with icon and operation */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white">{node.operation}</span>
          {node.is_uncertain && (
            <span className="text-yellow-400" title={node.uncertainty_reason || 'Uncertain'}>
              ⚠️
            </span>
          )}
        </div>
        
        {/* Keys if present */}
        {keys.length > 0 && (
          <div className="text-xs text-slate-400 mb-2">
            Keys: <span className="text-slate-300">{keys.join(', ')}</span>
          </div>
        )}
        
        {/* Consequence badge */}
        <ConsequenceBadge consequence={node.spark_consequence} />
      </button>
    </div>
  );
}

export function IntentGraph({ nodes, selectedNode, onSelectNode, uncertainties }: IntentGraphProps) {
  if (nodes.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <p className="text-slate-400">No operations detected in the intent graph.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Uncertainties banner */}
      {uncertainties.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400">⚠️</span>
            <div>
              <p className="text-sm text-yellow-400 font-medium mb-1">Assumptions made:</p>
              <ul className="text-xs text-yellow-300/80 space-y-0.5">
                {uncertainties.map((u, i) => (
                  <li key={i}>• {u}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Graph flow - horizontal */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {nodes.map((node) => (
            <IntentNode
              key={node.step}
              node={node}
              isSelected={selectedNode?.step === node.step}
              onClick={() => onSelectNode(node)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Node Details / Editor Panel (per spec Section 5)
// ============================================================

interface NodeDetailsPanelProps {
  node: IntentGraphNode;
  onUpdateAssumptions: (assumptions: EditableAssumptions) => void;
}

export function NodeDetailsPanel({ node, onUpdateAssumptions }: NodeDetailsPanelProps) {
  const editable = node.details.editable || {};
  
  const handleChange = (key: keyof EditableAssumptions, value: unknown) => {
    onUpdateAssumptions({
      ...editable,
      [key]: value,
    });
  };
  
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{OPERATION_ICONS[node.operation.toLowerCase()] || '⚙️'}</span>
        <div>
          <h3 className="text-lg font-semibold text-white">{node.operation}</h3>
          <p className="text-sm text-slate-400">Step {node.step}</p>
        </div>
      </div>
      
      {/* Code snippet */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 uppercase tracking-wide">Code</label>
        <div className="mt-1 bg-slate-950 rounded p-3 font-mono text-sm text-slate-300 overflow-x-auto">
          {node.details.code_snippet}
        </div>
      </div>
      
      {/* Spark Consequence */}
      <div className="mb-4">
        <label className="text-xs text-slate-500 uppercase tracking-wide">Spark Consequence</label>
        <div className="mt-1">
          <ConsequenceBadge consequence={node.spark_consequence} />
        </div>
      </div>
      
      {/* Uncertainty warning */}
      {node.is_uncertain && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            ⚠️ {node.uncertainty_reason || 'This operation has uncertain behavior'}
          </p>
        </div>
      )}
      
      {/* Editable Assumptions - per spec Section 5.1 */}
      {Object.keys(editable).length > 0 && (
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <span>🎛️</span>
            Editable Assumptions
            <span className="text-xs text-slate-500 font-normal">
              (used for simulation)
            </span>
          </h4>
          
          <div className="space-y-4">
            {/* Join Type */}
            {'join_type' in editable && (
              <div>
                <label className="text-xs text-slate-500 block mb-1">Join Type</label>
                <select
                  value={editable.join_type || 'inner'}
                  onChange={(e) => handleChange('join_type', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="inner">Inner Join</option>
                  <option value="left">Left Join</option>
                  <option value="right">Right Join</option>
                  <option value="outer">Full Outer Join</option>
                  <option value="cross">Cross Join</option>
                </select>
              </div>
            )}
            
            {/* Broadcast Hint */}
            {'broadcast_hint' in editable && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="broadcast_hint"
                  checked={editable.broadcast_hint || false}
                  onChange={(e) => handleChange('broadcast_hint', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                />
                <label htmlFor="broadcast_hint" className="text-sm text-slate-300">
                  Broadcast hint exists
                </label>
              </div>
            )}
            
            {/* Is Skewed */}
            {'is_skewed' in editable && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_skewed"
                  checked={editable.is_skewed || false}
                  onChange={(e) => handleChange('is_skewed', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                />
                <label htmlFor="is_skewed" className="text-sm text-slate-300">
                  Key is likely skewed
                </label>
              </div>
            )}
            
            {/* Selectivity */}
            {'selectivity' in editable && (
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Approximate Selectivity: {Math.round((editable.selectivity || 0.5) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(editable.selectivity || 0.5) * 100}
                  onChange={(e) => handleChange('selectivity', parseInt(e.target.value) / 100)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0% (filters all)</span>
                  <span>100% (keeps all)</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Assumption label per spec */}
          <p className="text-xs text-slate-500 mt-4 italic">
            💡 These assumptions are used for simulation only. They do not modify your code.
          </p>
        </div>
      )}
    </div>
  );
}
