'use client';

/**
 * Straggler Timeline
 * 
 * Visual timeline showing uneven task completion times
 * Teaching: Why stragglers kill stage performance
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: number;
  duration: number; // ms
  startTime: number;
  endTime: number;
  status: 'pending' | 'running' | 'completed';
  isStraggler: boolean;
}

export function StragglerTimeline({ className }: { className?: string }) {
  const [numTasks, setNumTasks] = useState(8);
  const [stragglerCount, setStragglerCount] = useState(1);
  const [stragglerSlowdown, setStragglerSlowdown] = useState(5);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stageComplete, setStageComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const baseDuration = 1000; // 1 second base task duration

  // Initialize tasks
  const initTasks = () => {
    const newTasks: Task[] = [];
    
    for (let i = 0; i < numTasks; i++) {
      const isStraggler = i < stragglerCount;
      newTasks.push({
        id: i,
        duration: isStraggler ? baseDuration * stragglerSlowdown : baseDuration,
        startTime: 0,
        endTime: 0,
        status: 'pending',
        isStraggler
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

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numTasks, stragglerCount, stragglerSlowdown]);

  const startSimulation = () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setStageComplete(false);
    startTimeRef.current = Date.now();
    
    // Start all tasks
    setTasks(prev => prev.map(task => ({
      ...task,
      status: 'running',
      startTime: 0
    })));

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedTime(elapsed);
      
      setTasks(prevTasks => {
        const updated = prevTasks.map(task => {
          if (task.status === 'completed') return task;
          
          if (elapsed >= task.duration) {
            return {
              ...task,
              status: 'completed' as const,
              endTime: task.duration
            };
          }
          
          return task;
        });
        
        // Check if all tasks complete
        if (updated.every(t => t.status === 'completed')) {
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

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const maxDuration = baseDuration * stragglerSlowdown;
  const normalDuration = baseDuration;
  const wastedTime = (maxDuration - normalDuration) * (numTasks - stragglerCount);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Straggler Timeline
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Watch how slow tasks delay the entire stage
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Total Tasks: <span className="text-blue-600 font-bold">{numTasks}</span>
            </label>
            <input
              type="range"
              min="4"
              max="16"
              step="1"
              value={numTasks}
              onChange={(e) => setNumTasks(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Straggler Count: <span className="text-orange-600 font-bold">{stragglerCount}</span>
            </label>
            <input
              type="range"
              min="0"
              max={Math.min(4, numTasks - 1)}
              step="1"
              value={stragglerCount}
              onChange={(e) => setStragglerCount(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Slowdown: <span className="text-red-600 font-bold">{stragglerSlowdown}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={stragglerSlowdown}
              onChange={(e) => setStragglerSlowdown(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-red-600"
            />
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={startSimulation}
            disabled={isRunning || stageComplete}
            className={cn(
              "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-colors",
              isRunning || stageComplete
                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            <Play className="w-5 h-5" />
            {isRunning ? 'Stage Running...' : stageComplete ? 'Stage Complete' : 'Start Stage'}
          </button>
        </div>

        {/* Timeline Visualization */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Task Timeline
            </h4>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>{(elapsedTime / 1000).toFixed(1)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => {
              const progress = task.status === 'completed' 
                ? 100 
                : task.status === 'running' 
                  ? Math.min((elapsedTime / task.duration) * 100, 100)
                  : 0;
              
              const barWidth = (task.duration / maxDuration) * 100;

              return (
                <div key={task.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-16 text-xs font-mono shrink-0",
                    task.isStraggler ? "text-orange-500 font-bold" : "text-slate-500"
                  )}>
                    Task {task.id} {task.isStraggler && '🐢'}
                  </div>
                  
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                    {/* Background showing expected duration */}
                    <div 
                      className={cn(
                        "absolute top-0 bottom-0 left-0 opacity-20",
                        task.isStraggler ? "bg-orange-500" : "bg-blue-500"
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                    
                    {/* Progress bar */}
                    <motion.div
                      className={cn(
                        "h-full rounded-lg",
                        task.status === 'completed'
                          ? task.isStraggler ? "bg-orange-500" : "bg-green-500"
                          : task.isStraggler ? "bg-orange-400" : "bg-blue-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress / 100) * barWidth}%` }}
                    />

                    {/* Duration label */}
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                        {(task.duration / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>

                  <div className="w-16 text-right shrink-0">
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    ) : task.status === 'running' ? (
                      <span className="text-xs text-blue-500 font-bold animate-pulse">
                        {Math.round(progress)}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time markers */}
          <div className="mt-3 flex justify-between text-xs text-slate-400 pl-[76px]">
            <span>0s</span>
            <span>{(maxDuration / 2 / 1000).toFixed(1)}s</span>
            <span>{(maxDuration / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {completedTasks}/{numTasks}
            </div>
            <div className="text-xs text-slate-500 mt-1">Tasks Done</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">
              {(normalDuration / 1000).toFixed(1)}s
            </div>
            <div className="text-xs text-slate-500 mt-1">Normal Task</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(maxDuration / 1000).toFixed(1)}s
            </div>
            <div className="text-xs text-slate-500 mt-1">Straggler Task</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-600">
              {(wastedTime / 1000).toFixed(1)}s
            </div>
            <div className="text-xs text-slate-500 mt-1">Wasted CPU</div>
          </div>
        </div>

        {/* Insight */}
        <AnimatePresence mode="wait">
          {stageComplete && stragglerCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl"
            >
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-700 dark:text-amber-400 text-lg mb-2">
                    Straggler Impact Analysis
                  </h4>
                  <div className="text-amber-600 dark:text-amber-300 text-sm space-y-2">
                    <p>
                      <strong>{numTasks - stragglerCount} tasks</strong> finished in <strong>{(normalDuration / 1000).toFixed(1)}s</strong>, 
                      but the stage took <strong>{(maxDuration / 1000).toFixed(1)}s</strong> due to {stragglerCount} straggler(s).
                    </p>
                    <p>
                      <strong>Wasted executor time:</strong> {(wastedTime / 1000).toFixed(1)} seconds of CPU 
                      sitting idle while waiting for stragglers.
                    </p>
                    <p className="text-xs opacity-80 mt-3">
                      <strong>Common causes:</strong> Data skew, GC pauses, slow nodes, 
                      or uneven partition sizes. Use <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">spark.speculation</code> 
                      to re-launch slow tasks on other executors.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-2">
          💡 Straggler Mitigation Strategies
        </h4>
        <div className="grid md:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <p><strong>spark.speculation:</strong> Re-run slow tasks speculatively on other nodes</p>
          <p><strong>Salting:</strong> Add random prefix to skewed keys to spread load</p>
          <p><strong>AQE:</strong> Adaptive Query Execution can dynamically rebalance</p>
        </div>
      </div>
    </div>
  );
}
