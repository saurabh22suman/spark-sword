/**
 * Draggable Partition Bars Component
 * 
 * Interactive partition visualization with draggable bars
 * for visual exploration of skew and partition size impacts.
 * 
 * Features:
 * - Drag individual bars to adjust relative sizes
 * - Real-time skew calculation
 * - Color-coded warnings
 * - Double-click to reset
 * - Hover tooltips with size info
 */

'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface DraggablePartitionBarsProps {
  partitions: number;
  skewFactor: number;
  avgPartitionSizeBytes: number;
  onSkewChange?: (newSkew: number) => void;
  className?: string;
}

// 2GB typical task memory threshold
const SPILL_THRESHOLD_BYTES = 2 * 1024 * 1024 * 1024;
const MIN_BAR_HEIGHT_PX = 8;
const MAX_BAR_HEIGHT_PX = 120;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Deterministic pseudo-random
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function DraggablePartitionBars({
  partitions,
  skewFactor,
  avgPartitionSizeBytes,
  onSkewChange,
  className = '',
}: DraggablePartitionBarsProps) {
  const barCount = Math.min(20, Math.max(5, Math.min(partitions, 20)));
  
  // Initialize bar sizes based on skew
  const initializeBars = () => {
    return Array.from({ length: barCount }, (_, i) => {
      const skewedIndex = barCount - 3;
      if (i >= skewedIndex && skewFactor > 1) {
        const skewAmount = 1 + (skewFactor - 1) * ((i - skewedIndex + 1) / 3);
        return avgPartitionSizeBytes * skewAmount;
      }
      const variance = 0.8 + seededRandom(i + partitions * 7 + barCount * 13) * 0.4;
      return avgPartitionSizeBytes * variance;
    });
  };

  const [barSizes, setBarSizes] = useState<number[]>(initializeBars);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [draggingBar, setDraggingBar] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartSize = useRef<number>(0);

  // Update bars when props change
  useState(() => {
    setBarSizes(initializeBars());
  });

  const maxSize = Math.max(...barSizes);
  const avgSize = barSizes.reduce((a, b) => a + b, 0) / barSizes.length;
  const calculatedSkew = maxSize / avgSize;
  
  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingBar(index);
    dragStartY.current = e.clientY;
    dragStartSize.current = barSizes[index];
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingBar === null || !containerRef.current) return;
    
    const deltaY = dragStartY.current - e.clientY; // Invert: up increases size
    const containerHeight = containerRef.current.clientHeight;
    const deltaRatio = deltaY / containerHeight;
    
    // Calculate new size
    const currentAvg = barSizes.reduce((a, b) => a + b, 0) / barSizes.length;
    const sizeChange = currentAvg * deltaRatio * 2; // Sensitivity factor
    const newSize = Math.max(
      avgPartitionSizeBytes * 0.1, // Min 10% of average
      Math.min(
        avgPartitionSizeBytes * 10, // Max 10x average
        dragStartSize.current + sizeChange
      )
    );
    
    // Update bar size
    const newBarSizes = [...barSizes];
    newBarSizes[draggingBar] = newSize;
    setBarSizes(newBarSizes);
    
    // Calculate and report new skew
    const newMax = Math.max(...newBarSizes);
    const newAvg = newBarSizes.reduce((a, b) => a + b, 0) / newBarSizes.length;
    const newSkew = newMax / newAvg;
    onSkewChange?.(newSkew);
  };

  const handleMouseUp = () => {
    setDraggingBar(null);
  };

  // Attach global mouse listeners when dragging
  useState(() => {
    if (draggingBar !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  const handleDoubleClick = (index: number) => {
    // Reset bar to average
    const newBarSizes = [...barSizes];
    newBarSizes[index] = avgSize;
    setBarSizes(newBarSizes);
    
    // Recalculate skew
    const newMax = Math.max(...newBarSizes);
    const newAvg = newBarSizes.reduce((a, b) => a + b, 0) / newBarSizes.length;
    const newSkew = newMax / newAvg;
    onSkewChange?.(newSkew);
  };

  const spillRisk = maxSize > SPILL_THRESHOLD_BYTES;
  const highRisk = maxSize > SPILL_THRESHOLD_BYTES * 2;

  return (
    <div className={`space-y-2 ${className}`} data-testid="partition-bars">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Partition Distribution</span>
        <span className={`font-medium ${
          highRisk ? 'text-red-400' : spillRisk ? 'text-yellow-400' : 'text-slate-400'
        }`}>
          {calculatedSkew > 1.1 ? `${calculatedSkew.toFixed(1)}x skew` : 'Even'}
        </span>
      </div>
      
      {/* Partition bars */}
      <div 
        ref={containerRef}
        className="flex items-end gap-0.5 h-32 bg-slate-900/50 rounded p-2 relative"
      >
        {barSizes.map((size, i) => {
          const heightPx = maxSize > 0 
            ? Math.max(MIN_BAR_HEIGHT_PX, (size / maxSize) * MAX_BAR_HEIGHT_PX)
            : MIN_BAR_HEIGHT_PX;
          const isHot = size > avgSize * 1.5;
          const isSpillRisk = size > SPILL_THRESHOLD_BYTES;
          
          let barColor = 'bg-blue-500 hover:bg-blue-400';
          if (isSpillRisk) {
            barColor = 'bg-red-500 hover:bg-red-400';
          } else if (isHot) {
            barColor = 'bg-yellow-500 hover:bg-yellow-400';
          }
          
          return (
            <motion.div
              key={i}
              className={`flex-1 rounded-t transition-colors cursor-ns-resize relative ${barColor} ${
                draggingBar === i ? 'opacity-80' : ''
              }`}
              style={{ height: `${heightPx}px` }}
              onMouseDown={(e) => handleMouseDown(i, e)}
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
              onDoubleClick={() => handleDoubleClick(i)}
              data-testid={`partition-bar-${i}`}
              whileHover={{ scale: 1.05 }}
            >
              {/* Tooltip on hover */}
              {hoveredBar === i && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10 pointer-events-none"
                  role="tooltip"
                >
                  {formatBytes(size)}
                  <div className="text-xs opacity-75">Double-click to reset</div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded" />
          <span>Hot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded" />
          <span>Spill Risk</span>
        </div>
        <div className="text-slate-600">← Drag bars to adjust →</div>
      </div>
      
      {/* Warning if applicable */}
      {spillRisk && (
        <div className={`text-xs p-2 rounded ${
          highRisk 
            ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
        }`}>
          ⚠️ Max partition (~{formatBytes(maxSize)}) may cause disk spill
        </div>
      )}
    </div>
  );
}

export default DraggablePartitionBars;
