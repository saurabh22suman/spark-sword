'use client';

/**
 * Spark Execution Animation Component
 * 
 * Per landing-oage-animation-spec.md:
 * A 4-act visual story explaining "Why do Spark jobs become slow or confusing — 
 * and how does PrepRabbit help me see why?"
 * 
 * ACT I: Data Appears (Input Reality) - Distributed data appears
 * ACT II: DAG Forms (Planning) - Spark plans execution
 * ACT III: Shuffle Emerges (The Pain) - Data movement costs
 * ACT IV: Slowdown & Confusion - Bottleneck delays
 * Resolution: PrepRabbit Intervention - We make this visible
 * 
 * Non-negotiables:
 * - CSS + SVG as primary tools
 * - Framer Motion for transitions
 * - Respects reduced-motion OS settings
 * - Pauses when tab loses focus
 * - No video files, no audio
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type AnimationPhase = 'data' | 'dag' | 'shuffle' | 'slowdown' | 'resolution';

interface SparkExecutionAnimationProps {
  className?: string;
  autoPlay?: boolean;
}

// Phase durations in ms (total ~8-10 seconds per spec)
const PHASE_DURATIONS: Record<AnimationPhase, number> = {
  data: 1500,
  dag: 2000,
  shuffle: 2500,
  slowdown: 2000,
  resolution: 2000,
};

// Data block positions for the animation
const DATA_BLOCKS = [
  { id: 1, delay: 0 },
  { id: 2, delay: 0.1 },
  { id: 3, delay: 0.2 },
  { id: 4, delay: 0.3 },
  { id: 5, delay: 0.4 },
];

// DAG node configuration
const DAG_NODES = [
  { id: 'read', label: 'Read', x: 50, y: 80, type: 'source' },
  { id: 'filter', label: 'Filter', x: 150, y: 80, type: 'narrow' },
  { id: 'shuffle', label: 'Shuffle', x: 250, y: 80, type: 'shuffle' },
  { id: 'reduce', label: 'Reduce', x: 350, y: 60, type: 'narrow' },
  { id: 'write', label: 'Write', x: 450, y: 60, type: 'sink' },
  { id: 'slowNode', label: 'Reduce', x: 350, y: 100, type: 'bottleneck' },
];

// Edge connections
const DAG_EDGES = [
  { from: 'read', to: 'filter', type: 'normal' },
  { from: 'filter', to: 'shuffle', type: 'normal' },
  { from: 'shuffle', to: 'reduce', type: 'shuffle' },
  { from: 'shuffle', to: 'slowNode', type: 'shuffle' },
  { from: 'reduce', to: 'write', type: 'normal' },
  { from: 'slowNode', to: 'write', type: 'slow' },
];

export function SparkExecutionAnimation({ 
  className = '',
  autoPlay = true 
}: SparkExecutionAnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('data');
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if animations should be reduced
  const reducedMotion = prefersReducedMotion ?? false;

  // Phase progression
  const advancePhase = useCallback(() => {
    if (isPaused || isHovered) return;
    
    setPhase(current => {
      const phases: AnimationPhase[] = ['data', 'dag', 'shuffle', 'slowdown', 'resolution'];
      const currentIndex = phases.indexOf(current);
      const nextIndex = (currentIndex + 1) % phases.length;
      return phases[nextIndex];
    });
  }, [isPaused, isHovered]);

  // Timer-based phase progression
  useEffect(() => {
    if (!autoPlay || isPaused || isHovered) return;

    const duration = reducedMotion ? PHASE_DURATIONS[phase] / 2 : PHASE_DURATIONS[phase];
    timeoutRef.current = setTimeout(advancePhase, duration);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [phase, autoPlay, isPaused, isHovered, advancePhase, reducedMotion]);

  // Pause when tab loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Keyboard accessibility - Space/Enter to pause/resume
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsPaused(prev => !prev);
    }
  }, []);

  // Click to pause/resume
  const handleClick = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Animation variants based on reduced motion preference
  const getMotionDuration = (base: number) => reducedMotion ? 0.01 : base;

  return (
    <div
      ref={containerRef}
      data-testid="spark-animation"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-phase={phase}
      className={`relative w-full max-w-2xl mx-auto h-64 rounded-2xl 
        bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm 
        border border-slate-200/20 dark:border-slate-700/50
        overflow-hidden cursor-pointer select-none
        focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${className}`}
      tabIndex={0}
      role="img"
      aria-label="Interactive animation showing how Spark executes code and where bottlenecks occur"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* SVG Canvas for DAG visualization */}
      <svg
        viewBox="0 0 520 180"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient for shuffle edges */}
          <linearGradient id="shuffleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
            <stop offset="50%" stopColor="hsl(27, 96%, 61%)" />
            <stop offset="100%" stopColor="hsl(27, 96%, 61%)" />
          </linearGradient>
          
          {/* Animated dash pattern for data flow */}
          <pattern id="dataFlowPattern" patternUnits="userSpaceOnUse" width="10" height="10">
            <circle cx="5" cy="5" r="2" fill="hsl(217, 91%, 60%)" opacity="0.6" />
          </pattern>

          {/* Shuffle icon pattern */}
          <pattern id="shufflePattern" patternUnits="userSpaceOnUse" width="8" height="8">
            <path d="M0 4 L8 4 M4 0 L4 8" stroke="hsl(27, 96%, 61%)" strokeWidth="1" opacity="0.4" />
          </pattern>
        </defs>

        {/* ACT I: Data Blocks (appear from left) */}
        <AnimatePresence>
          {(phase === 'data' || phase === 'dag') && DATA_BLOCKS.map((block, i) => (
            <motion.g
              key={`data-${block.id}`}
              data-testid="data-block"
              initial={{ opacity: 0, x: -30 }}
              animate={{ 
                opacity: phase === 'data' ? 1 : 0.3,
                x: phase === 'dag' ? 30 + i * 8 : 20
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: getMotionDuration(0.5), 
                delay: reducedMotion ? 0 : block.delay 
              }}
            >
              <rect
                x={10}
                y={60 + i * 18}
                width={24}
                height={14}
                rx={3}
                className="fill-blue-500/80 dark:fill-blue-400/80"
              />
            </motion.g>
          ))}
        </AnimatePresence>

        {/* ACT II-V: DAG Nodes */}
        {phase !== 'data' && DAG_NODES.map((node, i) => {
          const isShuffleNode = node.type === 'shuffle';
          const isBottleneck = node.type === 'bottleneck';
          
          // Determine node color based on phase and type
          let nodeClass = 'fill-blue-500/80 dark:fill-blue-400/80';
          if (isShuffleNode && (phase === 'shuffle' || phase === 'slowdown' || phase === 'resolution')) {
            nodeClass = 'fill-orange-500/90 dark:fill-orange-400/90';
          }
          if (isBottleneck && (phase === 'slowdown' || phase === 'resolution')) {
            nodeClass = 'fill-red-500/90 dark:fill-red-400/90';
          }
          if (phase === 'resolution' && node.type !== 'shuffle' && node.type !== 'bottleneck') {
            nodeClass = 'fill-slate-500/60 dark:fill-slate-400/60';
          }

          return (
            <motion.g
              key={node.id}
              data-testid="dag-node"
              data-node-type={node.type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1,
                scale: 1,
              }}
              transition={{ 
                duration: getMotionDuration(0.4), 
                delay: reducedMotion ? 0 : i * 0.1 
              }}
            >
              <rect
                x={node.x - 30}
                y={node.y - 15}
                width={60}
                height={30}
                rx={6}
                className={`${nodeClass} transition-colors duration-300`}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                className="fill-white text-[10px] font-medium pointer-events-none"
              >
                {node.label}
              </text>

              {/* Bottleneck pulse animation */}
              {isBottleneck && (phase === 'slowdown' || phase === 'resolution') && (
                <motion.rect
                  x={node.x - 30}
                  y={node.y - 15}
                  width={60}
                  height={30}
                  rx={6}
                  fill="none"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ 
                    duration: reducedMotion ? 0 : 1.5, 
                    repeat: Infinity 
                  }}
                />
              )}
            </motion.g>
          );
        })}

        {/* DAG Edges */}
        {phase !== 'data' && DAG_EDGES.map((edge, i) => {
          const fromNode = DAG_NODES.find(n => n.id === edge.from)!;
          const toNode = DAG_NODES.find(n => n.id === edge.to)!;
          const isShuffleEdge = edge.type === 'shuffle';
          const isSlowEdge = edge.type === 'slow';
          
          // Determine edge color based on phase
          let strokeColor = 'hsl(217, 91%, 60%)';
          if (isShuffleEdge && (phase === 'shuffle' || phase === 'slowdown' || phase === 'resolution')) {
            strokeColor = 'hsl(27, 96%, 61%)';
          }
          if (isSlowEdge && (phase === 'slowdown' || phase === 'resolution')) {
            strokeColor = 'hsl(0, 84%, 60%)';
          }

          const pathD = `M ${fromNode.x + 30} ${fromNode.y} L ${toNode.x - 30} ${toNode.y}`;

          return (
            <motion.g key={`edge-${i}`}>
              <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2}
                strokeDasharray={isShuffleEdge ? "5,5" : "0"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ 
                  duration: getMotionDuration(0.6), 
                  delay: reducedMotion ? 0 : 0.3 + i * 0.1 
                }}
              />
              
              {/* Animated data particles on shuffle edges */}
              {isShuffleEdge && (phase === 'shuffle' || phase === 'slowdown') && !reducedMotion && (
                <motion.circle
                  r={3}
                  fill="hsl(27, 96%, 61%)"
                  initial={{ offsetDistance: '0%' }}
                  animate={{ offsetDistance: '100%' }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "linear" 
                  }}
                  style={{ offsetPath: `path('${pathD}')` }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Shuffle Indicator Icon */}
        {(phase === 'shuffle' || phase === 'slowdown' || phase === 'resolution') && (
          <motion.g
            data-testid="shuffle-indicator"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: getMotionDuration(0.3) }}
            style={{ color: 'hsl(27, 96%, 61%)' }}
          >
            <circle
              cx={250}
              cy={40}
              r={14}
              className="fill-orange-500/20 dark:fill-orange-400/20"
            />
            <text
              x={250}
              y={44}
              textAnchor="middle"
              className="fill-orange-500 dark:fill-orange-400 text-[10px] font-bold"
            >
              ⚡
            </text>
            <text
              x={250}
              y={60}
              textAnchor="middle"
              className="fill-orange-500/80 dark:fill-orange-400/80 text-[7px] font-medium uppercase tracking-wider"
            >
              Shuffle
            </text>
          </motion.g>
        )}

        {/* Timeline bar at bottom showing stage delay */}
        {(phase === 'slowdown' || phase === 'resolution') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: getMotionDuration(0.3) }}
          >
            {/* Timeline track */}
            <rect x={50} y={155} width={420} height={6} rx={3} className="fill-slate-700/50" />
            
            {/* Fast lane */}
            <motion.rect
              x={50}
              y={155}
              width={280}
              height={6}
              rx={3}
              className="fill-blue-500/60"
              initial={{ width: 0 }}
              animate={{ width: 280 }}
              transition={{ duration: getMotionDuration(0.8) }}
            />
            
            {/* Slow lane (bottleneck) */}
            <motion.rect
              x={330}
              y={155}
              width={0}
              height={6}
              rx={3}
              className="fill-red-500/80"
              animate={{ width: phase === 'slowdown' ? [0, 80, 100, 80] : 140 }}
              transition={{ 
                duration: reducedMotion ? 0 : 2,
                repeat: phase === 'slowdown' ? Infinity : 0,
                repeatType: "reverse"
              }}
            />
            
            <text x={135} y={172} className="fill-slate-400 text-[8px]">
              Stage completes
            </text>
            <text x={380} y={172} className="fill-red-400 text-[8px]">
              Waiting...
            </text>
          </motion.g>
        )}
      </svg>

      {/* Resolution Overlay */}
      <AnimatePresence>
        {phase === 'resolution' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: getMotionDuration(0.5) }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] 
              flex flex-col items-center justify-center gap-4 p-6"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: getMotionDuration(0.4), delay: 0.2 }}
              className="text-lg md:text-xl font-semibold text-white text-center"
            >
              Spark Sword makes this visible.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: getMotionDuration(0.4), delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                href="/playground"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium 
                  text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all 
                  hover:scale-105 active:scale-95"
                onClick={(e) => e.stopPropagation()}
              >
                Explore Playground <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <Link
                href="/scenarios"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium 
                  text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-full transition-all 
                  border border-slate-600"
                onClick={(e) => e.stopPropagation()}
              >
                Try a Scenario
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 px-2 py-1 bg-slate-800/80 rounded text-xs text-slate-400"
          >
            Paused
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase indicator dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {(['data', 'dag', 'shuffle', 'slowdown', 'resolution'] as AnimationPhase[]).map((p) => (
          <button
            key={p}
            onClick={(e) => {
              e.stopPropagation();
              setPhase(p);
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              phase === p 
                ? 'bg-blue-500 scale-125' 
                : 'bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Jump to ${p} phase`}
          />
        ))}
      </div>
    </div>
  );
}

export default SparkExecutionAnimation;
