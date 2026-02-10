/**
 * Data Flow Animation Component
 * 
 * Visualizes data flowing through Spark execution DAG using particle animations.
 * Implements Bret Victor pattern of making the invisible visible.
 * 
 * Particle Semantics:
 * - Narrow transformations: Particles stay in lanes (partition-local processing)
 * - Wide transformations: Particles scatter and gather at shuffle boundaries
 * - Particle speed: Slow = expensive operations
 * - Particle count: Represents data volume
 * 
 * Educational modes:
 * - "Slow" mode: Educational, clear visualization of Spark's data movement
 * - "Fast" mode: Quick overview for experienced users
 */

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Operation } from './OperationsBuilder';
import type { DataShape } from './DataShapePanel';

export interface Particle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lane: number; // For narrow operations (0-9 representing partition lanes)
  color: string;
  speed: number; // Pixels per frame
  size: number;
  operationType: 'narrow' | 'wide' | 'broadcast';
}

export interface AnimationSpeed {
  mode: 'slow' | 'fast';
  multiplier: number;
}

interface DataFlowAnimationProps {
  operations: Operation[];
  shape: DataShape;
  isActive: boolean;
  speed?: 'slow' | 'fast';
  onSpeedChange?: (speed: 'slow' | 'fast') => void;
  className?: string;
}

// Visual grammar colors
const COLORS = {
  flow: '#3b82f6',       // Blue - normal flow
  shuffle: '#f97316',    // Orange - shuffle
  pressure: '#ef4444',   // Red - skew/pressure
  broadcast: '#a855f7',  // Purple - broadcast
};

// Shuffle operations
const SHUFFLE_OPS = ['groupby', 'join', 'repartition', 'orderby', 'distinct', 'window'];

// Calculate particle count based on data volume
function calculateParticleCount(totalSizeBytes: number, operationCount: number): number {
  // Base particles on data size (1 particle per 100MB) + operations
  const sizeParticles = Math.max(5, Math.min(30, Math.floor(totalSizeBytes / (100 * 1024 * 1024))));
  const opParticles = Math.min(10, operationCount * 2);
  return sizeParticles + opParticles;
}

// Determine if operation is a broadcast join
function isBroadcastJoin(op: Operation): boolean {
  if (op.type !== 'join') return false;
  const rightSize = ((op.params.right_rows as number) || 100000) * 100;
  const threshold = (op.params.broadcast_threshold as number) || 10 * 1024 * 1024;
  return rightSize <= threshold;
}

// Generate initial particles
function generateParticles(
  count: number,
  operations: Operation[],
  containerWidth: number,
  containerHeight: number
): Particle[] {
  const particles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    // Assign to a lane (0-9)
    const lane = i % 10;
    const laneWidth = containerWidth / 10;
    
    // Start position at top
    const x = lane * laneWidth + laneWidth / 2;
    const y = 0;
    
    particles.push({
      id: `particle-${i}`,
      x,
      y,
      targetX: x,
      targetY: containerHeight,
      lane,
      color: COLORS.flow,
      speed: 2, // Base speed
      size: 4,
      operationType: 'narrow',
    });
  }
  
  return particles;
}

