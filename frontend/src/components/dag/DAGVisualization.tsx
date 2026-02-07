'use client';

/**
 * DAG Visualization Component
 * 
 * Renders the Spark execution DAG using React Flow.
 * Shows jobs, stages, and shuffle boundaries with metrics.
 */

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StageNode } from './StageNode';
import { JobNode } from './JobNode';
import type { DAGData, DAGNodeData, DAGNodeWrapper } from '@/types';

// Custom node types
const nodeTypes = {
  stage: StageNode,
  job: JobNode,
};

interface DAGVisualizationProps {
  data: DAGData;
  onNodeClick?: (nodeId: string, nodeData?: DAGNodeData) => void;
  selectedNodeId?: string | null;
  className?: string;
}

/**
 * Convert backend DAG data to React Flow nodes and edges
 */
function convertToReactFlow(data: DAGData, selectedNodeId?: string | null): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Layout calculation - simple layered approach
  const stagesByJob = new Map<number, DAGNodeWrapper[]>();
  const jobNodes: DAGNodeWrapper[] = [];
  
  // Group stages by job
  data.nodes.forEach(nodeWrapper => {
    const nodeData = nodeWrapper.data;
    if (nodeWrapper.type === 'job') {
      jobNodes.push(nodeWrapper);
    } else if (nodeWrapper.type === 'stage') {
      const jobId = nodeData.metadata?.job_id ?? -1;
      if (!stagesByJob.has(jobId)) {
        stagesByJob.set(jobId, []);
      }
      stagesByJob.get(jobId)!.push(nodeWrapper);
    }
  });
  
  // Position jobs vertically
  let yOffset = 0;
  const JOB_HEIGHT = 200;
  const STAGE_WIDTH = 200;
  const STAGE_GAP = 50;
  
  jobNodes.forEach((jobWrapper, _jobIndex) => {
    const jobId = parseInt(jobWrapper.id.replace('job-', ''));
    const stages = stagesByJob.get(jobId) || [];
    const isSelected = selectedNodeId === jobWrapper.id;
    
    // Add job node
    nodes.push({
      id: jobWrapper.id,
      type: 'job',
      position: { x: 0, y: yOffset },
      data: {
        ...jobWrapper.data,
        stageCount: stages.length,
      },
      selected: isSelected,
    });
    
    // Position stages horizontally within job
    stages.forEach((stageWrapper, stageIndex) => {
      const isStageSelected = selectedNodeId === stageWrapper.id;
      nodes.push({
        id: stageWrapper.id,
        type: 'stage',
        position: { 
          x: 150 + stageIndex * (STAGE_WIDTH + STAGE_GAP), 
          y: yOffset + 50,
        },
        data: stageWrapper.data,
        parentNode: jobWrapper.id,
        extent: 'parent',
        selected: isStageSelected,
      });
    });
    
    yOffset += JOB_HEIGHT;
  });
  
  // Convert edges
  data.edges.forEach(edge => {
    const isShuffle = edge.type === 'shuffle';
    
    edges.push({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: isShuffle ? 'smoothstep' : 'default',
      animated: isShuffle,
      style: {
        stroke: isShuffle ? '#ef4444' : '#64748b',
        strokeWidth: isShuffle ? 2 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isShuffle ? '#ef4444' : '#64748b',
      },
      label: isShuffle ? 'shuffle' : undefined,
      labelStyle: { fill: '#ef4444', fontWeight: 600 },
    });
  });
  
  return { nodes, edges };
}

export function DAGVisualization({ 
  data, 
  onNodeClick,
  selectedNodeId,
  className = '',
}: DAGVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertToReactFlow(data, selectedNodeId),
    [data, selectedNodeId]
  );
  
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data) {
        onNodeClick(node.id, node.data as DAGNodeData);
      }
    },
    [onNodeClick]
  );
  
  return (
    <div className={`w-full h-[600px] bg-slate-900 rounded-lg ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-800 border-slate-700" />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'job') return '#3b82f6';
            if (node.data?.metadata?.has_shuffle) return '#ef4444';
            return '#22c55e';
          }}
          className="bg-slate-800 border-slate-700"
        />
      </ReactFlow>
    </div>
  );
}

export default DAGVisualization;
