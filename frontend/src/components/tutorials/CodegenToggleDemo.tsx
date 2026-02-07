'use client';

/**
 * Codegen Toggle Demo
 * 
 * Toggle whole-stage codegen on/off and see the impact on CPU vs interpretation overhead.
 * Teaching: When codegen helps and when it doesn't.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Cpu, Zap, Code, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StageMetrics {
  name: string;
  withCodegen: number;
  withoutCodegen: number;
  operations: string[];
}

const STAGES: StageMetrics[] = [
  {
    name: 'Stage 0: Filter + Map',
    operations: ['filter', 'map', 'map'],
    withCodegen: 150,
    withoutCodegen: 450
  },
  {
    name: 'Stage 1: Aggregate',
    operations: ['partial_sum', 'shuffle', 'final_sum'],
    withCodegen: 200,
    withoutCodegen: 320
  },
  {
    name: 'Stage 2: Join + Project',
    operations: ['broadcast', 'join', 'project'],
    withCodegen: 180,
    withoutCodegen: 540
  }
];

function CodeBlock({ code, isActive }: { code: string[]; isActive: boolean }) {
  return (
    <div className={cn(
      "bg-slate-900 rounded-lg p-3 font-mono text-xs overflow-x-auto transition-opacity",
      !isActive && "opacity-40"
    )}>
      {code.map((line, i) => (
        <div key={i} className="text-slate-300 whitespace-pre">{line}</div>
      ))}
    </div>
  );
}

export function CodegenToggleDemo({ className }: { className?: string }) {
  const [codegenEnabled, setCodegenEnabled] = useState(true);
  const [numRows, setNumRows] = useState(1000000);
  const [showDetails, setShowDetails] = useState(false);

  // Scale times based on row count
  const scaleFactor = useMemo(() => {
    return numRows / 1000000;
  }, [numRows]);

  const metrics = useMemo(() => {
    const stages = STAGES.map(stage => ({
      ...stage,
      currentTime: codegenEnabled 
        ? Math.round(stage.withCodegen * scaleFactor)
        : Math.round(stage.withoutCodegen * scaleFactor)
    }));

    const totalWithCodegen = stages.reduce((sum, s) => sum + s.withCodegen * scaleFactor, 0);
    const totalWithoutCodegen = stages.reduce((sum, s) => sum + s.withoutCodegen * scaleFactor, 0);
    const currentTotal = codegenEnabled ? totalWithCodegen : totalWithoutCodegen;
    const savings = ((totalWithoutCodegen - totalWithCodegen) / totalWithoutCodegen * 100).toFixed(0);

    return { stages, currentTotal, totalWithCodegen, totalWithoutCodegen, savings };
  }, [codegenEnabled, scaleFactor]);

  const reset = () => {
    setCodegenEnabled(true);
    setNumRows(1000000);
  };

  const interpretedCode = [
    "// Interpreter evaluates each row:",
    "for (row in partition) {",
    "  val = row.get(colIdx)      // Virtual call",
    "  if (predicate.eval(val)) { // Virtual call", 
    "    result = func.apply(val) // Virtual call",
    "    output.append(result)",
    "  }",
    "}"
  ];

  const generatedCode = [
    "// Generated Java bytecode (fused):",
    "while (input.hasNext()) {",
    "  long val = input.getLong(0);  // Direct",
    "  if (val > 100) {              // Inlined",
    "    output.appendLong(val * 2); // Fused",
    "  }",
    "}"
  ];

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Whole-Stage Codegen Demo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Toggle codegen on/off to see the performance difference
            </p>
          </div>
          <button
            onClick={reset}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Toggle Control */}
        <div className="flex items-center justify-center gap-8 mb-8">
          <button
            onClick={() => setCodegenEnabled(false)}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all",
              !codegenEnabled 
                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
            )}
          >
            <Code className={cn(
              "w-6 h-6",
              !codegenEnabled ? "text-orange-500" : "text-slate-400"
            )} />
            <div className="text-left">
              <div className={cn(
                "font-bold",
                !codegenEnabled ? "text-orange-700 dark:text-orange-400" : "text-slate-600 dark:text-slate-400"
              )}>
                Interpreter
              </div>
              <div className="text-xs text-slate-500">Virtual calls per row</div>
            </div>
          </button>

          <button
            onClick={() => setCodegenEnabled(true)}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all",
              codegenEnabled 
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
            )}
          >
            <Zap className={cn(
              "w-6 h-6",
              codegenEnabled ? "text-green-500" : "text-slate-400"
            )} />
            <div className="text-left">
              <div className={cn(
                "font-bold",
                codegenEnabled ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400"
              )}>
                Codegen
              </div>
              <div className="text-xs text-slate-500">Fused bytecode</div>
            </div>
          </button>
        </div>

        {/* Data Size Slider */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Rows to Process: <span className="text-blue-600 font-bold">{(numRows / 1000000).toFixed(1)}M</span>
          </label>
          <input
            type="range"
            min="100000"
            max="10000000"
            step="100000"
            value={numRows}
            onChange={(e) => setNumRows(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>100K</span>
            <span>10M</span>
          </div>
        </div>

        {/* Stage Comparison */}
        <div className="space-y-4 mb-8">
          {metrics.stages.map((stage, index) => (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{stage.name}</span>
                </div>
                <span className={cn(
                  "font-bold",
                  codegenEnabled ? "text-green-600" : "text-orange-600"
                )}>
                  {stage.currentTime}ms
                </span>
              </div>
              
              {/* Progress bars comparing both modes */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-24 text-xs text-slate-500">Codegen:</span>
                  <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(stage.withCodegen * scaleFactor) / (stage.withoutCodegen * scaleFactor) * 100}%` }}
                      className="h-full bg-green-500 rounded-full"
                    />
                  </div>
                  <span className="w-16 text-xs text-green-600 text-right">
                    {Math.round(stage.withCodegen * scaleFactor)}ms
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 text-xs text-slate-500">Interpreted:</span>
                  <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      className="h-full bg-orange-500 rounded-full"
                    />
                  </div>
                  <span className="w-16 text-xs text-orange-600 text-right">
                    {Math.round(stage.withoutCodegen * scaleFactor)}ms
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Total Time Summary */}
        <div className={cn(
          "rounded-xl p-6 border-2",
          codegenEnabled 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className={cn(
                "w-6 h-6",
                codegenEnabled ? "text-green-600" : "text-orange-600"
              )} />
              <span className="font-bold text-slate-900 dark:text-white">Total Execution Time</span>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-3xl font-bold",
                codegenEnabled ? "text-green-600" : "text-orange-600"
              )}>
                {Math.round(metrics.currentTotal)}ms
              </span>
            </div>
          </div>

          {codegenEnabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-green-700 dark:text-green-400"
            >
              🚀 Codegen saves <strong>{metrics.savings}%</strong> compared to interpreted execution
            </motion.div>
          )}
        </div>

        {/* Code Comparison Toggle */}
        <div className="mt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showDetails ? 'Hide' : 'Show'} Code Comparison →
          </button>
          
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 grid md:grid-cols-2 gap-4"
              >
                <div>
                  <h5 className="text-sm font-bold text-orange-600 mb-2 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Interpreted Execution
                  </h5>
                  <CodeBlock code={interpretedCode} isActive={!codegenEnabled} />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-green-600 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Generated Code
                  </h5>
                  <CodeBlock code={generatedCode} isActive={codegenEnabled} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Teaching Insight */}
      <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>💡 Key Insight:</strong> Whole-stage codegen fuses multiple operations into a single loop, 
          eliminating virtual function calls and enabling CPU optimizations. It helps most with 
          CPU-bound workloads and simple operations.
        </p>
      </div>
    </div>
  );
}
