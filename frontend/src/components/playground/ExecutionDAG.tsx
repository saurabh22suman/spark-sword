/**
 * Execution DAG Component
 * 
 * Per playground-v3-full-revamp-spec.md Section 7:
 * Primary Visualization - The heart of the Playground
 * 
 * Visual Grammar (Consistent Everywhere):
 * - Normal flow: Blue edges
 * - Shuffle: Orange edges  
 * - Skew / pressure: Red highlight
 * - Broadcast: Purple accent
 * 
 * No numbers by default — shape first.
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Operation } from './OperationsBuilder';
import type { DataShape } from './DataShapePanel';

// Visual grammar colors (CSS variables fallback)
const COLORS = {
  flow: 'var(--spark-flow, #3b82f6)',       // Blue - normal flow
  shuffle: 'var(--spark-shuffle, #f97316)', // Orange - shuffle
  pressure: 'var(--spark-pressure, #ef4444)', // Red - skew/pressure
  broadcast: 'var(--spark-broadcast, #a855f7)', // Purple - broadcast
  neutral: 'var(--spark-neutral, #64748b)',  // Slate - neutral
};

export interface DAGNode {
  id: string;
  type: 'read' | 'narrow' | 'wide' | 'write';
  label: string;
  stage: number;
  operation?: Operation;
  isShuffle?: boolean;
  isBroadcast?: boolean;
  isSkewed?: boolean;
}

export interface DAGEdge {
  from: string;
  to: string;
  type: 'normal' | 'shuffle' | 'broadcast';
  isAnimating?: boolean;
}

interface ExecutionDAGProps {
  operations: Operation[];
  shape: DataShape;
  className?: string;
  /** When reaction is playing, animate the DAG */
  isReacting?: boolean;
  /** What type of reaction is happening */
  reactionType?: 'shuffle' | 'broadcast' | 'skew' | 'spill' | null;
  /** Called when reaction animation completes */
  onReactionComplete?: () => void;
}

// Determine if an operation causes a shuffle
const SHUFFLE_OPS = ['groupby', 'join', 'repartition', 'orderby', 'distinct', 'window'];

function buildDAG(operations: Operation[], shape: DataShape): { nodes: DAGNode[]; edges: DAGEdge[] } {
  const nodes: DAGNode[] = [];
  const edges: DAGEdge[] = [];
  
  let currentStage = 0;
  let lastNodeId = 'read';
  
  // Read node is always first
  nodes.push({
    id: 'read',
    type: 'read',
    label: 'Read',
    stage: 0,
  });
  
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const isShuffle = SHUFFLE_OPS.includes(op.type);
    const nodeId = `op-${i}`;
    
    // Determine if this is a broadcast join
    let isBroadcast = false;
    if (op.type === 'join') {
      const rightSize = ((op.params.right_rows as number) || 100000) * shape.avgRowSizeBytes;
      const threshold = (op.params.broadcast_threshold as number) || 10 * 1024 * 1024;
      isBroadcast = rightSize <= threshold;
    }
    
    // Check for skew
    const isSkewed = shape.skewFactor > 2 && isShuffle;
    
    // If shuffle, increment stage
    if (isShuffle && !isBroadcast) {
      currentStage++;
    }
    
    nodes.push({
      id: nodeId,
      type: isShuffle ? 'wide' : 'narrow',
      label: op.type.charAt(0).toUpperCase() + op.type.slice(1),
      stage: currentStage,
      operation: op,
      isShuffle: isShuffle && !isBroadcast,
      isBroadcast,
      isSkewed,
    });
    
    // Add edge from last node
    edges.push({
      from: lastNodeId,
      to: nodeId,
      type: isShuffle && !isBroadcast ? 'shuffle' : isBroadcast ? 'broadcast' : 'normal',
    });
    
    lastNodeId = nodeId;
  }
  
  return { nodes, edges };
}

