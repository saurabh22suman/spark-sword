'use client';

/**
 * Spark UI Walkthrough (Simulated)
 * 
 * Click through stages with explanations overlayed.
 * Teaching: Navigate Spark UI confidently and extract insights.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, ChevronRight, ChevronLeft, Eye,
  AlertTriangle, CheckCircle, BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UISection {
  id: string;
  name: string;
  description: string;
  whatToLook: string[];
  redFlags: string[];
  greenFlags: string[];
}

const UI_SECTIONS: UISection[] = [
  {
    id: 'jobs',
    name: 'Jobs Tab',
    description: 'Shows all Spark jobs triggered by actions in your code.',
    whatToLook: [
      'Number of jobs (each action = one job)',
      'Job duration distribution',
      'Failed jobs (red indicators)',
      'Skipped stages (cached data)'
    ],
    redFlags: [
      'Many small jobs (may indicate inefficient code)',
      'One job taking 90% of total time',
      'Failed jobs with retry indicators'
    ],
    greenFlags: [
      'Jobs complete without failures',
      'Reasonable duration spread',
      'Skipped stages (effective caching)'
    ]
  },
  {
    id: 'stages',
    name: 'Stages Tab',
    description: 'Each stage is a set of tasks that can run in parallel.',
    whatToLook: [
      'Stage boundaries (where shuffles occur)',
      'Input/Output data sizes',
      'Shuffle Read/Write volumes',
      'Number of tasks per stage'
    ],
    redFlags: [
      'Large Shuffle Write with small input (data explosion)',
      'Very few tasks in large stages (low parallelism)',
      'Huge data skew in shuffle sizes'
    ],
    greenFlags: [
      'Balanced Shuffle Read/Write',
      'Task count matches partition count',
      'Consistent stage durations'
    ]
  },
  {
    id: 'stage-detail',
    name: 'Stage Detail View',
    description: 'Deep dive into individual stage performance.',
    whatToLook: [
      'Task duration histogram',
      'Shuffle Read/Write per task',
      'Spill (Memory) and Spill (Disk)',
      'GC Time per task'
    ],
    redFlags: [
      'Long tail in task durations (skew!)',
      'Any Spill (Disk) > 0',
      'GC Time > 10% of task duration',
      'One task taking 10x longer than median'
    ],
    greenFlags: [
      'Tight task duration distribution',
      'No disk spills',
      'Low GC overhead',
      'Max task time close to median'
    ]
  },
  {
    id: 'executors',
    name: 'Executors Tab',
    description: 'Shows resource usage per executor.',
    whatToLook: [
      'Storage Memory Used',
      'Disk Used (spills!)',
      'Task count per executor',
      'Failed tasks'
    ],
    redFlags: [
      'Uneven task distribution across executors',
      'Any executor with disk usage',
      'Dead executors during job',
      'High RDD Blocks with low reuse'
    ],
    greenFlags: [
      'Even task distribution',
      'Zero disk usage',
      'All executors healthy',
      'Cached data being reused'
    ]
  },
  {
    id: 'sql',
    name: 'SQL / DataFrame Tab',
    description: 'Shows the physical execution plan with metrics.',
    whatToLook: [
      'Exchange nodes (shuffles)',
      'BroadcastExchange (broadcast joins)',
      'Scan nodes (data read)',
      'Time spent per operator'
    ],
    redFlags: [
      'Many Exchange nodes (excessive shuffling)',
      'Sort before Join (sort-merge instead of broadcast)',
      'Full table scans without filters',
      'Filter after Aggregate (missed pushdown)'
    ],
    greenFlags: [
      'BroadcastHashJoin for small tables',
      'Filter pushdown to scan',
      'Minimal Exchange nodes',
      'Whole-stage codegen enabled'
    ]
  }
];

interface MockMetric {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad';
}

const MOCK_METRICS: Record<string, MockMetric[]> = {
  jobs: [
    { label: 'Total Jobs', value: '3', status: 'good' },
    { label: 'Completed', value: '3', status: 'good' },
    { label: 'Failed', value: '0', status: 'good' },
    { label: 'Duration', value: '2.5 min', status: 'good' },
  ],
  stages: [
    { label: 'Total Stages', value: '7', status: 'good' },
    { label: 'Shuffle Write', value: '1.2 GB', status: 'warning' },
    { label: 'Shuffle Read', value: '1.2 GB', status: 'warning' },
    { label: 'Skipped', value: '2', status: 'good' },
  ],
  'stage-detail': [
    { label: 'Tasks', value: '200', status: 'good' },
    { label: 'Median Duration', value: '2.1s', status: 'good' },
    { label: 'Max Duration', value: '45s', status: 'bad' },
    { label: 'Spill (Disk)', value: '500 MB', status: 'bad' },
  ],
  executors: [
    { label: 'Active', value: '10', status: 'good' },
    { label: 'Storage Used', value: '2.5 GB', status: 'good' },
    { label: 'Disk Used', value: '500 MB', status: 'bad' },
    { label: 'Failed Tasks', value: '0', status: 'good' },
  ],
  sql: [
    { label: 'Exchanges', value: '3', status: 'warning' },
    { label: 'Broadcast Joins', value: '1', status: 'good' },
    { label: 'Codegen', value: 'Enabled', status: 'good' },
    { label: 'Filter Pushdown', value: 'Yes', status: 'good' },
  ],
};

function MetricCard({ metric }: { metric: MockMetric }) {
  const statusColors = {
    good: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    bad: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  };
  const valueColors = {
    good: 'text-green-700 dark:text-green-400',
    warning: 'text-yellow-700 dark:text-yellow-400',
    bad: 'text-red-700 dark:text-red-400',
  };

  return (
    <div className={cn("p-3 rounded-lg border", statusColors[metric.status])}>
      <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
      <div className={cn("text-lg font-bold", valueColors[metric.status])}>
        {metric.value}
      </div>
    </div>
  );
}

export function SparkUIWalkthrough({ className }: { className?: string }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [showHints, setShowHints] = useState(true);

  const section = UI_SECTIONS[currentSection];
  const metrics = MOCK_METRICS[section.id];

  const goNext = () => {
    if (currentSection < UI_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const goPrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const reset = () => {
    setCurrentSection(0);
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Spark UI Walkthrough
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Learn to read the Spark UI like a senior engineer
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHints(!showHints)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showHints 
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={reset}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="flex gap-2">
          {UI_SECTIONS.map((s, index) => (
            <button
              key={s.id}
              onClick={() => setCurrentSection(index)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                currentSection === index
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={section.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Section Title */}
            <div className="mb-6">
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {section.name}
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                {section.description}
              </p>
            </div>

            {/* Mock Metrics */}
            <div className="bg-slate-900 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400 font-mono">
                  Spark UI &gt; {section.name}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.map((metric, i) => (
                  <MetricCard key={i} metric={metric} />
                ))}
              </div>
            </div>

            {/* What To Look For */}
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* What To Look For */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      What To Look For
                    </h5>
                    <ul className="space-y-2">
                      {section.whatToLook.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                          <span className="text-blue-400">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Red Flags & Green Flags */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                      <h5 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Red Flags
                      </h5>
                      <ul className="space-y-2">
                        {section.redFlags.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                            <span className="text-red-400">✗</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                      <h5 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Green Flags
                      </h5>
                      <ul className="space-y-2">
                        {section.greenFlags.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                            <span className="text-green-400">✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={goPrev}
                disabled={currentSection === 0}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-slate-400">
                {currentSection + 1} of {UI_SECTIONS.length}
              </span>
              <button
                onClick={goNext}
                disabled={currentSection === UI_SECTIONS.length - 1}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Teaching Insight */}
      <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          <strong>💡 Key Insight:</strong> The Spark UI tells a story. Red flags often chain together: 
          skew → straggler → spill → slow stage. Learn to trace these patterns backward to find root causes.
        </p>
      </div>
    </div>
  );
}
