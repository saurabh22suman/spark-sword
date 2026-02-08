'use client';

/**
 * Data Corruption Detective Tutorial
 * 
 * Interactive scenarios teaching users to spot silent data quality issues
 * in Spark: schema evolution bugs, type coercion, null handling, and
 * non-deterministic behavior.
 * 
 * Philosophy: Show the "green" job that produced wrong data → User investigates
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CorruptionScenario {
  id: string;
  title: string;
  story: string;
  codeSnippet: string;
  clues: string[];
  options: { label: string; isCorrect: boolean; explanation: string }[];
  rootCause: string;
  prevention: string;
}

const CORRUPTION_SCENARIOS: CorruptionScenario[] = [
  {
    id: 'schema-evolution',
    title: 'Case 1: The Missing Column',
    story: 'Your daily ETL writes Parquet files. Last week, a new "region" column was added. The job succeeds, but downstream reports show NULL for region on all historical data. Is this expected?',
    codeSnippet: `# Week 1: Original schema
df.select("user_id", "amount").write.parquet("s3://data/sales/")

# Week 2: New column added
df.select("user_id", "amount", "region").write.parquet("s3://data/sales/")

# Week 3: Read ALL data
spark.read.parquet("s3://data/sales/").show()`,
    clues: [
      'Job status: SUCCESS (no errors)',
      'New files have the "region" column',
      'Old files do NOT have the "region" column',
      'Parquet uses mergeSchema by default in some configs',
    ],
    options: [
      { label: 'Bug — old files should be backfilled', isCorrect: false, explanation: 'Parquet doesn\'t backfill old files. This is expected behavior with schema evolution.' },
      { label: 'Expected — Parquet fills missing columns with NULL', isCorrect: true, explanation: 'Correct! Parquet schema evolution handles missing columns by returning NULL. This is by design, but can surprise teams that expect all rows to have the new column.' },
      { label: 'Data corruption — old files are damaged', isCorrect: false, explanation: 'No corruption. Old files are perfectly valid — they just don\'t have the new column. Parquet handles this gracefully.' },
      { label: 'Spark should throw an error', isCorrect: false, explanation: 'With mergeSchema, Spark intentionally does NOT throw errors. It unifies schemas across files.' },
    ],
    rootCause: 'Parquet schema evolution is permissive: missing columns are filled with NULL. This is correct behavior but can cause silent issues if downstream SQL assumes non-null values.',
    prevention: 'Use .fillna() or COALESCE for new columns with defaults. Add data quality checks (assertions on NULL percentage). Document schema changes in a registry.',
  },
  {
    id: 'type-coercion',
    title: 'Case 2: The Silent Type Cast',
    story: 'A pipeline reads a CSV where "price" is stored as STRING. The code casts it to INT for aggregation. The averages look suspiciously low. No errors were thrown.',
    codeSnippet: `# CSV has: "price" as string (e.g., "29.99", "14.50")
df = spark.read.csv("prices.csv", header=True)

# Cast to INT — what happens to decimals?
df = df.withColumn("price", df.price.cast("int"))

# Result: 29.99 → 29, 14.50 → 14 (truncated, not rounded!)
df.agg(avg("price")).show()`,
    clues: [
      'No errors, no warnings in logs',
      'Original values: "29.99", "14.50", "9.99"',
      'After INT cast: 29, 14, 9',
      'Average drops from ~18.16 to ~17.33',
    ],
    options: [
      { label: 'Spark rounds to nearest integer', isCorrect: false, explanation: 'Spark truncates (floors) when casting to INT, it doesn\'t round. 29.99 becomes 29, not 30.' },
      { label: 'Values are truncated, not rounded — silent precision loss', isCorrect: true, explanation: 'Correct! cast("int") truncates decimals. Use cast("double") or cast("decimal(10,2)") to preserve precision.' },
      { label: 'CSV parsing error', isCorrect: false, explanation: 'CSV parsing works fine — string "29.99" is valid. The issue is the INT cast that throws away decimal precision.' },
      { label: 'The average function is wrong', isCorrect: false, explanation: 'avg() works correctly. It\'s computing the average of truncated ints, which is mathematically correct but semantically wrong.' },
    ],
    rootCause: 'Casting STRING → INT silently truncates decimal values. Spark does not warn about precision loss in type coercion.',
    prevention: 'Always cast to appropriate numeric types (DOUBLE, DECIMAL). Add assertions: assert avg is within expected range. Use inferSchema=True or explicit schemas for CSV.',
  },
  {
    id: 'null-handling',
    title: 'Case 3: The Disappearing Rows',
    story: 'You join two tables and expect 1M rows in the output. You get 800K. No error. No warning. The job completes successfully.',
    codeSnippet: `# users: 1M rows, but 200K have user_id = NULL
users = spark.read.parquet("users/")  # 1M rows

# orders: 500K rows, all have user_id populated
orders = spark.read.parquet("orders/")

# Inner join
result = users.join(orders, "user_id")  # Expected ~1M? Got 800K!`,
    clues: [
      'users table: 1M rows, 200K have NULL user_id',
      'orders table: 500K rows, 0 NULLs in user_id',
      'Inner join drops NULLs (NULL != NULL in SQL)',
      'No error message, job reports SUCCESS',
    ],
    options: [
      { label: 'Data was lost during the join shuffle', isCorrect: false, explanation: 'No data loss in shuffle. The join correctly excludes NULL keys per SQL semantics.' },
      { label: 'NULL join keys are silently dropped — NULL != NULL in SQL', isCorrect: true, explanation: 'Correct! In SQL, NULL != NULL. Inner and outer joins exclude NULL keys by definition. 200K rows with NULL user_id are silently dropped.' },
      { label: 'Partition skew caused some tasks to fail silently', isCorrect: false, explanation: 'Skew causes slowness or OOM, not silent row drops. This is a NULL semantics issue.' },
      { label: 'Orders table has duplicates that offset the count', isCorrect: false, explanation: 'Duplicates would increase the count, not decrease it. The drop is from NULL join keys.' },
    ],
    rootCause: 'SQL NULL semantics: NULL != NULL. Inner join drops all rows where the join key is NULL on either side. This is standards-compliant but often unexpected.',
    prevention: 'Profile NULL percentage before joins. Use .isNotNull() filters explicitly. Consider .fillna() for known defaults. Add row count assertions before/after joins.',
  },
];

interface CorruptionDetectiveProps {
  className?: string;
}

export function CorruptionDetective({ className = '' }: CorruptionDetectiveProps) {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solvedScenarios, setSolvedScenarios] = useState<Set<string>>(new Set());

  const scenario = CORRUPTION_SCENARIOS[currentScenario];

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelectedOption(index);
    setRevealed(true);
    if (scenario.options[index].isCorrect) {
      setSolvedScenarios(prev => new Set([...Array.from(prev), scenario.id]));
    }
  };

  const goTo = (index: number) => {
    setCurrentScenario(index);
    setSelectedOption(null);
    setRevealed(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress */}
      <div className="flex items-center gap-2">
        {CORRUPTION_SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className={cn(
              'flex-1 h-2 rounded-full transition-colors',
              i === currentScenario ? 'bg-amber-500' :
              solvedScenarios.has(s.id) ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'
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
          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            🔍 {scenario.title}
          </h3>

          {/* Story */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
            <p className="text-sm text-amber-800 dark:text-amber-300">{scenario.story}</p>
          </div>

          {/* Code Snippet */}
          <div className="bg-slate-950 rounded-xl p-5 overflow-x-auto">
            <pre className="text-sm text-slate-300 font-mono whitespace-pre">{scenario.codeSnippet}</pre>
          </div>

          {/* Clues */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">🕵️ Investigation Clues</h4>
            <ul className="space-y-2">
              {scenario.clues.map((clue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-amber-500 mt-0.5">▸</span>
                  {clue}
                </li>
              ))}
            </ul>
          </div>

          {/* Diagnosis */}
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
              What caused the data issue?
            </h4>
            <div className="grid gap-3">
              {scenario.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={revealed}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all',
                    !revealed && 'hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer',
                    revealed && selectedOption === i && option.isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950/30',
                    revealed && selectedOption === i && !option.isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950/30',
                    revealed && selectedOption !== i && option.isCorrect && 'border-green-500 bg-green-50/50 dark:bg-green-950/20',
                    revealed && selectedOption !== i && !option.isCorrect && 'border-slate-200 dark:border-slate-700 opacity-50',
                    !revealed && 'border-slate-200 dark:border-slate-700',
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

          {/* Explanation */}
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
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">🛡️ Prevention</h4>
                <p className="text-sm text-green-700 dark:text-green-400">{scenario.prevention}</p>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => goTo(currentScenario - 1)}
              disabled={currentScenario === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-slate-500">
              {currentScenario + 1} / {CORRUPTION_SCENARIOS.length}
            </span>
            <button
              onClick={() => goTo(currentScenario + 1)}
              disabled={currentScenario === CORRUPTION_SCENARIOS.length - 1}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white disabled:opacity-30 hover:bg-amber-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* All Solved */}
      {solvedScenarios.size === CORRUPTION_SCENARIOS.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 rounded-xl p-6 text-center"
        >
          <span className="text-4xl block mb-3">🕵️</span>
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300">All Cases Solved!</h3>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            You can now spot silent data corruption in Spark: schema evolution, type coercion, and NULL handling.
          </p>
        </motion.div>
      )}
    </div>
  );
}
