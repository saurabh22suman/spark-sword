'use client';

/**
 * Partition Playground
 * 
 * Bars represent partitions. Increase data size and watch partitions overflow.
 * Teaching: Partition fundamentals and imbalance
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function PartitionPlayground({ className }: { className?: string }) {
  const [dataSize, setDataSize] = useState(100); // MB
  const [partitionCount, setPartitionCount] = useState(8);
  const [skewFactor, setSkewFactor] = useState(1); // 1 = uniform, 10 = highly skewed

  // Calculate partition sizes
  const partitions = useMemo(() => {
    const totalBytes = dataSize * 1024 * 1024;
    const result: number[] = [];
    
    if (skewFactor === 1) {
      // Uniform distribution
      const sizePerPartition = totalBytes / partitionCount;
      for (let i = 0; i < partitionCount; i++) {
        result.push(sizePerPartition);
      }
    } else {
      // Skewed distribution - first partition gets disproportionate share
      const skewMultiplier = skewFactor;
      const normalShare = totalBytes / (partitionCount + skewMultiplier - 1);
      
      for (let i = 0; i < partitionCount; i++) {
        if (i === 0) {
          result.push(normalShare * skewMultiplier);
        } else {
          result.push(normalShare);
        }
      }
    }
    
    return result;
  }, [dataSize, partitionCount, skewFactor]);

  const maxPartitionSize = Math.max(...partitions);
  const idealPartitionSize = 128 * 1024 * 1024; // 128 MB ideal
  const isOverloaded = maxPartitionSize > idealPartitionSize;
  const isUnderloaded = maxPartitionSize < 10 * 1024 * 1024; // < 10 MB
  const isSkewed = skewFactor > 2;

  const reset = () => {
    setDataSize(100);
    setPartitionCount(8);
    setSkewFactor(1);
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Partition Playground
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Adjust data size and partitions to see how data distributes
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
          {/* Data Size */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Total Data Size: <span className="text-blue-600 dark:text-blue-400">{dataSize} MB</span>
            </label>
            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={dataSize}
              onChange={(e) => setDataSize(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>10 MB</span>
              <span>2 GB</span>
            </div>
          </div>

          {/* Partition Count */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Partitions: <span className="text-green-600 dark:text-green-400">{partitionCount}</span>
            </label>
            <input
              type="range"
              min="1"
              max="32"
              step="1"
              value={partitionCount}
              onChange={(e) => setPartitionCount(Number(e.target.value))}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1</span>
              <span>32</span>
            </div>
          </div>

          {/* Skew Factor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Skew Factor: <span className="text-orange-600 dark:text-orange-400">{skewFactor}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={skewFactor}
              onChange={(e) => setSkewFactor(Number(e.target.value))}
              className="w-full accent-orange-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Uniform</span>
              <span>10x Skewed</span>
            </div>
          </div>
        </div>

        {/* Partition Visualization */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Partition Distribution
          </h4>
          <div className="relative h-48 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            {/* Ideal line - positioned at percentage based on max scale */}
            {(() => {
              // Calculate scale: use 128MB or maxPartitionSize, whichever is larger
              const scaleMax = Math.max(idealPartitionSize, maxPartitionSize * 1.1);
              const idealLinePercent = (idealPartitionSize / scaleMax) * 100;
              return (
                <div 
                  className="absolute left-4 right-4 border-t-2 border-dashed border-green-500/50 z-10"
                  style={{ bottom: `${idealLinePercent}%` }}
                >
                  <span className="absolute right-0 -top-5 text-xs text-green-600 dark:text-green-400">
                    Ideal: 128 MB
                  </span>
                </div>
              );
            })()}
            
            {/* Partition bars */}
            <div className="flex items-end gap-2 h-full">
              {partitions.map((size, idx) => {
                // Scale based on the larger of idealPartitionSize or maxPartitionSize
                const scaleMax = Math.max(idealPartitionSize, maxPartitionSize * 1.1);
                const heightPercent = (size / scaleMax) * 100;
                const isHot = size > idealPartitionSize;
                const isCold = size < 10 * 1024 * 1024;
                
                return (
                  <motion.div
                    key={idx}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className={cn(
                      "flex-1 rounded-t-lg relative group cursor-pointer transition-colors",
                      isHot 
                        ? "bg-red-500" 
                        : isCold 
                          ? "bg-yellow-400"
                          : "bg-blue-500"
                    )}
                  >
                    {/* Overflow indicator */}
                    {size > idealPartitionSize && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                      </div>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        P{idx}: {formatBytes(size)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatBytes(maxPartitionSize)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Max Partition</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatBytes(dataSize * 1024 * 1024 / partitionCount)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Avg Partition</div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div className={cn(
              "text-2xl font-bold",
              isSkewed ? "text-orange-500" : "text-green-500"
            )}>
              {isSkewed ? `${skewFactor}x` : 'Balanced'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Distribution</div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-3">
          {isOverloaded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-red-700 dark:text-red-400 text-sm">Partitions Overloaded!</h5>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                  Max partition ({formatBytes(maxPartitionSize)}) exceeds 128 MB ideal. 
                  Increase partition count or expect memory pressure.
                </p>
              </div>
            </motion.div>
          )}

          {isUnderloaded && !isOverloaded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-yellow-700 dark:text-yellow-400 text-sm">Too Many Partitions</h5>
                <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-1">
                  Partitions are too small (&lt; 10 MB each). This creates scheduling overhead.
                  Consider using coalesce() to reduce partition count.
                </p>
              </div>
            </motion.div>
          )}

          {isSkewed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-orange-700 dark:text-orange-400 text-sm">Data Skew Detected</h5>
                <p className="text-orange-600 dark:text-orange-300 text-sm mt-1">
                  One partition has {skewFactor}x more data than others. 
                  This creates stragglers—one slow task delays the entire stage.
                </p>
              </div>
            </motion.div>
          )}

          {!isOverloaded && !isUnderloaded && !isSkewed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
            >
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-green-700 dark:text-green-400 text-sm">Good Distribution!</h5>
                <p className="text-green-600 dark:text-green-300 text-sm mt-1">
                  Partitions are well-sized and balanced. Expect efficient parallel execution.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-400">Normal (10-128 MB)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-slate-600 dark:text-slate-400">Overloaded (&gt;128 MB)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span className="text-slate-600 dark:text-slate-400">Too Small (&lt;10 MB)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
