'use client';

/**
 * OOM Debugger Tutorial
 * 
 * Interactive walkthrough that teaches how to diagnose OutOfMemory errors
 * in Spark by analyzing symptoms, metrics, and root causes.
 * 
 * Philosophy: Present clues → User diagnoses → System explains
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OOMScenario {
  id: string;
  title: string;
  symptoms: string[];
  metrics: Record<string, string>;
  options: { label: string; isCorrect: boolean; explanation: string }[];
  rootCause: string;
  fix: string;
  sparkUiHint: string;
}

const OOM_SCENARIOS: OOMScenario[] = [
  {
    id: 'driver-collect',
    title: 'Scenario 1: Driver OOM on .collect()',
    symptoms: [
      'java.lang.OutOfMemoryError: Java heap space',
      'Error occurs on the DRIVER, not executors',
      'Job was running fine until the last action',
      'DataFrame has 500M rows',
    ],
    metrics: {
      'Driver Memory': '4 GB',
      'Executor Memory': '8 GB (healthy)',
      'GC Time': 'Driver: 95%, Executors: 2%',
      'Data Size': '~50 GB',
      'Action Called': '.collect()',
    },
    options: [
      { label: 'Executor memory too small', isCorrect: false, explanation: 'Executor GC is only 2% — they\'re fine. The problem is on the driver.' },
      { label: '.collect() pulling all data to driver', isCorrect: true, explanation: 'Correct! .collect() brings ALL 50GB to the 4GB driver. Use .take(N), .show(), or write to storage instead.' },
      { label: 'Too many partitions', isCorrect: false, explanation: 'Partition count doesn\'t cause driver OOM. The issue is .collect() pulling everything to driver memory.' },
      { label: 'Shuffle spill', isCorrect: false, explanation: 'Shuffle spill is an executor issue. This OOM is on the driver, caused by .collect().' },
    ],
    rootCause: '.collect() attempts to materialize the entire 50GB DataFrame into the 4GB driver JVM heap.',
    fix: 'Replace .collect() with .take(100), .show(20), or write results to storage with .write.parquet().',
    sparkUiHint: 'Check the "Storage" tab — if driver memory usage spikes at the end, it\'s a .collect() issue.',
  },
  {
    id: 'executor-skew',
    title: 'Scenario 2: Executor OOM During GroupBy',
    symptoms: [
      'ExecutorLostFailure: Container killed by YARN for exceeding memory limits',
      'Only some executors fail, others are fine',
      'Happens during a groupBy().count() stage',
      'Stage has 200 tasks, 3 are extremely slow',
    ],
    metrics: {
      'Driver Memory': '2 GB (healthy)',
      'Executor Memory': '4 GB',
      'Max Task Duration': '45 min (vs 30s average)',
      'Max Shuffle Read': '12 GB (one task)',
      'Avg Shuffle Read': '200 MB',
      'Spill (Disk)': '8 GB on 3 executors',
    },
    options: [
      { label: 'Not enough executors', isCorrect: false, explanation: 'More executors won\'t help — the problem is data skew. One key has way more data than others.' },
      { label: 'Data skew causing some tasks to process 60x more data', isCorrect: true, explanation: 'Correct! Max shuffle read (12GB) is 60x the average (200MB). A few hot keys dominate. Fix with salting or AQE skew join.' },
      { label: 'Executor memory too small for all tasks', isCorrect: false, explanation: 'Most tasks only read 200MB and finish in 30s. The issue is specific to 3 tasks with 12GB each — that\'s skew.' },
      { label: 'Too many shuffle partitions', isCorrect: false, explanation: '200 partitions is reasonable. The issue is that skewed keys all hash to the same partition.' },
    ],
    rootCause: 'Data skew: a few groupBy keys contain 60x more data than average, causing those tasks to OOM.',
    fix: 'Salt the skewed keys (add random prefix), use AQE skew join optimization, or pre-filter/sample the hot keys.',
    sparkUiHint: 'In the Stages tab, sort tasks by "Shuffle Read Size" — a huge gap between max and median confirms skew.',
  },
  {
    id: 'broadcast-oom',
    title: 'Scenario 3: Driver OOM on Broadcast Join',
    symptoms: [
      'java.lang.OutOfMemoryError: Java heap space during broadcast',
      'Error mentions BroadcastExchangeExec',
      'The "small" table is actually 3GB',
      'spark.sql.autoBroadcastJoinThreshold set to 5GB',
    ],
    metrics: {
      'Driver Memory': '4 GB',
      'Broadcast Table Size': '3 GB (compressed), ~8 GB uncompressed',
      'Threshold': 'autoBroadcastJoinThreshold = 5 GB',
      'GC Time': 'Driver: 98%',
      'Executors': 'Healthy, waiting for broadcast',
    },
    options: [
      { label: 'The broadcast table is too large for driver memory', isCorrect: true, explanation: 'Correct! The 3GB compressed table expands to ~8GB uncompressed, exceeding the 4GB driver. Lower the threshold or increase driver memory.' },
      { label: 'Too many executors', isCorrect: false, explanation: 'Executor count doesn\'t affect broadcast OOM. The driver materializes the broadcast table and runs out of heap.' },
      { label: 'Network bandwidth too low', isCorrect: false, explanation: 'This is a memory issue, not network. The table fits in the wire but not in the driver\'s JVM heap.' },
      { label: 'Wrong join type', isCorrect: false, explanation: 'Join type doesn\'t cause OOM. The issue is the broadcast table exceeding driver memory when deserialized.' },
    ],
    rootCause: 'Compressed size (3GB) < threshold (5GB), so Spark broadcasts. But uncompressed size (~8GB) exceeds driver memory (4GB).',
    fix: 'Lower autoBroadcastJoinThreshold to -1 (disable) or a safe value. Or increase driver memory. Or use sort-merge join instead.',
    sparkUiHint: 'Check SQL tab → BroadcastExchange node. If the "data size" is close to driver memory, that\'s your issue.',
  },
];

interface OOMDebuggerProps {
  className?: string;
}

export function OOMDebugger({ className = '' }: OOMDebuggerProps) {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(new Set());

  const scenario = OOM_SCENARIOS[currentScenario];

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelectedOption(index);
    setRevealed(true);
    if (scenario.options[index].isCorrect) {
      setCompletedScenarios(prev => new Set([...Array.from(prev), scenario.id]));
    }
  };

  const nextScenario = () => {
    setCurrentScenario(prev => Math.min(prev + 1, OOM_SCENARIOS.length - 1));
    setSelectedOption(null);
    setRevealed(false);
  };

  const prevScenario = () => {
    setCurrentScenario(prev => Math.max(prev - 1, 0));
    setSelectedOption(null);
    setRevealed(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {OOM_SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setCurrentScenario(i); setSelectedOption(null); setRevealed(false); }}
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              i === currentScenario ? 'bg-red-500' :
              completedScenarios.has(s.id) ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-5"
        >
          {/* Scenario Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {scenario.title}
          </h3>

          {/* Symptoms */}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-5">
            <h4 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
              <span>🚨</span> Error Symptoms
            </h4>
            <ul className="space-y-2">
              {scenario.symptoms.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                  <span className="mt-1 text-red-500">•</span>
                  <code className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded text-xs">
                    {s}
                  </code>
                </li>
              ))}
            </ul>
          </div>

          {/* Metrics */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span>📊</span> Cluster Metrics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(scenario.metrics).map(([key, value]) => (
                <div key={key} className="bg-white dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{key}</div>
                  <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis Options */}
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
              🔎 What&apos;s the root cause?
            </h4>
            <div className="grid gap-3">
              {scenario.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={revealed}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    !revealed && 'hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer',
                    revealed && selectedOption === i && option.isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                    revealed && selectedOption === i && !option.isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                    revealed && selectedOption !== i && option.isCorrect && 'border-green-500 bg-green-50/50 dark:bg-green-950/20',
                    revealed && selectedOption !== i && !option.isCorrect && 'border-slate-200 dark:border-slate-700 opacity-50',
                    !revealed && selectedOption === null && 'border-slate-200 dark:border-slate-700',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                      revealed && option.isCorrect ? 'bg-green-500 text-white' :
                      revealed && selectedOption === i ? 'bg-red-500 text-white' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    )}>
                      {revealed && option.isCorrect ? '✓' : revealed && selectedOption === i ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white text-sm">{option.label}</div>
                      {revealed && (selectedOption === i || option.isCorrect) && (
                        <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">{option.explanation}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reveal Explanation */}
          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-5">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">🧠 Root Cause</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">{scenario.rootCause}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl p-5">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">🔧 Fix</h4>
                <p className="text-sm text-green-700 dark:text-green-400">{scenario.fix}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">🖥️ Spark UI Hint</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">{scenario.sparkUiHint}</p>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={prevScenario}
              disabled={currentScenario === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-slate-500">
              {currentScenario + 1} / {OOM_SCENARIOS.length}
            </span>
            <button
              onClick={nextScenario}
              disabled={currentScenario === OOM_SCENARIOS.length - 1}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white disabled:opacity-30 hover:bg-blue-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Completion */}
      {completedScenarios.size === OOM_SCENARIOS.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-xl p-6 text-center"
        >
          <span className="text-4xl block mb-3">🎉</span>
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300">All Scenarios Solved!</h3>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            You can now systematically diagnose Spark OOM errors by analyzing symptoms, metrics, and Spark UI clues.
          </p>
        </motion.div>
      )}
    </div>
  );
}
