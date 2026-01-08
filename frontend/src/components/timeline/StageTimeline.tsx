'use client';

/**
 * Stage Timeline Visualization
 * 
 * Displays a Gantt-style chart of stage execution times.
 * Uses Vega-Lite for rendering.
 */

import { useEffect, useRef, useState } from 'react';
import embed from 'vega-embed';
import { LearningHint } from '@/components/learning';

export interface StageTimelineData {
  stageId: number;
  stageName: string;
  startTime: number;
  endTime: number;
  duration: number;
  taskCount: number;
  status: 'completed' | 'running' | 'failed';
}

interface StageTimelineProps {
  stages: StageTimelineData[];
  className?: string;
}

export function StageTimeline({ stages, className = '' }: StageTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || stages.length === 0) return;

    const minTime = Math.min(...stages.map(s => s.startTime));
    const normalizedStages = stages.map(s => ({
      ...s,
      startTime: s.startTime - minTime,
      endTime: s.endTime - minTime,
    }));

    const spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'Stage execution timeline',
      width: 'container',
      height: Math.max(200, stages.length * 30),
      background: 'transparent',
      data: {
        values: normalizedStages,
      },
      mark: {
        type: 'bar',
        cornerRadius: 4,
      },
      encoding: {
        y: {
          field: 'stageName',
          type: 'nominal',
          title: 'Stage',
          sort: { field: 'startTime', order: 'ascending' },
          axis: {
            labelColor: '#94a3b8',
            titleColor: '#94a3b8',
            labelLimit: 200,
          },
        },
        x: {
          field: 'startTime',
          type: 'quantitative',
          title: 'Time (ms)',
          axis: {
            labelColor: '#94a3b8',
            titleColor: '#94a3b8',
          },
        },
        x2: {
          field: 'endTime',
        },
        color: {
          field: 'status',
          type: 'nominal',
          scale: {
            domain: ['completed', 'running', 'failed'],
            range: ['#22c55e', '#3b82f6', '#ef4444'],
          },
          legend: {
            labelColor: '#94a3b8',
            titleColor: '#94a3b8',
          },
        },
        tooltip: [
          { field: 'stageName', title: 'Stage' },
          { field: 'duration', title: 'Duration (ms)' },
          { field: 'taskCount', title: 'Tasks' },
          { field: 'status', title: 'Status' },
        ],
      },
      config: {
        view: { stroke: 'transparent' },
        axis: { grid: true, gridColor: '#1e293b' },
      },
    };

    embed(containerRef.current, spec as never, {
      actions: false,
      theme: 'dark',
    }).catch((err: Error) => {
      setError(err.message);
    });
  }, [stages]);

  if (stages.length === 0) {
    return (
      <div className={`text-center py-8 text-slate-500 ${className}`}>
        <div className="text-3xl mb-2">📊</div>
        <p>No stage data available</p>
        <p className="text-sm mt-1">Upload an event log to see the execution timeline</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 text-red-400 ${className}`}>
        <p>Error loading chart: {error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} data-testid="timeline-chart" className="w-full" />
      <LearningHint title="Reading the timeline">
        This chart shows when each stage started and ended. Stages that overlap ran in parallel.
        Long bars indicate slow stages - look for patterns like stages waiting for others (dependencies)
        or stages with much longer duration than expected (potential bottlenecks).
      </LearningHint>
    </div>
  );
}

export default StageTimeline;
