'use client';

/**
 * Executor Memory Simulator
 * 
 * Shows memory blocks filling and spilling to disk
 * Teaching: Memory management in Spark executors
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, HardDrive, Cpu, AlertTriangle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExecutorMemorySimulator({ className }: { className?: string }) {
  const [executorMemory, setExecutorMemory] = useState(8); // GB
  const [memoryFraction, setMemoryFraction] = useState(0.6);
  const [storageFraction, setStorageFraction] = useState(0.5);
  const [dataToProcess, setDataToProcess] = useState(6); // GB
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'loading' | 'processing' | 'spilling' | 'complete'>('idle');
  const [spillAmount, setSpillAmount] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Calculate memory regions
  const reservedMemory = 0.3; // 300MB reserved
  const usableMemory = executorMemory * (1 - reservedMemory / executorMemory);
  const sparkMemory = usableMemory * memoryFraction;
  const userMemory = usableMemory * (1 - memoryFraction);
  const storageMemory = sparkMemory * storageFraction;
  const executionMemory = sparkMemory * (1 - storageFraction);

  // Check if we'll spill
  const willSpill = dataToProcess > executionMemory;
  const estimatedSpill = Math.max(0, dataToProcess - executionMemory);

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('idle');
    setSpillAmount(0);
  };

  const runSimulation = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setSpillAmount(0);
    
    // Phase 1: Loading
    setCurrentPhase('loading');
    
    setTimeout(() => {
      // Phase 2: Processing
      setCurrentPhase('processing');
      
      setTimeout(() => {
        if (willSpill) {
          // Phase 3: Spilling
          setCurrentPhase('spilling');
          
          // Animate spill amount
          let spilled = 0;
          const spillInterval = setInterval(() => {
            spilled += 0.5;
            setSpillAmount(spilled);
            
            if (spilled >= estimatedSpill) {
              clearInterval(spillInterval);
              setTimeout(() => {
                setCurrentPhase('complete');
                setIsRunning(false);
              }, 500);
            }
          }, 100);
        } else {
          // No spill needed
          setTimeout(() => {
            setCurrentPhase('complete');
            setIsRunning(false);
          }, 1000);
        }
      }, 1500);
    }, 1000);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    const currentAnimationRef = animationRef.current;
    return () => {
      if (currentAnimationRef) {
        cancelAnimationFrame(currentAnimationRef);
      }
    };
  }, []);

  // Memory bar segments
  const memorySegments = [
    { label: 'Reserved', size: reservedMemory, color: 'bg-slate-400', textColor: 'text-slate-600' },
    { label: 'User Memory', size: userMemory, color: 'bg-amber-400', textColor: 'text-amber-700' },
    { label: 'Storage', size: storageMemory, color: 'bg-blue-500', textColor: 'text-blue-700' },
    { label: 'Execution', size: executionMemory, color: 'bg-green-500', textColor: 'text-green-700' },
  ];

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Executor Memory Simulator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Watch memory fill up and spill to disk
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

      <div className="p-8">
        {/* Configuration Controls */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left Column - Memory Config */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                spark.executor.memory: <span className="text-blue-600 font-bold">{executorMemory} GB</span>
              </label>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={executorMemory}
                onChange={(e) => setExecutorMemory(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                spark.memory.fraction: <span className="text-purple-600 font-bold">{memoryFraction.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={memoryFraction}
                onChange={(e) => setMemoryFraction(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-purple-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                spark.memory.storageFraction: <span className="text-green-600 font-bold">{storageFraction.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.05"
                value={storageFraction}
                onChange={(e) => setStorageFraction(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-green-600"
              />
            </div>
          </div>

          {/* Right Column - Data Config */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Data to Process: <span className="text-orange-600 font-bold">{dataToProcess} GB</span>
              </label>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={dataToProcess}
                onChange={(e) => setDataToProcess(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-orange-600"
              />
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Memory Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Execution Memory:</span>
                  <span className="font-mono font-bold text-green-600">{executionMemory.toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage Memory:</span>
                  <span className="font-mono font-bold text-blue-600">{storageMemory.toFixed(1)} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">User Memory:</span>
                  <span className="font-mono font-bold text-amber-600">{userMemory.toFixed(1)} GB</span>
                </div>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={isRunning}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors",
                isRunning
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              <Play className="w-5 h-5" />
              {isRunning ? 'Processing...' : 'Run Task'}
            </button>
          </div>
        </div>

        {/* Memory Visualization */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Executor Memory Layout
          </h4>
          
          <div className="relative h-16 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex">
            {memorySegments.map((segment, idx) => (
              <motion.div
                key={segment.label}
                className={cn("h-full flex items-center justify-center", segment.color)}
                style={{ width: `${(segment.size / executorMemory) * 100}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${(segment.size / executorMemory) * 100}%` }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                {segment.size > 0.8 && (
                  <span className="text-xs font-bold text-white truncate px-2">
                    {segment.label} ({segment.size.toFixed(1)}G)
                  </span>
                )}
              </motion.div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            {memorySegments.map((segment) => (
              <div key={segment.label} className="flex items-center gap-1">
                <div className={cn("w-3 h-3 rounded", segment.color)} />
                <span className="text-slate-500">{segment.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Visualization */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Memory Block */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-green-500" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300">Execution Memory</h4>
            </div>
            
            <div className="relative h-32 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
              <AnimatePresence>
                {(currentPhase === 'loading' || currentPhase === 'processing' || currentPhase === 'spilling' || currentPhase === 'complete') && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ 
                      height: `${Math.min((dataToProcess / executionMemory) * 100, 100)}%`,
                      backgroundColor: willSpill ? '#ef4444' : '#22c55e'
                    }}
                    className="absolute bottom-0 left-0 right-0 rounded-b-lg"
                  />
                )}
              </AnimatePresence>
              
              {/* Capacity line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/50" />
              <span className="absolute top-1 right-2 text-xs text-white/70">
                {executionMemory.toFixed(1)} GB max
              </span>
              
              {/* Data label */}
              {currentPhase !== 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white drop-shadow">
                    {dataToProcess} GB data
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Disk Block */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-5 h-5 text-orange-500" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300">Disk Spill</h4>
            </div>
            
            <div className="relative h-32 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
              <AnimatePresence>
                {(currentPhase === 'spilling' || currentPhase === 'complete') && spillAmount > 0 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(spillAmount / estimatedSpill) * 100}%` }}
                    className="absolute bottom-0 left-0 right-0 bg-orange-500 rounded-b-lg"
                  />
                )}
              </AnimatePresence>
              
              {/* Spill amount label */}
              {spillAmount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white drop-shadow">
                    {spillAmount.toFixed(1)} GB spilled
                  </span>
                </div>
              )}
              
              {currentPhase === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-slate-400">Empty</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status / Insights */}
        <AnimatePresence mode="wait">
          {willSpill && currentPhase === 'idle' && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                <div>
                  <h5 className="font-bold text-orange-700 dark:text-orange-400 text-sm">Spill Expected</h5>
                  <p className="text-orange-600 dark:text-orange-300 text-sm">
                    Data ({dataToProcess} GB) exceeds execution memory ({executionMemory.toFixed(1)} GB). 
                    ~{estimatedSpill.toFixed(1)} GB will spill to disk, slowing down processing.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentPhase === 'spilling' && (
            <motion.div
              key="spilling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
                <div>
                  <h5 className="font-bold text-red-700 dark:text-red-400 text-sm">Spilling to Disk...</h5>
                  <p className="text-red-600 dark:text-red-300 text-sm">
                    Memory exceeded! Writing {spillAmount.toFixed(1)}/{estimatedSpill.toFixed(1)} GB to disk. 
                    This causes significant I/O overhead.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentPhase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "p-4 rounded-xl border",
                spillAmount > 0 
                  ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              )}
            >
              <h5 className={cn(
                "font-bold text-sm mb-1",
                spillAmount > 0 ? "text-orange-700 dark:text-orange-400" : "text-green-700 dark:text-green-400"
              )}>
                {spillAmount > 0 ? 'Task Complete (with Spill)' : 'Task Complete (No Spill)'}
              </h5>
              <p className={cn(
                "text-sm",
                spillAmount > 0 ? "text-orange-600 dark:text-orange-300" : "text-green-600 dark:text-green-300"
              )}>
                {spillAmount > 0 
                  ? `Processed ${dataToProcess} GB with ${spillAmount.toFixed(1)} GB disk spill. Consider increasing executor memory or reducing partition size.`
                  : `Processed ${dataToProcess} GB entirely in memory. Optimal performance!`
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <h4 className="font-bold text-blue-800 dark:text-blue-400 text-sm mb-1">
          💡 Memory Management Tips
        </h4>
        <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
          <li>• <strong>spark.memory.fraction</strong>: Higher = more for Spark, less for user code/overhead</li>
          <li>• <strong>spark.memory.storageFraction</strong>: Balance between cached data vs shuffle/sort buffers</li>
          <li>• Unified Memory Manager can borrow between storage and execution when needed</li>
        </ul>
      </div>
    </div>
  );
}