// Node visual component
function DAGNodeVisual({ 
  node, 
  isActive,
  isReacting,
}: { 
  node: DAGNode; 
  isActive?: boolean;
  isReacting?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  
  // Determine node color based on type
  let bgColor = 'bg-slate-800/50';
  let borderColor = 'border-slate-600';
  let iconColor = COLORS.flow;
  
  if (node.isShuffle) {
    bgColor = 'bg-orange-500/10';
    borderColor = 'border-orange-500/50';
    iconColor = COLORS.shuffle;
  } else if (node.isBroadcast) {
    bgColor = 'bg-purple-500/10';
    borderColor = 'border-purple-500/50';
    iconColor = COLORS.broadcast;
  } else if (node.isSkewed) {
    bgColor = 'bg-red-500/10';
    borderColor = 'border-red-500/50';
    iconColor = COLORS.pressure;
  }
  
  // Node icons
  const icons: Record<string, string> = {
    read: '📖',
    filter: '🔍',
    groupby: '📊',
    join: '🔗',
    write: '💾',
    window: '🪟',
    orderby: '↕️',
    distinct: '🎯',
    repartition: '📦',
    coalesce: '🔽',
    cache: '💎',
    union: '➕',
  };
  
  const icon = node.operation 
    ? icons[node.operation.type] || '⚙️' 
    : icons[node.type] || '⚙️';
  
  return (
    <motion.div
      layout={!reduceMotion}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isReacting && (node.isShuffle || node.isSkewed) ? 1.05 : 1,
        boxShadow: isReacting && node.isShuffle 
          ? `0 0 20px ${COLORS.shuffle}40` 
          : 'none',
      }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
      className={`
        relative flex items-center gap-2 px-3 py-2 rounded-lg border-2
        ${bgColor} ${borderColor}
        ${isActive ? 'ring-2 ring-blue-500/50' : ''}
        transition-colors duration-200
      `}
      data-testid={`dag-node-${node.id}`}
    >
      <span className="text-lg" style={{ color: iconColor }}>{icon}</span>
      <span className="text-sm font-medium text-slate-200">{node.label}</span>
      
      {/* Stage badge */}
      <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
        S{node.stage}
      </span>
      
      {/* Skew indicator */}
      {node.isSkewed && (
        <motion.span
          animate={isReacting ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute -top-1 -right-1 text-xs"
          title="High skew detected"
        >
          ⚠️
        </motion.span>
      )}
    </motion.div>
  );
}

// Stage boundary separator
function StageBoundary({ stageNumber }: { stageNumber: number }) {
  return (
    <div 
      className="flex items-center gap-2 my-2"
      data-testid={`stage-boundary-${stageNumber}`}
    >
      <div className="flex-1 border-t border-dashed" style={{ borderColor: COLORS.shuffle }} />
      <span 
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ 
          backgroundColor: `${COLORS.shuffle}20`,
          color: COLORS.shuffle,
        }}
      >
        🔀 Stage {stageNumber}
      </span>
      <div className="flex-1 border-t border-dashed" style={{ borderColor: COLORS.shuffle }} />
    </div>
  );
}

export function ExecutionDAG({
  operations,
  shape,
  className = '',
  isReacting = false,
  reactionType,
  onReactionComplete,
}: ExecutionDAGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [_nodePositions, _setNodePositions] = useState<Record<string, number>>({});
  
  const { nodes, edges: _edges } = buildDAG(operations, shape);
  
  // Calculate node positions after render
  useEffect(() => {
    if (!containerRef.current) return;
    
    const positions: Record<string, number> = {};
    const nodeElements = containerRef.current.querySelectorAll('[data-testid^="dag-node-"]');
    
    nodeElements.forEach((el) => {
      const id = el.getAttribute('data-testid')?.replace('dag-node-', '');
      if (id) {
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        positions[id] = rect.top - containerRect.top + rect.height / 2;
      }
    });
    
    _setNodePositions(positions);
  }, [nodes]);
  
  // Handle reaction complete
  const handleReactionComplete = useCallback(() => {
    if (isReacting) {
      // Give animation time to complete
      setTimeout(() => {
        onReactionComplete?.();
      }, 1000);
    }
  }, [isReacting, onReactionComplete]);
  
  useEffect(() => {
    if (isReacting) {
      handleReactionComplete();
    }
  }, [isReacting, handleReactionComplete]);
  
  // Group nodes by stage
  let currentStage = -1;
  
  return (
    <div 
      ref={containerRef}
      className={`relative space-y-1 ${className}`}
      data-testid="execution-dag"
      data-reacting={isReacting}
      data-reaction-type={reactionType}
    >
      <AnimatePresence mode="popLayout">
        {nodes.map((node, index) => {
          const showStageBoundary = node.stage > currentStage && currentStage >= 0;
          currentStage = node.stage;
          
          return (
            <div key={node.id}>
              {/* Stage boundary */}
              {showStageBoundary && <StageBoundary stageNumber={node.stage} />}
              
              {/* Node */}
              <DAGNodeVisual 
                node={node} 
                isReacting={isReacting && (
                  (reactionType === 'shuffle' && node.isShuffle) ||
                  (reactionType === 'broadcast' && node.isBroadcast) ||
                  (reactionType === 'skew' && node.isSkewed)
                )}
              />
              
              {/* Edge to next node */}
              {index < nodes.length - 1 && !showStageBoundary && (
                <div className="flex justify-center py-1">
                  <svg width="20" height="20" className="text-slate-600">
                    <line x1="10" y1="0" x2="10" y2="12" stroke="currentColor" strokeWidth="2" />
                    <polygon points="10,20 6,12 14,12" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </AnimatePresence>
      
      {/* Empty state */}
      {operations.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm">Add operations to see the execution DAG</p>
        </div>
      )}
    </div>
  );
}

export default ExecutionDAG;
