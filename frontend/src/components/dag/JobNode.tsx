'use client';

/**
 * Job Node Component
 * 
 * Renders a job node in the DAG as a container for stages.
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { DAGNodeData } from '@/types';

interface JobNodeProps {
  data: DAGNodeData & { stageCount?: number };
  selected?: boolean;
}

function JobNodeComponent({ data, selected }: JobNodeProps) {
  const metadata = data.metadata || {};
  const status = metadata.status || 'UNKNOWN';
  
  // Determine status color
  const statusColors: Record<string, string> = {
    SUCCEEDED: 'border-green-500 bg-green-500/10',
    FAILED: 'border-red-500 bg-red-500/10',
    RUNNING: 'border-blue-500 bg-blue-500/10',
    PENDING: 'border-yellow-500 bg-yellow-500/10',
    UNKNOWN: 'border-slate-600 bg-slate-800/50',
  };
  
  const statusStyle = statusColors[status] || statusColors.UNKNOWN;
  
  return (
    <div 
      className={`
        px-4 py-3 rounded-xl border-2 min-w-[600px] min-h-[150px]
        ${statusStyle}
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            Job {metadata.job_id ?? data.id}
          </span>
          <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
            {data.stageCount || 0} stages
          </span>
        </div>
        
        <span className={`
          px-2 py-0.5 rounded text-xs font-medium
          ${status === 'SUCCEEDED' ? 'bg-green-500/20 text-green-400' : ''}
          ${status === 'FAILED' ? 'bg-red-500/20 text-red-400' : ''}
          ${status === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' : ''}
          ${status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          ${status === 'UNKNOWN' ? 'bg-slate-500/20 text-slate-400' : ''}
        `}>
          {status}
        </span>
      </div>
      
      {/* Job description/label */}
      {data.label && (
        <div className="text-xs text-slate-400 truncate">
          {data.label}
        </div>
      )}
    </div>
  );
}

export const JobNode = memo(JobNodeComponent);
