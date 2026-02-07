'use client';

/**
 * Spark Reaction Animation Component
 * 
 * Per playground-predicition-animation-flow-spec.md:
 * Visual responses that represent Spark decisions, not execution speed.
 * 
 * Supported reactions:
 * - Shuffle Triggered: DAG edge turns orange, data blocks split and cross
 * - Broadcast Chosen: Small table pulses purple, large table remains static
 * - Skew Detected: One partition bar grows red, others complete early
 * - No Shuffle: Clean blue flow
 * 
 * Non-negotiables:
 * - No fake timing or progress bars
 * - CSS/SVG animations only
 * - Reduced motion support
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLearningMode } from '@/lib/LearningModeContext';

export type SparkReactionType = 
  | 'no_shuffle'
  | 'shuffle'
  | 'broadcast'
  | 'skew'
  | 'spill'
  | 'idle';

export interface SparkReactionAnimationProps {
  /** Type of reaction to show */
  reactionType: SparkReactionType;
  /** Whether animation is currently playing */
  isPlaying: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Optional class name */
  className?: string;
}

// Animation durations (per spec: < 300ms per transition)
const ANIMATION_DURATION = 0.25;

export function SparkReactionAnimation({
  reactionType,
  isPlaying,
  onComplete,
  className = '',
}: SparkReactionAnimationProps) {
  const { isLearningMode } = useLearningMode();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion ?? false;
  const [phase, setPhase] = useState<'idle' | 'animating' | 'complete'>('idle');

  // Slower animation in learning mode
  const duration = reducedMotion ? 0.01 : (isLearningMode ? ANIMATION_DURATION * 1.5 : ANIMATION_DURATION);

  useEffect(() => {
    if (isPlaying && reactionType !== 'idle') {
      setPhase('animating');
      
      const timer = setTimeout(() => {
        setPhase('complete');
        onComplete?.();
      }, (isLearningMode ? 2000 : 1200));

      return () => clearTimeout(timer);
    } else {
      setPhase('idle');
    }
  }, [isPlaying, reactionType, onComplete, isLearningMode]);

  const getMotionDuration = (base: number) => reducedMotion ? 0.01 : base;

  return (
    <div 
      data-testid="spark-reaction-animation"
      data-reaction-type={reactionType}
      data-phase={phase}
      className={`relative w-full h-32 rounded-xl bg-slate-900/50 border border-slate-700/50 overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 400 120" className="w-full h-full">
        <defs>
          {/* Gradients for different states */}
          <linearGradient id="blueFlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="orangeShuffle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(27, 96%, 61%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(27, 96%, 61%)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="purpleBroadcast" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(271, 91%, 65%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(271, 91%, 65%)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Base stages - always visible */}
        <motion.g>
          {/* Stage 1 */}
          <rect x="30" y="40" width="80" height="40" rx="6" className="fill-slate-800 stroke-slate-600" strokeWidth="1" />
          <text x="70" y="65" textAnchor="middle" className="fill-slate-400 text-[10px]">Stage 1</text>
          
          {/* Stage 2 */}
          <rect x="160" y="40" width="80" height="40" rx="6" className="fill-slate-800 stroke-slate-600" strokeWidth="1" />
          <text x="200" y="65" textAnchor="middle" className="fill-slate-400 text-[10px]">Stage 2</text>
          
          {/* Stage 3 */}
          <rect x="290" y="40" width="80" height="40" rx="6" className="fill-slate-800 stroke-slate-600" strokeWidth="1" />
          <text x="330" y="65" textAnchor="middle" className="fill-slate-400 text-[10px]">Stage 3</text>
        </motion.g>

        {/* Edge between stages */}
        <AnimatePresence mode="wait">
          {/* No Shuffle - Clean blue flow */}
          {(reactionType === 'no_shuffle' || reactionType === 'idle') && phase !== 'idle' && (
            <motion.g key="no-shuffle">
              <motion.path
                d="M 110 60 L 160 60"
                stroke="url(#blueFlow)"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(duration * 2) }}
              />
              <motion.path
                d="M 240 60 L 290 60"
                stroke="url(#blueFlow)"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(duration * 2), delay: duration }}
              />
              {/* Flow particles */}
              {!reducedMotion && [0, 1, 2].map((i) => (
                <motion.circle
                  key={i}
                  r="3"
                  fill="hsl(217, 91%, 60%)"
                  initial={{ cx: 110, cy: 60 }}
                  animate={{ cx: 290, cy: 60 }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.3,
                    ease: "linear",
                  }}
                />
              ))}
            </motion.g>
          )}

          {/* Shuffle - Orange edges with crossing data */}
          {reactionType === 'shuffle' && phase !== 'idle' && (
            <motion.g key="shuffle" data-testid="shuffle-reaction">
              {/* Stage boundary indicator */}
              <motion.line
                x1="135"
                y1="25"
                x2="135"
                y2="95"
                stroke="hsl(27, 96%, 61%)"
                strokeWidth="2"
                strokeDasharray="4,4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: getMotionDuration(duration) }}
              />
              <motion.text
                x="135"
                y="15"
                textAnchor="middle"
                className="fill-orange-400 text-[8px] font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                SHUFFLE
              </motion.text>

              {/* Shuffling edges - cross pattern */}
              <motion.path
                d="M 110 50 C 130 50, 150 70, 160 70"
                stroke="url(#orangeShuffle)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(duration * 3) }}
              />
              <motion.path
                d="M 110 70 C 130 70, 150 50, 160 50"
                stroke="url(#orangeShuffle)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(duration * 3), delay: 0.1 }}
              />
              
              {/* Data blocks crossing */}
              {!reducedMotion && (
                <>
                  <motion.rect
                    width="8"
                    height="6"
                    rx="1"
                    fill="hsl(27, 96%, 61%)"
                    initial={{ x: 110, y: 47 }}
                    animate={{ x: 155, y: 67 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                  <motion.rect
                    width="8"
                    height="6"
                    rx="1"
                    fill="hsl(27, 96%, 61%)"
                    initial={{ x: 110, y: 67 }}
                    animate={{ x: 155, y: 47 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </>
              )}

              {/* Normal flow after shuffle */}
              <motion.path
                d="M 240 60 L 290 60"
                stroke="url(#blueFlow)"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(duration * 2), delay: duration * 2 }}
              />
            </motion.g>
          )}

          {/* Broadcast - Purple pulse on small table */}
          {reactionType === 'broadcast' && phase !== 'idle' && (
            <motion.g key="broadcast" data-testid="broadcast-reaction">
              {/* Small table indicator (broadcasts) */}
              <motion.rect
                x="30"
                y="40"
                width="80"
                height="40"
                rx="6"
                fill="none"
                stroke="hsl(271, 91%, 65%)"
                strokeWidth="3"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5, 1] }}
                transition={{ duration: 1, times: [0, 0.3, 0.6, 1] }}
              />
              <motion.text
                x="70"
                y="100"
                textAnchor="middle"
                className="fill-purple-400 text-[8px] font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                BROADCAST
              </motion.text>

              {/* Broadcast arrows spreading out */}
              {!reducedMotion && [45, 55, 65, 75].map((y, i) => (
                <motion.path
                  key={i}
                  d={`M 110 60 L 160 ${y}`}
                  stroke="url(#purpleBroadcast)"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: getMotionDuration(0.5), delay: i * 0.1 }}
                />
              ))}

              {/* Normal flow continues */}
              <motion.path
                d="M 240 60 L 290 60"
                stroke="url(#blueFlow)"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(duration * 2), delay: 0.6 }}
              />
            </motion.g>
          )}

          {/* Skew - Uneven partition bars */}
          {reactionType === 'skew' && phase !== 'idle' && (
            <motion.g key="skew" data-testid="skew-reaction">
              {/* Partition bars in stage 2 showing skew */}
              <motion.g>
                {/* Normal partitions (complete early) */}
                {[45, 52, 59, 66].map((y, i) => (
                  <motion.rect
                    key={`normal-${i}`}
                    x="165"
                    y={y}
                    width="0"
                    height="5"
                    rx="1"
                    className="fill-blue-500"
                    animate={{ width: 70 }}
                    transition={{ 
                      duration: getMotionDuration(0.4), 
                      delay: i * 0.1 
                    }}
                  />
                ))}
                
                {/* Skewed partition (slow) */}
                <motion.rect
                  x="165"
                  y="73"
                  width="0"
                  height="5"
                  rx="1"
                  className="fill-red-500"
                  animate={{ width: [0, 20, 35, 50, 70] }}
                  transition={{ 
                    duration: getMotionDuration(1.5), 
                    times: [0, 0.3, 0.5, 0.8, 1]
                  }}
                />
                
                {/* Skew warning */}
                <motion.text
                  x="200"
                  y="100"
                  textAnchor="middle"
                  className="fill-red-400 text-[8px] font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  SKEWED PARTITION
                </motion.text>
              </motion.g>

              {/* Edges */}
              <motion.path
                d="M 110 60 L 160 60"
                stroke="url(#orangeShuffle)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: getMotionDuration(0.3) }}
              />
            </motion.g>
          )}

          {/* Spill - Data overflowing to disk */}
          {reactionType === 'spill' && phase !== 'idle' && (
            <motion.g key="spill" data-testid="spill-reaction">
              {/* Memory pressure indicator */}
              <motion.rect
                x="165"
                y="45"
                width="70"
                height="30"
                rx="4"
                className="fill-yellow-500/20 stroke-yellow-500/50"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              
              {/* Spilling data blocks */}
              {!reducedMotion && [0, 1, 2].map((i) => (
                <motion.rect
                  key={i}
                  x={175 + i * 15}
                  y={50}
                  width="10"
                  height="8"
                  rx="2"
                  className="fill-red-500"
                  animate={{ 
                    y: [50, 90],
                    opacity: [1, 0.7]
                  }}
                  transition={{ 
                    duration: 0.6, 
                    delay: 0.3 + i * 0.15,
                    ease: "easeIn"
                  }}
                />
              ))}
              
              {/* Disk icon area */}
              <motion.rect
                x="165"
                y="95"
                width="70"
                height="15"
                rx="3"
                className="fill-slate-700 stroke-red-500/50"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
              <motion.text
                x="200"
                y="106"
                textAnchor="middle"
                className="fill-red-400 text-[7px] font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                SPILL TO DISK
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Learning mode: Highlight active region */}
        {isLearningMode && phase === 'animating' && (
          <motion.rect
            x="155"
            y="35"
            width="90"
            height="55"
            rx="8"
            fill="none"
            stroke="hsl(271, 91%, 65%)"
            strokeWidth="2"
            strokeDasharray="4,4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </svg>

      {/* Phase label */}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 uppercase tracking-wider">
        {phase === 'animating' && 'Spark is deciding...'}
        {phase === 'complete' && 'Decision complete'}
      </div>
    </div>
  );
}

export default SparkReactionAnimation;
