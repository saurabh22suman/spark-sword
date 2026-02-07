'use client';

/**
 * Shuffle Cost Simulator
 * 
 * Increase data size and watch network I/O and shuffle time grow
 * Teaching: The real cost of shuffles at scale
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Wifi, Clock, HardDrive, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function ShuffleCostSimulator({ className }: { className?: string }) {
  const [dataSize, setDataSize] = useState(100); // MB
  const [numExecutors, setNumExecutors] = useState(10);
  const [networkSpeed, setNetworkSpeed] = useState(1000); // Mbps
  const [compressionRatio, setCompressionRatio] = useState(0.5); // 50% compression

  // Calculate shuffle metrics
  const metrics = useMemo(() => {
    const dataSizeBytes = dataSize * 1024 * 1024;
    
    // In a shuffle, each executor sends data to all others (worst case)
    // Simplified: each executor handles data/numExecutors, sends to all others
    const dataPerExecutor = dataSizeBytes / numExecutors;
    
    // Each executor sends to (numExecutors - 1) other executors
    // Total network traffic = data * (numExecutors - 1) / numExecutors * numExecutors
    // Simplified: approximately equal to total data for large executor counts
    const totalNetworkTraffic = dataSizeBytes * ((numExecutors - 1) / numExecutors);
    
    // Compressed size
    const compressedTraffic = totalNetworkTraffic * compressionRatio;
    
    // Network transfer time (in seconds)
    // networkSpeed is in Mbps, convert to bytes/second
    const networkBytesPerSecond = (networkSpeed * 1024 * 1024) / 8;
    // Each executor receives from all others concurrently, so bottleneck is single executor
    const transferTime = compressedTraffic / numExecutors / networkBytesPerSecond;
    
    // Serialization overhead (estimate: 10% of data transfer time)
    const serializationTime = transferTime * 0.1;
    
    // Sort time (estimate based on data size, O(n log n))
    const sortFactor = Math.log2(dataPerExecutor / 1024 / 1024 + 1);
    const sortTime = (dataPerExecutor / 1024 / 1024) * 0.01 * sortFactor;
    
    // Disk spill (if shuffle data exceeds memory - simplified estimate)
    const shuffleMemory = 200 * 1024 * 1024; // 200 MB shuffle memory per executor
    const spillAmount = Math.max(0, dataPerExecutor - shuffleMemory);
    const diskSpeed = 200 * 1024 * 1024; // 200 MB/s disk
    const diskTime = (spillAmount / diskSpeed) * 2; // Write and read
    
    // Total shuffle time
    const totalTime = transferTime + serializationTime + sortTime + diskTime;
    
    return {
      totalNetworkTraffic,
      compressedTraffic,
      transferTime,
      serializationTime,
      sortTime,
      diskTime,
      spillAmount,
      totalTime,
      dataPerExecutor
    };
  }, [dataSize, numExecutors, networkSpeed, compressionRatio]);

  const reset = () => {
    setDataSize(100);
    setNumExecutors(10);
    setNetworkSpeed(1000);
    setCompressionRatio(0.5);
  };

  // Determine severity
  const severity = metrics.totalTime > 60 ? 'critical' : metrics.totalTime > 10 ? 'warning' : 'good';

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Shuffle Cost Simulator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              See how shuffle cost scales with data and cluster size
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
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data to Shuffle: <span className="text-blue-600 font-bold">{formatBytes(dataSize * 1024 * 1024)}</span>
            </label>
            <input
              type="range"
              min="10"
              max="10000"
              step="10"
              value={dataSize}
              onChange={(e) => setDataSize(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>10 MB</span>
              <span>10 GB</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Executors: <span className="text-purple-600 font-bold">{numExecutors}</span>
            </label>
            <input
              type="range"
              min="2"
              max="100"
              step="1"
              value={numExecutors}
              onChange={(e) => setNumExecutors(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>2</span>
              <span>100</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Network Speed: <span className="text-green-600 font-bold">{networkSpeed} Mbps</span>
            </label>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={networkSpeed}
              onChange={(e) => setNetworkSpeed(Number(e.target.value))}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>100 Mbps</span>
              <span>10 Gbps</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Compression: <span className="text-amber-600 font-bold">{Math.round((1 - compressionRatio) * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.1"
              value={compressionRatio}
              onChange={(e) => setCompressionRatio(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>80% (best)</span>
              <span>0% (none)</span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown Visualization */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Shuffle Time Breakdown
          </h4>
          
          <div className="relative h-12 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex">
            {[
              { label: 'Network', value: metrics.transferTime, color: 'bg-blue-500' },
              { label: 'Serialize', value: metrics.serializationTime, color: 'bg-purple-500' },
              { label: 'Sort', value: metrics.sortTime, color: 'bg-green-500' },
              { label: 'Disk', value: metrics.diskTime, color: 'bg-orange-500' },
            ].map((segment, idx) => {
              const percent = (segment.value / metrics.totalTime) * 100;
              if (percent < 1) return null;
              
              return (
                <motion.div
                  key={segment.label}
                  className={cn("h-full flex items-center justify-center group relative", segment.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  {percent > 15 && (
                    <span className="text-xs font-bold text-white truncate px-1">
                      {segment.label}
                    </span>
                  )}
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {segment.label}: {formatDuration(segment.value)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-slate-500">Network ({formatDuration(metrics.transferTime)})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-slate-500">Serialize ({formatDuration(metrics.serializationTime)})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-slate-500">Sort ({formatDuration(metrics.sortTime)})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-slate-500">Disk Spill ({formatDuration(metrics.diskTime)})</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <Clock className={cn(
              "w-6 h-6 mx-auto mb-2",
              severity === 'critical' ? 'text-red-500' : severity === 'warning' ? 'text-amber-500' : 'text-green-500'
            )} />
            <div className={cn(
              "text-2xl font-bold",
              severity === 'critical' ? 'text-red-500' : severity === 'warning' ? 'text-amber-500' : 'text-green-500'
            )}>
              {formatDuration(metrics.totalTime)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total Shuffle Time</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <Wifi className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatBytes(metrics.compressedTraffic)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Network Traffic</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <HardDrive className={cn(
              "w-6 h-6 mx-auto mb-2",
              metrics.spillAmount > 0 ? 'text-orange-500' : 'text-slate-400'
            )} />
            <div className={cn(
              "text-2xl font-bold",
              metrics.spillAmount > 0 ? 'text-orange-500' : 'text-slate-900 dark:text-white'
            )}>
              {metrics.spillAmount > 0 ? formatBytes(metrics.spillAmount) : 'None'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Disk Spill</div>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatBytes(metrics.dataPerExecutor)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Per Executor</div>
          </div>
        </div>

        {/* Severity Alert */}
        {severity !== 'good' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-xl border",
              severity === 'critical'
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn(
                "w-5 h-5 shrink-0",
                severity === 'critical' ? 'text-red-500' : 'text-amber-500'
              )} />
              <div>
                <h5 className={cn(
                  "font-bold text-sm",
                  severity === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                )}>
                  {severity === 'critical' ? 'Critical Shuffle Overhead!' : 'High Shuffle Cost'}
                </h5>
                <p className={cn(
                  "text-sm",
                  severity === 'critical' ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'
                )}>
                  {severity === 'critical' 
                    ? 'This shuffle will take over a minute. Consider reducing data before shuffle, using broadcast joins, or bucketing.'
                    : 'Shuffle is significant. Look for opportunities to filter data early or avoid the shuffle entirely.'
                  }
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Key Insight */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <h4 className="font-bold text-blue-800 dark:text-blue-400 text-sm mb-1">
          💡 Shuffle Optimization Tips
        </h4>
        <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
          <li>• <strong>Filter early:</strong> Reduce data before shuffle-inducing operations</li>
          <li>• <strong>spark.sql.shuffle.partitions:</strong> Tune to match data size (default 200 may be too many/few)</li>
          <li>• <strong>Broadcast joins:</strong> Avoid shuffle entirely for small dimension tables</li>
        </ul>
      </div>
    </div>
  );
}
