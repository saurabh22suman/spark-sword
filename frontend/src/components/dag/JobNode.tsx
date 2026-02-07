'use client';

/**
 * Job Node Component
 * 
 * Renders a job node in the DAG as a container for stages.
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
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
    SUCCEEDED: 'border-green-500/30 bg-green-500/5',
    FAILED: 'border-red-500/30 bg-red-500/5',
    RUNNING: 'border-blue-500/30 bg-blue-500/5',
    PENDING: 'border-yellow-500/30 bg-yellow-500/5',
    UNKNOWN: 'border-border bg-muted/20',
  };
  
  const statusStyle = statusColors[status] || statusColors.UNKNOWN;
  
  return (
    <div 
      className={cn(
        "px-4 py-3 rounded-xl border-2 min-w-[600px] min-h-[150px] transition-all",
        statusStyle,
        selected ? 'ring-2 ring-primary border-primary' : ''
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            Job {metadata.job_id ?? data.id}
          </span>
          <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground font-mono">
            {data.stageCount || 0} stages
          </span>
        </div>
        
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-semibold border",
          status === 'SUCCEEDED' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : '',
          status === 'FAILED' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : '',
          status === 'RUNNING' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' : '',
          status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' : '',
          status === 'UNKNOWN' ? 'bg-muted text-muted-foreground border-transparent' : ''
        )}>
          {status}
        </span>
      </div>
      
      {/* Job description/label */}
      {data.label && (
        <div className="text-xs text-muted-foreground truncate font-medium">
          {data.label}
        </div>
      )}
    </div>
  );
}

export const JobNode = memo(JobNodeComponent);
