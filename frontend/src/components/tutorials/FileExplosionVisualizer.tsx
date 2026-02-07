'use client';

/**
 * File Explosion Visualizer
 * 
 * Write data and watch thousands of files appear.
 * Teaching: The small files anti-pattern and how to avoid it.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, FileText, FolderOpen, AlertTriangle, Play, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

function FileIcon({ size, delay }: { size: 'tiny' | 'small' | 'medium' | 'large'; delay: number }) {
  const sizeClasses = {
    tiny: 'w-2 h-3',
    small: 'w-3 h-4',
    medium: 'w-4 h-5',
    large: 'w-5 h-6'
  };

  const colors = {
    tiny: 'text-red-400',
    small: 'text-orange-400',
    medium: 'text-yellow-400',
    large: 'text-green-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
    >
      <FileText className={cn(sizeClasses[size], colors[size])} />
    </motion.div>
  );
}

export function FileExplosionVisualizer({ className }: { className?: string }) {
  const [partitions, setPartitions] = useState(200);
  const [partitionBy, setPartitionBy] = useState<string[]>([]);
  const [coalesce, setCoalesce] = useState(false);
  const [coalesceTarget, setCoalesceTarget] = useState(10);
  const [isWriting, setIsWriting] = useState(false);
  const [writeComplete, setWriteComplete] = useState(false);

  const partitionByOptions = ['date', 'country', 'category'];
  
  // Calculate file counts
  const fileMetrics = useMemo(() => {
    const baseFiles = coalesce ? coalesceTarget : partitions;
    let multiplier = 1;
    
    // Each partition-by column multiplies files
    if (partitionBy.includes('date')) multiplier *= 365; // days in a year
    if (partitionBy.includes('country')) multiplier *= 50; // example countries
    if (partitionBy.includes('category')) multiplier *= 20; // example categories

    const totalFiles = baseFiles * multiplier;
    const avgFileSize = 1000 / totalFiles; // Assume 1GB total data

    const severity = 
      totalFiles > 10000 ? 'critical' :
      totalFiles > 1000 ? 'warning' :
      totalFiles > 100 ? 'moderate' : 'good';

    return {
      baseFiles,
      multiplier,
      totalFiles,
      avgFileSize,
      severity,
      partitionDirs: partitionBy.length > 0 ? multiplier : 1
    };
  }, [partitions, partitionBy, coalesce, coalesceTarget]);

  const handleWrite = () => {
    setIsWriting(true);
    setWriteComplete(false);
    
    setTimeout(() => {
      setIsWriting(false);
      setWriteComplete(true);
    }, 1500);
  };

  const reset = () => {
    setPartitions(200);
    setPartitionBy([]);
    setCoalesce(false);
    setCoalesceTarget(10);
    setWriteComplete(false);
  };

  const togglePartitionBy = (col: string) => {
    setPartitionBy(prev => 
      prev.includes(col) 
        ? prev.filter(c => c !== col)
        : [...prev, col]
    );
    setWriteComplete(false);
  };

  // Generate visual file grid
  const visibleFiles = Math.min(fileMetrics.totalFiles, 200);
  const fileSize = fileMetrics.avgFileSize < 0.1 ? 'tiny' : 
                   fileMetrics.avgFileSize < 1 ? 'small' :
                   fileMetrics.avgFileSize < 10 ? 'medium' : 'large';

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              File Explosion Visualizer
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              See how write configurations affect output file count
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleWrite}
              disabled={isWriting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4" />
              Write Data
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Input Partitions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Input Partitions: <span className="text-blue-600 font-bold">{partitions}</span>
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={partitions}
              onChange={(e) => {
                setPartitions(Number(e.target.value));
                setWriteComplete(false);
              }}
              className="w-full accent-blue-600"
            />
            <p className="text-xs text-slate-400 mt-1">
              spark.sql.shuffle.partitions = {partitions}
            </p>
          </div>

          {/* Coalesce */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Coalesce before write?
              </label>
              <button
                onClick={() => {
                  setCoalesce(!coalesce);
                  setWriteComplete(false);
                }}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  coalesce ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <motion.div
                  animate={{ x: coalesce ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>
            {coalesce && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={coalesceTarget}
                  onChange={(e) => {
                    setCoalesceTarget(Number(e.target.value));
                    setWriteComplete(false);
                  }}
                  className="w-full accent-green-600"
                />
                <p className="text-xs text-green-600 mt-1">
                  .coalesce({coalesceTarget})
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Partition By Columns */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            .partitionBy() columns:
          </label>
          <div className="flex flex-wrap gap-2">
            {partitionByOptions.map((col) => (
              <button
                key={col}
                onClick={() => togglePartitionBy(col)}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all",
                  partitionBy.includes(col)
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                )}
              >
                {col}
              </button>
            ))}
          </div>
          {partitionBy.length > 0 && (
            <p className="text-xs text-purple-600 mt-2">
              .partitionBy({partitionBy.map(c => `"${c}"`).join(', ')})
            </p>
          )}
        </div>

        {/* File Visualization */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Output Directory
            </span>
            {fileMetrics.partitionDirs > 1 && (
              <span className="text-xs text-slate-500">
                ({fileMetrics.partitionDirs.toLocaleString()} subdirectories)
              </span>
            )}
          </div>

          <AnimatePresence>
            {writeComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-1 min-h-[100px] max-h-[200px] overflow-hidden"
              >
                {Array.from({ length: visibleFiles }).map((_, i) => (
                  <FileIcon key={i} size={fileSize} delay={i * 0.005} />
                ))}
                {fileMetrics.totalFiles > visibleFiles && (
                  <div className="flex items-center text-xs text-slate-400 ml-2">
                    +{(fileMetrics.totalFiles - visibleFiles).toLocaleString()} more...
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!writeComplete && (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
              {isWriting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Zap className="w-6 h-6 text-blue-500" />
                </motion.div>
              ) : (
                'Click "Write Data" to see output files'
              )}
            </div>
          )}
        </div>

        {/* Metrics Summary */}
        <div className={cn(
          "rounded-xl p-6 border-2",
          fileMetrics.severity === 'critical' ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" :
          fileMetrics.severity === 'warning' ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" :
          fileMetrics.severity === 'moderate' ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" :
          "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        )}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={cn(
                "text-3xl font-bold",
                fileMetrics.severity === 'critical' ? "text-red-600" :
                fileMetrics.severity === 'warning' ? "text-orange-600" :
                fileMetrics.severity === 'moderate' ? "text-yellow-600" :
                "text-green-600"
              )}>
                {fileMetrics.totalFiles.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total Files</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                {fileMetrics.avgFileSize.toFixed(1)}MB
              </div>
              <div className="text-xs text-slate-500 mt-1">Avg File Size</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                {fileMetrics.partitionDirs.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Directories</div>
            </div>
          </div>

          {fileMetrics.severity !== 'good' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-start gap-2"
            >
              <AlertTriangle className={cn(
                "w-4 h-4 shrink-0 mt-0.5",
                fileMetrics.severity === 'critical' ? "text-red-600" : "text-orange-600"
              )} />
              <span className={cn(
                "text-sm",
                fileMetrics.severity === 'critical' ? "text-red-700 dark:text-red-400" : "text-orange-700 dark:text-orange-400"
              )}>
                {fileMetrics.severity === 'critical' 
                  ? 'Critical: Too many small files will severely impact downstream read performance!'
                  : fileMetrics.severity === 'warning'
                  ? 'Warning: Many small files may slow down downstream queries.'
                  : 'Consider coalescing to reduce file count.'}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Teaching Insight */}
      <div className="px-6 py-4 bg-cyan-50 dark:bg-cyan-900/20 border-t border-cyan-100 dark:border-cyan-800">
        <p className="text-sm text-cyan-700 dark:text-cyan-300">
          <strong>💡 Key Insight:</strong> Small files create overhead: each file needs metadata, 
          causes many small reads, and fills up the metastore. Aim for files between 128MB-1GB. 
          Use <code className="bg-cyan-100 dark:bg-cyan-800 px-1 rounded">.coalesce()</code> or 
          <code className="bg-cyan-100 dark:bg-cyan-800 px-1 rounded">.repartition()</code> before write.
        </p>
      </div>
    </div>
  );
}
