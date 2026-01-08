'use client';

/**
 * Stage Node Component
 * 
 * Renders a stage node in the DAG with metrics and status.
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { DAGNodeData } from '@/types';

interface StageNodeProps {
  data: DAGNodeData;
  selected?: boolean;
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

function StageNodeComponent({ data, selected }: StageNodeProps) {
  const metadata = data.metadata || {};
  const hasShuffle = metadata.has_shuffle || (metadata.shuffle_write_bytes ?? 0) > 0;
  const status = metadata.status || 'UNKNOWN';
  
  // Determine status color
  const statusColors: Record<string, string> = {
    SUCCEEDED: 'bg-green-500',
    FAILED: 'bg-red-500',
    RUNNING: 'bg-blue-500',
    PENDING: 'bg-yellow-500',
    UNKNOWN: 'bg-gray-500',
  };
  
  const statusColor = statusColors[status] || statusColors.UNKNOWN;
  
  // Border color based on shuffle
  const borderColor = hasShuffle 
    ? 'border-red-500 shadow-red-500/20' 
    : 'border-slate-600';
  
  return (
    <div 
      className={`
        px-4 py-3 rounded-lg border-2 bg-slate-800 min-w-[180px]
        ${borderColor}
        ${selected ? 'ring-2 ring-blue-500' : ''}
        transition-all duration-200 hover:shadow-lg
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-slate-500 border-2 border-slate-700"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-400">
          Stage {metadata.stage_id ?? data.id}
        </span>
        <span className={`w-2 h-2 rounded-full ${statusColor}`} title={status} />
      </div>
      
      {/* Label */}
      <div className="text-sm font-medium text-white truncate mb-2" title={data.label}>
        {data.label || 'Stage'}
      </div>
      
      {/* Metrics */}
      <div className="space-y-1 text-xs text-slate-400">
        {metadata.num_tasks && (
          <div className="flex justify-between">
            <span>Tasks:</span>
            <span className="text-slate-300">{metadata.num_tasks}</span>
          </div>
        )}
        
        {metadata.duration_ms && (
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="text-slate-300">{formatDuration(metadata.duration_ms)}</span>
          </div>
        )}
        
        {(metadata.input_bytes ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Input:</span>
            <span className="text-slate-300">{formatBytes(metadata.input_bytes!)}</span>
          </div>
        )}
        
        {(metadata.shuffle_write_bytes ?? 0) > 0 && (
          <div className="flex justify-between text-red-400">
            <span>Shuffle:</span>
            <span>{formatBytes(metadata.shuffle_write_bytes!)}</span>
          </div>
        )}
        
        {(metadata.spill_bytes ?? 0) > 0 && (
          <div className="flex justify-between text-yellow-400">
            <span>Spill:</span>
            <span>{formatBytes(metadata.spill_bytes!)}</span>
          </div>
        )}
      </div>
      
      {/* Shuffle indicator */}
      {hasShuffle && (
        <div className="mt-2 px-2 py-1 bg-red-500/20 rounded text-xs text-red-400 text-center">
          Shuffle Boundary
        </div>
      )}
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-slate-500 border-2 border-slate-700"
      />
    </div>
  );
}

export const StageNode = memo(StageNodeComponent);
