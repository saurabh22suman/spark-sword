'use client';

/**
 * Stage Node Component
 * 
 * Renders a stage node in the DAG with metrics and status.
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';
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
    ? 'border-red-500/50 dark:border-red-500/50 shadow-sm shadow-red-500/10' 
    : 'border-border';
  
  return (
    <div 
      className={cn(
        "px-4 py-3 rounded-lg border-2 min-w-[180px] transition-all duration-200",
        "bg-card text-card-foreground",
        borderColor,
        selected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50',
        selected ? 'shadow-lg shadow-primary/10' : 'hover:shadow-md'
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground font-semibold">
          Stage {metadata.stage_id ?? data.id}
        </span>
        <span className={cn("w-2 h-2 rounded-full ring-2 ring-background", statusColor)} title={status} />
      </div>
      
      {/* Label */}
      <div className="text-sm font-bold truncate mb-2" title={data.label}>
        {data.label || 'Stage'}
      </div>
      
      {/* Metrics */}
      <div className="space-y-1 text-xs text-muted-foreground/80">
        {metadata.num_tasks && (
          <div className="flex justify-between">
            <span>Tasks:</span>
            <span className="font-mono text-foreground">{metadata.num_tasks}</span>
          </div>
        )}
        
        {metadata.duration_ms && (
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-mono text-foreground">{formatDuration(metadata.duration_ms)}</span>
          </div>
        )}
        
        {(metadata.input_bytes ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Input:</span>
            <span className="font-mono text-foreground">{formatBytes(metadata.input_bytes!)}</span>
          </div>
        )}
        
        {(metadata.shuffle_write_bytes ?? 0) > 0 && (
          <div className="flex justify-between text-yellow-600 dark:text-yellow-500 font-medium">
            <span>Shuffle:</span>
            <span className="font-mono">{formatBytes(metadata.shuffle_write_bytes!)}</span>
          </div>
        )}

        {(metadata.spill_bytes ?? 0) > 0 && (
          <div className="flex justify-between text-red-600 dark:text-red-500 font-medium">
            <span>Spill:</span>
            <span className="font-mono">{formatBytes(metadata.spill_bytes!)}</span>
          </div>
        )}
      </div>

      {/* Shuffle indicator */}
      {hasShuffle && (
        <div className="mt-2 px-2 py-1 bg-red-500/10 rounded text-[10px] font-bold text-red-600 dark:text-red-400 text-center uppercase tracking-wider border border-red-500/20">
          Shuffle Boundary
        </div>
      )}
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
}

export const StageNode = memo(StageNodeComponent);
