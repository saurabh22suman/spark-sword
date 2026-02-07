'use client';

/**
 * Skew Explosion Demo
 * 
 * Show how one skewed key creates a straggler that delays the entire stage
 * Teaching: Data skew impact on job performance
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, AlertTriangle, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskProgress {
  id: number;
  progress: number;
  isSkewed: boolean;
  completed: boolean;
  dataSize: number;
}

export function SkewExplosionDemo({ className }: { className?: string }) {
  const [skewFactor, setSkewFactor] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState<TaskProgress[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stageComplete, setStageComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize tasks
  const initTasks = () => {
    const newTasks: TaskProgress[] = [];
    const baseSize = 100; // MB
    
    for (let i = 0; i < 8; i++) {
      newTasks.push({
        id: i,
        progress: 0,
        isSkewed: i === 0,
        completed: false,
        dataSize: i === 0 ? baseSize * skewFactor : baseSize
      });
    }
    return newTasks;
  };

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setTasks(initTasks());
    setIsRunning(false);
    setElapsedTime(0);
    setStageComplete(false);
  };

  // Initialize on mount and skew change
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skewFactor]);

  const startSimulation = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setStageComplete(false);
    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedTime(elapsed);
      
      setTasks(prevTasks => {
        const updated = prevTasks.map(task => {
          if (task.completed) return task;
          
          // Normal tasks take 2 seconds, skewed task takes proportionally longer
          const taskDuration = task.isSkewed ? 2000 * (task.dataSize / 100) : 2000;
          const newProgress = Math.min((elapsed / taskDuration) * 100, 100);
          
          return {
            ...task,
            progress: newProgress,
            completed: newProgress >= 100
          };
        });
        
        // Check if all tasks complete
        if (updated.every(t => t.completed)) {
          setStageComplete(true);
          setIsRunning(false);
        }
        
        return updated;
      });
      
      if (!stageComplete) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const completedTasks = tasks.filter(t => t.completed).length;
  const normalCompleteTime = 2000; // 2 seconds
  const skewedCompleteTime = normalCompleteTime * skewFactor;
  const wastedTime = skewedCompleteTime - normalCompleteTime;

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Skew Explosion Demo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Watch how one skewed partition delays everything
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
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Skew Factor: <span className="text-orange-600 dark:text-orange-400 font-bold">{skewFactor}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={skewFactor}
              onChange={(e) => setSkewFactor(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-orange-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1x (Balanced)</span>
              <span>20x (Extreme)</span>
            </div>
          </div>

          <button
            onClick={startSimulation}
            disabled={isRunning || stageComplete}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors",
              isRunning || stageComplete
                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            <Play className="w-5 h-5" />
            {isRunning ? 'Running...' : stageComplete ? 'Complete' : 'Start Stage'}
          </button>
        </div>

        {/* Task Timeline Visualization */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Task Execution Timeline
          </h4>
          
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4">
                <div className={cn(
                  "w-20 text-xs font-mono",
                  task.isSkewed ? "text-orange-500 font-bold" : "text-slate-500"
                )}>
                  Task {task.id}
                  {task.isSkewed && ' ⚠️'}
                </div>
                
                <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                  <motion.div
                    className={cn(
                      "h-full rounded-lg",
                      task.isSkewed 
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-blue-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                  />
                  
                  {/* Data size label */}
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className={cn(
                      "text-xs font-bold",
                      task.progress > 30 ? "text-white" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {task.dataSize} MB
                    </span>
                  </div>
                </div>

                <div className="w-16 text-xs text-right">
                  {task.completed ? (
                    <span className="text-green-500 font-bold">Done</span>
                  ) : isRunning ? (
                    <span className="text-slate-400">{Math.round(task.progress)}%</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Progress */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {(elapsedTime / 1000).toFixed(1)}s
            </div>
            <div className="text-xs text-slate-500 mt-1">Elapsed Time</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <Zap className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {completedTasks}/{tasks.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Tasks Complete</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <AlertTriangle className={cn(
              "w-6 h-6 mx-auto mb-2",
              skewFactor > 5 ? "text-red-500" : "text-slate-400"
            )} />
            <div className={cn(
              "text-2xl font-bold",
              skewFactor > 5 ? "text-red-500" : "text-slate-900 dark:text-white"
            )}>
              {skewFactor}x
            </div>
            <div className="text-xs text-slate-500 mt-1">Skew Factor</div>
          </div>
        </div>

        {/* Insight Panel */}
        <AnimatePresence mode="wait">
          {stageComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl"
            >
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-red-700 dark:text-red-400 text-lg mb-2">
                    Straggler Effect!
                  </h4>
                  <div className="space-y-2 text-red-600 dark:text-red-300">
                    <p>
                      <strong>7 tasks</strong> completed in <strong>~2 seconds</strong>, 
                      but the stage took <strong>~{(skewedCompleteTime / 1000).toFixed(0)} seconds</strong>.
                    </p>
                    <p>
                      <strong>Wasted executor time:</strong> ~{(wastedTime * 7 / 1000).toFixed(0)} executor-seconds 
                      (7 executors idle, waiting for 1 slow task).
                    </p>
                    <p className="text-sm opacity-80 mt-3">
                      <strong>Fix:</strong> Use salting technique—append random suffix to skewed keys, 
                      distribute load, then aggregate again.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!stageComplete && !isRunning && skewFactor > 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>Warning:</strong> With {skewFactor}x skew, Task 0 will process {skewFactor * 100} MB 
                  while others process only 100 MB. This will create a severe straggler.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">
          💡 Why Skew Matters
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
          <p>
            <strong>Parallelism Killer:</strong> Spark can only be as fast as its slowest task. 
            One partition with 10x data takes 10x longer.
          </p>
          <p>
            <strong>Resource Waste:</strong> Other executors finish quickly and sit idle, 
            burning cluster money while waiting for the straggler.
          </p>
        </div>
      </div>
    </div>
  );
}
