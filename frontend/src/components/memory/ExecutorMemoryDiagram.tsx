'use client';

/**
 * Executor Memory Interactive Diagram
 * 
 * Per executor-memory-interactive-diagram-spec.md:
 * A mentor-grade visual explanation of Spark executor memory.
 * 
 * Teaching goals:
 * - Why Spark spills to disk
 * - Why caching can make things worse
 * - Why more memory does not always fix the job
 * - Why shuffles and joins stress memory differently
 * 
 * Visual Metaphor: Executor as a "Workroom"
 * - Execution Memory → Active work tables
 * - Storage Memory → Shelves (cached data)
 * - Reserved/Overhead → Fixed walls
 * - Spill → Data pushed outside to disk
 * 
 * Non-negotiables:
 * - CSS/SVG first
 * - Motion only on state change
 * - Reduced motion support
 * - No memory size sliders initially
 * - No GC tuning, no exact byte calculations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLearningMode } from '@/lib/LearningModeContext';
import { 
  HardDrive, 
  Cpu, 
  Database, 
  AlertTriangle,
  Info
} from 'lucide-react';

// Types
interface MemoryState {
  rowsPerTask: number;        // 1-100 scale
  concurrentTasks: number;    // 1-8
  cacheEnabled: boolean;
  shuffleEnabled: boolean;
}

interface MemoryPressure {
  executionUsed: number;     // 0-100%
  storageUsed: number;       // 0-100%
  isSpilling: boolean;
  spillAmount: number;       // 0-100% of overflow
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ExecutorMemoryDiagramProps {
  className?: string;
  showPrediction?: boolean;
}

// Calculate memory pressure based on inputs
function calculatePressure(state: MemoryState): MemoryPressure {
  // Base execution pressure from rows and concurrent tasks
  const baseExecution = (state.rowsPerTask / 100) * (state.concurrentTasks / 8) * 100;
  
  // Shuffle adds significant execution pressure
  const shufflePenalty = state.shuffleEnabled ? 25 : 0;
  
  // Storage pressure from cache
  const storageUsed = state.cacheEnabled ? 40 : 0;
  
  // Effective execution (storage competes)
  const executionCapacity = 100 - (storageUsed * 0.5); // Cache reduces available execution
  const executionUsed = Math.min(100, (baseExecution + shufflePenalty) / executionCapacity * 100);
  
  // Determine if spilling
  const totalPressure = executionUsed + storageUsed * 0.3;
  const isSpilling = totalPressure > 85;
  const spillAmount = isSpilling ? Math.min(100, (totalPressure - 85) * 5) : 0;
  
  // Pressure level
  let pressureLevel: MemoryPressure['pressureLevel'] = 'low';
  if (totalPressure > 85) pressureLevel = 'critical';
  else if (totalPressure > 65) pressureLevel = 'high';
  else if (totalPressure > 45) pressureLevel = 'medium';
  
  return {
    executionUsed: Math.min(100, executionUsed),
    storageUsed,
    isSpilling,
    spillAmount,
    pressureLevel,
  };
}

// Pressure color mapping
const pressureColors = {
  low: 'hsl(217, 91%, 60%)',      // Blue
  medium: 'hsl(45, 93%, 47%)',    // Yellow
  high: 'hsl(27, 96%, 61%)',      // Orange
  critical: 'hsl(0, 84%, 60%)',   // Red
};

// Triggered explanations
interface TriggeredExplanation {
  title: string;
  what: string;
  why: string;
  tradeoff: string;
}

function getTriggeredExplanation(
  prevPressure: MemoryPressure,
  currentPressure: MemoryPressure,
  state: MemoryState
): TriggeredExplanation | null {
  // First spill
  if (!prevPressure.isSpilling && currentPressure.isSpilling) {
    return {
      title: "Spill to Disk",
      what: "Spark is writing intermediate data to disk.",
      why: "Memory pressure exceeded available execution memory. Rather than fail, Spark offloads data temporarily.",
      tradeoff: "The job continues but slows significantly. Disk I/O is 10-100x slower than memory access.",
    };
  }
  
  // Cache causing pressure
  if (state.cacheEnabled && currentPressure.pressureLevel === 'high' && prevPressure.pressureLevel === 'medium') {
    return {
      title: "Cache Competition",
      what: "Cached data is competing with active computation.",
      why: "Spark's unified memory model shares space between storage (cache) and execution. Caching too much reduces working room.",
      tradeoff: "Faster repeated reads vs. less room for shuffles and aggregations.",
    };
  }
  
  // Too many concurrent tasks
  if (state.concurrentTasks >= 6 && currentPressure.pressureLevel === 'critical') {
    return {
      title: "Task Concurrency Pressure",
      what: "Too many tasks are running simultaneously.",
      why: "Each task needs memory for its own shuffle buffers, aggregation maps, and intermediate results. More tasks = shared memory stretched thinner.",
      tradeoff: "Parallelism vs. per-task memory. Sometimes fewer concurrent tasks run faster.",
    };
  }
  
  return null;
}

export function ExecutorMemoryDiagram({ 
  className = '',
  showPrediction = false 
}: ExecutorMemoryDiagramProps) {
  const { isLearningMode } = useLearningMode();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  
  const [state, setState] = useState<MemoryState>({
    rowsPerTask: 30,
    concurrentTasks: 2,
    cacheEnabled: false,
    shuffleEnabled: false,
  });
  
  const [pressure, setPressure] = useState<MemoryPressure>(() => calculatePressure(state));
  const [explanation, setExplanation] = useState<TriggeredExplanation | null>(null);
  const [showPredictionPrompt, setShowPredictionPrompt] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  
  const prevPressureRef = useRef<MemoryPressure>(pressure);
  
  // Update pressure when state changes
  useEffect(() => {
    const newPressure = calculatePressure(state);
    
    // Check for triggered explanations
    const triggered = getTriggeredExplanation(prevPressureRef.current, newPressure, state);
    if (triggered) {
      setExplanation(triggered);
    }
    
    prevPressureRef.current = newPressure;
    setPressure(newPressure);
  }, [state]);
  
  // Handle control changes with optional prediction
  const handleControlChange = useCallback((key: keyof MemoryState, value: number | boolean) => {
    // Prediction prompt for significant changes
    if (showPrediction && key === 'concurrentTasks' && typeof value === 'number' && value > state.concurrentTasks + 2) {
      setShowPredictionPrompt(true);
      setPrediction(null);
      // Still update after prediction
    }
    
    setState(prev => ({ ...prev, [key]: value }));
  }, [state.concurrentTasks, showPrediction]);
  
  const dismissExplanation = useCallback(() => {
    setExplanation(null);
  }, []);
  
  // Animation variants
  const getMotionDuration = (base: number) => reducedMotion ? 0.01 : (isLearningMode ? base * 1.5 : base);

  return (
    <div 
      data-testid="executor-memory-diagram"
      className={`relative ${className}`}
    >
      {/* Main Diagram */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Controls Panel */}
        <div className="lg:w-64 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Workload Controls
          </h3>
          
          {/* Rows per Task */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="text-slate-400">Rows per Task</label>
              <span className="text-slate-300 font-mono">{state.rowsPerTask}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={state.rowsPerTask}
              onChange={(e) => handleControlChange('rowsPerTask', Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              aria-label="Rows per task"
            />
          </div>
          
          {/* Concurrent Tasks */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="text-slate-400">Concurrent Tasks</label>
              <span className="text-slate-300 font-mono">{state.concurrentTasks}</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={state.concurrentTasks}
              onChange={(e) => handleControlChange('concurrentTasks', Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              aria-label="Concurrent tasks"
            />
          </div>
          
          {/* Cache Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <label className="text-sm text-slate-400">Cache Enabled</label>
            </div>
            <button
              onClick={() => handleControlChange('cacheEnabled', !state.cacheEnabled)}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${state.cacheEnabled ? 'bg-purple-600' : 'bg-slate-700'}
              `}
              aria-label="Toggle cache"
            >
              <motion.span
                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"
                animate={{ x: state.cacheEnabled ? 20 : 0 }}
                transition={{ duration: getMotionDuration(0.15) }}
              />
            </button>
          </div>
          
          {/* Shuffle Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-orange-400" />
              <label className="text-sm text-slate-400">Shuffle Active</label>
            </div>
            <button
              onClick={() => handleControlChange('shuffleEnabled', !state.shuffleEnabled)}
              className={`
                relative w-10 h-5 rounded-full transition-colors
                ${state.shuffleEnabled ? 'bg-orange-600' : 'bg-slate-700'}
              `}
              aria-label="Toggle shuffle"
            >
              <motion.span
                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"
                animate={{ x: state.shuffleEnabled ? 20 : 0 }}
                transition={{ duration: getMotionDuration(0.15) }}
              />
            </button>
          </div>
          
          {/* Pressure Indicator */}
          <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pressureColors[pressure.pressureLevel] }}
              />
              <span className="text-sm font-medium text-slate-300 capitalize">
                {pressure.pressureLevel} Pressure
              </span>
            </div>
            {pressure.isSpilling && (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle className="w-3 h-3" />
                Spilling to disk
              </div>
            )}
          </div>
        </div>
        
        {/* Memory Visualization */}
        <div className="flex-1">
          <svg 
            viewBox="0 0 500 320"
            className="w-full h-auto max-h-80"
            role="img"
            aria-label="Executor memory visualization showing execution and storage memory regions"
          >
            <defs>
              <linearGradient id="executionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={pressureColors[pressure.pressureLevel]} stopOpacity="0.8" />
                <stop offset="100%" stopColor={pressureColors[pressure.pressureLevel]} stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="storageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(271, 91%, 65%)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(271, 91%, 65%)" stopOpacity="0.4" />
              </linearGradient>
              <pattern id="spillPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                <path d="M0 4 L8 4 M4 0 L4 8" stroke="hsl(0, 84%, 60%)" strokeWidth="1" opacity="0.3" />
              </pattern>
            </defs>
            
            {/* Executor Container (The "Room") */}
            <motion.rect
              x="50"
              y="20"
              width="400"
              height="200"
              rx="12"
              className="fill-slate-800/50 stroke-slate-600"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            
            {/* Room label */}
            <text x="250" y="12" textAnchor="middle" className="fill-slate-400 text-xs font-medium">
              Executor Memory (JVM Heap)
            </text>
            
            {/* Execution Memory Region (Left/Top) */}
            <motion.g>
              {/* Execution area background */}
              <rect
                x="60"
                y="30"
                width="180"
                height="180"
                rx="8"
                className="fill-slate-700/30 stroke-slate-600/50"
                strokeWidth="1"
              />
              
              {/* Execution memory used */}
              <motion.rect
                x="60"
                y={30 + 180 - (180 * pressure.executionUsed / 100)}
                width="180"
                height={180 * pressure.executionUsed / 100}
                rx="8"
                fill="url(#executionGradient)"
                initial={{ height: 0 }}
                animate={{ 
                  height: 180 * pressure.executionUsed / 100,
                  y: 30 + 180 - (180 * pressure.executionUsed / 100)
                }}
                transition={{ duration: getMotionDuration(0.3) }}
              />
              
              {/* Execution label */}
              <text x="150" y="225" textAnchor="middle" className="fill-slate-400 text-[10px] font-medium uppercase">
                Execution Memory
              </text>
              <text x="150" y="238" textAnchor="middle" className="fill-slate-500 text-[9px]">
                (Active Work)
              </text>
              
              {/* Concurrent task indicators */}
              {Array.from({ length: state.concurrentTasks }).map((_, i) => (
                <motion.rect
                  key={i}
                  x={70 + i * 20}
                  y={180 - Math.min(150, pressure.executionUsed * 1.5)}
                  width="15"
                  height={Math.min(150, pressure.executionUsed * 1.5)}
                  rx="2"
                  className="fill-white/10"
                  initial={{ height: 0 }}
                  animate={{ 
                    height: Math.min(150, pressure.executionUsed * 1.5 / state.concurrentTasks * (i + 1)),
                  }}
                  transition={{ duration: getMotionDuration(0.3), delay: i * 0.05 }}
                />
              ))}
              
              {/* Usage percentage */}
              <text x="150" y="130" textAnchor="middle" className="fill-white text-lg font-bold">
                {Math.round(pressure.executionUsed)}%
              </text>
            </motion.g>
            
            {/* Storage Memory Region (Right/Bottom) */}
            <motion.g>
              {/* Storage area background */}
              <rect
                x="260"
                y="30"
                width="180"
                height="180"
                rx="8"
                className="fill-slate-700/30 stroke-slate-600/50"
                strokeWidth="1"
              />
              
              {/* Storage memory used (cache) */}
              <motion.rect
                x="260"
                y={30 + 180 - (180 * pressure.storageUsed / 100)}
                width="180"
                height={180 * pressure.storageUsed / 100}
                rx="8"
                fill="url(#storageGradient)"
                initial={{ height: 0 }}
                animate={{ 
                  height: 180 * pressure.storageUsed / 100,
                  y: 30 + 180 - (180 * pressure.storageUsed / 100)
                }}
                transition={{ duration: getMotionDuration(0.3) }}
              />
              
              {/* Storage label */}
              <text x="350" y="225" textAnchor="middle" className="fill-slate-400 text-[10px] font-medium uppercase">
                Storage Memory
              </text>
              <text x="350" y="238" textAnchor="middle" className="fill-slate-500 text-[9px]">
                (Cached Data)
              </text>
              
              {/* Shelf visualization for cache */}
              {state.cacheEnabled && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: getMotionDuration(0.3) }}
                >
                  {[0, 1, 2].map((i) => (
                    <rect
                      key={i}
                      x="270"
                      y={140 + i * 20}
                      width="160"
                      height="15"
                      rx="2"
                      className="fill-purple-400/30 stroke-purple-500/50"
                      strokeWidth="1"
                    />
                  ))}
                </motion.g>
              )}
              
              {/* Usage percentage */}
              <text x="350" y="130" textAnchor="middle" className="fill-white text-lg font-bold">
                {Math.round(pressure.storageUsed)}%
              </text>
            </motion.g>
            
            {/* Spill Area (Below Executor) */}
            <motion.g
              initial={{ opacity: 0.3 }}
              animate={{ opacity: pressure.isSpilling ? 1 : 0.3 }}
              transition={{ duration: getMotionDuration(0.3) }}
            >
              <rect
                x="50"
                y="260"
                width="400"
                height="50"
                rx="8"
                className="fill-slate-900/50 stroke-slate-700"
                strokeWidth="1"
                strokeDasharray={pressure.isSpilling ? "0" : "4,4"}
              />
              
              {/* Disk icon */}
              <HardDrive 
                x="70" 
                y="275" 
                className={`w-5 h-5 ${pressure.isSpilling ? 'text-red-400' : 'text-slate-600'}`}
              />
              
              <text x="100" y="290" className={`text-[10px] font-medium ${pressure.isSpilling ? 'fill-red-400' : 'fill-slate-600'}`}>
                Disk (Spill Area)
              </text>
              
              {/* Spilled data blocks */}
              <AnimatePresence>
                {pressure.isSpilling && (
                  <motion.g>
                    {Array.from({ length: Math.ceil(pressure.spillAmount / 25) }).map((_, i) => (
                      <motion.rect
                        key={i}
                        x={200 + i * 35}
                        y="270"
                        width="25"
                        height="30"
                        rx="3"
                        className="fill-red-500/60"
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 270, opacity: 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          duration: getMotionDuration(0.4), 
                          delay: i * 0.1,
                          ease: "easeIn"
                        }}
                      />
                    ))}
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
            
            {/* Memory boundary arrows (when cache competes) */}
            {state.cacheEnabled && pressure.pressureLevel !== 'low' && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: getMotionDuration(0.3) }}
              >
                <motion.line
                  x1="245"
                  y1="60"
                  x2="245"
                  y2="190"
                  stroke="hsl(27, 96%, 61%)"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  animate={{ x1: [245, 230, 245], x2: [245, 230, 245] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <text x="245" y="55" textAnchor="middle" className="fill-orange-400 text-[8px] font-medium">
                  COMPETING
                </text>
              </motion.g>
            )}
            
            {/* Learning mode labels */}
            {isLearningMode && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <rect x="55" y="35" width="60" height="16" rx="3" className="fill-blue-600/80" />
                <text x="85" y="47" textAnchor="middle" className="fill-white text-[8px] font-medium">
                  SHUFFLES
                </text>
                
                <rect x="265" y="35" width="50" height="16" rx="3" className="fill-purple-600/80" />
                <text x="290" y="47" textAnchor="middle" className="fill-white text-[8px] font-medium">
                  CACHE
                </text>
              </motion.g>
            )}
          </svg>
        </div>
      </div>
      
      {/* Triggered Explanation */}
      <AnimatePresence>
        {explanation && (
          <motion.div
            data-testid="memory-explanation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: getMotionDuration(0.3) }}
            className="mt-6 p-4 rounded-xl bg-slate-800/80 border border-slate-700"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Info className="w-5 h-5 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">{explanation.title}</h4>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">What:</span>
                      <span className="text-slate-300 ml-2">{explanation.what}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Why:</span>
                      <span className="text-slate-300 ml-2">{explanation.why}</span>
                    </div>
                    <div>
                      <span className="text-orange-400">Trade-off:</span>
                      <span className="text-slate-300 ml-2">{explanation.tradeoff}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={dismissExplanation}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Prediction Integration (per spec section 9) */}
      <AnimatePresence>
        {showPredictionPrompt && (
          <motion.div
            data-testid="memory-prediction"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-blue-500/30"
          >
            <p className="text-sm font-medium text-white mb-3">
              What do you think happens if we increase tasks again?
            </p>
            <div className="flex gap-2">
              {['Still fits in memory', 'Spill to disk', 'Job slows significantly'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setPrediction(opt);
                    setShowPredictionPrompt(false);
                  }}
                  className={`
                    px-3 py-2 rounded-lg text-sm
                    ${prediction === opt 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                  `}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExecutorMemoryDiagram;