// Update particle positions and behavior based on operations
function updateParticles(
  particles: Particle[],
  operations: Operation[],
  containerWidth: number,
  containerHeight: number,
  speedMultiplier: number
): Particle[] {
  return particles.map(particle => {
    let newX = particle.x;
    let newY = particle.y;
    let newTargetX = particle.targetX;
    let newTargetY = particle.targetY;
    let newColor = particle.color;
    let newSpeed = particle.speed * speedMultiplier;
    let newOperationType = particle.operationType;
    
    // Determine current operation based on Y position
    const operationHeight = containerHeight / Math.max(1, operations.length + 1);
    const currentOpIndex = Math.floor(particle.y / operationHeight) - 1;
    
    if (currentOpIndex >= 0 && currentOpIndex < operations.length) {
      const op = operations[currentOpIndex];
      const isWide = SHUFFLE_OPS.includes(op.type);
      const isBroadcast = isBroadcastJoin(op);
      
      if (isWide && !isBroadcast) {
        // Shuffle: particles scatter and gather
        newOperationType = 'wide';
        newColor = COLORS.shuffle;
        newSpeed *= 0.5; // Shuffles are expensive (slower)
        
        // Scatter to random X position
        newTargetX = Math.random() * containerWidth;
      } else if (isBroadcast) {
        // Broadcast: particles converge
        newOperationType = 'broadcast';
        newColor = COLORS.broadcast;
        newSpeed *= 1.5; // Broadcast is fast
        
        // Converge to center
        newTargetX = containerWidth / 2;
      } else {
        // Narrow: stay in lane
        newOperationType = 'narrow';
        newColor = COLORS.flow;
        const laneWidth = containerWidth / 10;
        newTargetX = particle.lane * laneWidth + laneWidth / 2;
      }
    }
    
    // Move towards target
    const dx = newTargetX - newX;
    const dy = newTargetY - newY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const stepX = (dx / distance) * newSpeed;
      const stepY = (dy / distance) * newSpeed;
      newX += stepX;
      newY += stepY;
    }
    
    // Reset particle when it reaches bottom
    if (newY >= containerHeight) {
      newY = 0;
      const laneWidth = containerWidth / 10;
      newX = particle.lane * laneWidth + laneWidth / 2;
      newTargetX = newX;
    }
    
    return {
      ...particle,
      x: newX,
      y: newY,
      targetX: newTargetX,
      targetY: newTargetY,
      color: newColor,
      speed: newSpeed,
      operationType: newOperationType,
    };
  });
}

export function DataFlowAnimation({
  operations,
  shape,
  isActive,
  speed = 'slow',
  onSpeedChange,
  className = '',
}: DataFlowAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [containerDimensions, setContainerDimensions] = useState({ width: 400, height: 600 });
  const prefersReducedMotion = useReducedMotion();
  
  // Speed multiplier based on mode
  const speedMultiplier = speed === 'fast' ? 3 : 1;
  
  // Initialize particles
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setContainerDimensions({ width: rect.width, height: rect.height });
    
    const particleCount = calculateParticleCount(shape.totalSizeBytes, operations.length);
    const initialParticles = generateParticles(particleCount, operations, rect.width, rect.height);
    setParticles(initialParticles);
  }, [isActive, operations.length, shape.totalSizeBytes]);
  
  // Animation loop
  useEffect(() => {
    if (!isActive || prefersReducedMotion || particles.length === 0) return;
    
    const animate = () => {
      setParticles(prevParticles => 
        updateParticles(
          prevParticles,
          operations,
          containerDimensions.width,
          containerDimensions.height,
          speedMultiplier
        )
      );
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, operations, containerDimensions, speedMultiplier, prefersReducedMotion, particles.length]);
  
  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);
  
  if (!isActive) return null;
  
  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      data-testid="data-flow-animation"
      title="Particles represent data flowing through Spark operations"
    >
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ mixBlendMode: 'screen' }}
      >
        <AnimatePresence>
          {particles.map(particle => (
            <motion.circle
              key={particle.id}
              cx={particle.x}
              cy={particle.y}
              r={particle.size}
              fill={particle.color}
              opacity={0.6}
              data-testid={particle.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </AnimatePresence>
      </svg>
      
      {/* Educational tooltip */}
      <div 
        className="absolute top-2 right-2 text-xs bg-slate-900/80 text-slate-300 px-2 py-1 rounded-md border border-slate-700/50 pointer-events-none"
        data-testid="animation-tooltip"
        role="tooltip"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.flow }} />
          <span>Normal flow</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.shuffle }} />
          <span>Shuffle (expensive)</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.broadcast }} />
          <span>Broadcast (fast)</span>
        </div>
      </div>
    </div>
  );
}

export default DataFlowAnimation;
