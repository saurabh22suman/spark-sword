'use client';

/**
 * Join Strategy Simulator
 * 
 * Change table sizes and watch join strategy change
 * Teaching: When Spark picks broadcast vs shuffle hash vs sort merge
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Radio, Shuffle, GitMerge, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type JoinStrategy = 'broadcast' | 'shuffle-hash' | 'sort-merge';

interface JoinStrategyInfo {
  name: string;
  icon: typeof Radio;
  color: string;
  bgColor: string;
  description: string;
  pros: string[];
  cons: string[];
  when: string;
}

const STRATEGIES: Record<JoinStrategy, JoinStrategyInfo> = {
  'broadcast': {
    name: 'Broadcast Hash Join',
    icon: Radio,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    description: 'Small table is broadcast to all executors',
    pros: ['No shuffle needed', 'Very fast for small tables', 'Works with any join type'],
    cons: ['Requires small table to fit in memory', 'Driver sends data to all nodes'],
    when: 'One table is small (< broadcast threshold, default 10MB)'
  },
  'shuffle-hash': {
    name: 'Shuffle Hash Join',
    icon: Shuffle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    description: 'Both tables shuffled by key, then hash join per partition',
    pros: ['Good for medium-sized tables', 'Builds hash table only once per partition'],
    cons: ['Requires shuffle of both sides', 'Hash table must fit in memory'],
    when: 'Tables are moderate size and one side fits in partition memory'
  },
  'sort-merge': {
    name: 'Sort Merge Join',
    icon: GitMerge,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    description: 'Both tables sorted and merged using join key',
    pros: ['Works for any table size', 'Can spill to disk', 'Memory efficient'],
    cons: ['Requires sorting both sides', 'More expensive than broadcast'],
    when: 'Both tables are large (Spark default for big tables)'
  }
};

function formatSize(mb: number): string {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function JoinStrategySimulator({ className }: { className?: string }) {
  const [leftSize, setLeftSize] = useState(500); // MB
  const [rightSize, setRightSize] = useState(10); // MB
  const [broadcastThreshold, setBroadcastThreshold] = useState(10); // MB

  // Determine join strategy based on sizes
  const strategy = useMemo<JoinStrategy>(() => {
    const smallerTable = Math.min(leftSize, rightSize);
    
    if (smallerTable <= broadcastThreshold) {
      return 'broadcast';
    }
    
    // Shuffle hash if one side is reasonably small
    if (smallerTable < 200) {
      return 'shuffle-hash';
    }
    
    return 'sort-merge';
  }, [leftSize, rightSize, broadcastThreshold]);

  const strategyInfo = STRATEGIES[strategy];
  const Icon = strategyInfo.icon;

  const reset = () => {
    setLeftSize(500);
    setRightSize(10);
    setBroadcastThreshold(10);
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Join Strategy Simulator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Adjust table sizes to see how Spark chooses join strategy
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
        {/* Table Size Controls */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Left Table */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">
              Left Table (df1)
            </h4>
            <div className="mb-4">
              <label className="block text-sm text-slate-500 mb-2">
                Size: <span className="font-bold text-blue-600 dark:text-blue-400">{formatSize(leftSize)}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5000"
                step="10"
                value={leftSize}
                onChange={(e) => setLeftSize(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1 MB</span>
                <span>5 GB</span>
              </div>
            </div>
            
            {/* Visual representation */}
            <motion.div
              animate={{ width: `${Math.min((leftSize / 5000) * 100, 100)}%` }}
              className="h-8 bg-blue-500 rounded-lg min-w-[20px]"
            />
          </div>

          {/* Right Table */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">
              Right Table (df2)
            </h4>
            <div className="mb-4">
              <label className="block text-sm text-slate-500 mb-2">
                Size: <span className="font-bold text-purple-600 dark:text-purple-400">{formatSize(rightSize)}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5000"
                step="10"
                value={rightSize}
                onChange={(e) => setRightSize(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1 MB</span>
                <span>5 GB</span>
              </div>
            </div>
            
            {/* Visual representation */}
            <motion.div
              animate={{ width: `${Math.min((rightSize / 5000) * 100, 100)}%` }}
              className="h-8 bg-purple-500 rounded-lg min-w-[20px]"
            />
          </div>
        </div>

        {/* Broadcast Threshold Control */}
        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              spark.sql.autoBroadcastJoinThreshold: 
              <span className="font-bold text-green-600 dark:text-green-400 ml-1">
                {broadcastThreshold} MB
              </span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={broadcastThreshold}
            onChange={(e) => setBroadcastThreshold(Number(e.target.value))}
            className="w-full accent-green-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0 (disabled)</span>
            <span>100 MB</span>
          </div>
        </div>

        {/* Join Strategy Visualization */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Join Execution Strategy
          </h4>
          
          <div className="relative h-64 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={strategy}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                {strategy === 'broadcast' && (
                  <div className="h-full flex items-center justify-center gap-8">
                    {/* Left table sends to all */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                        df1
                      </div>
                      <span className="text-xs text-slate-400 mt-1">Large</span>
                    </div>
                    
                    {/* Broadcast arrows */}
                    <div className="relative w-32 h-full flex flex-col justify-center">
                      <motion.div
                        animate={{ x: [0, 20, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute left-0 right-0 flex flex-col items-center"
                      >
                        <Radio className="w-8 h-8 text-green-500" />
                        <span className="text-xs font-bold text-green-600 mt-1">BROADCAST</span>
                      </motion.div>
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ x: 60, opacity: 0 }}
                          animate={{ x: 100, opacity: [0, 1, 0] }}
                          transition={{ 
                            duration: 1, 
                            delay: i * 0.2,
                            repeat: Infinity,
                            repeatDelay: 0.5 
                          }}
                          className="absolute w-2 h-2 bg-purple-500 rounded-full"
                          style={{ top: `${30 + i * 20}%` }}
                        />
                      ))}
                    </div>

                    {/* Executors with broadcast table */}
                    <div className="flex flex-col gap-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-12 h-10 bg-slate-300 dark:bg-slate-600 rounded flex items-center justify-center text-xs font-bold">
                            E{i}
                          </div>
                          <div className="w-8 h-6 bg-purple-400 rounded text-xs flex items-center justify-center text-white">
                            df2
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {strategy === 'shuffle-hash' && (
                  <div className="h-full flex items-center justify-center gap-6">
                    {/* Left table partitions */}
                    <div className="flex flex-col items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-14 h-8 bg-blue-500 rounded flex items-center justify-center text-xs text-white">
                          P{i}
                        </div>
                      ))}
                      <span className="text-xs text-slate-400 mt-1">df1</span>
                    </div>

                    {/* Shuffle */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Shuffle className="w-8 h-8 text-amber-500" />
                      </motion.div>
                      <span className="text-xs font-bold text-amber-600 mt-1">SHUFFLE</span>
                    </div>

                    {/* Hash buckets */}
                    <div className="flex flex-col items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 0.5, delay: i * 0.2, repeat: Infinity }}
                          className="w-14 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center text-xs text-white"
                        >
                          H{i}
                        </motion.div>
                      ))}
                      <span className="text-xs text-slate-400 mt-1">Hash</span>
                    </div>

                    {/* Right table partitions */}
                    <div className="flex flex-col items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-14 h-8 bg-purple-500 rounded flex items-center justify-center text-xs text-white">
                          P{i}
                        </div>
                      ))}
                      <span className="text-xs text-slate-400 mt-1">df2</span>
                    </div>
                  </div>
                )}

                {strategy === 'sort-merge' && (
                  <div className="h-full flex items-center justify-center gap-6">
                    {/* Left sorted */}
                    <div className="flex flex-col items-center gap-1">
                      {['A', 'B', 'C'].map((k, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 20 * (2 - i) }}
                          animate={{ y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-14 h-8 bg-blue-500 rounded flex items-center justify-center text-xs text-white font-mono"
                        >
                          {k}
                        </motion.div>
                      ))}
                      <span className="text-xs text-slate-400 mt-1">Sorted</span>
                    </div>

                    {/* Merge arrows */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <GitMerge className="w-8 h-8 text-blue-500" />
                      </motion.div>
                      <span className="text-xs font-bold text-blue-600 mt-1">MERGE</span>
                    </div>

                    {/* Result */}
                    <div className="flex flex-col items-center gap-1">
                      {['A=A', 'B=B', 'C=C'].map((k, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.2 }}
                          className="w-16 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center text-xs text-white font-mono"
                        >
                          {k}
                        </motion.div>
                      ))}
                      <span className="text-xs text-slate-400 mt-1">Joined</span>
                    </div>

                    {/* Right sorted */}
                    <div className="flex flex-col items-center gap-1">
                      {['A', 'B', 'C'].map((k, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 20 * (2 - i) }}
                          animate={{ y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-14 h-8 bg-purple-500 rounded flex items-center justify-center text-xs text-white font-mono"
                        >
                          {k}
                        </motion.div>
                      ))}
                      <span className="text-xs text-slate-400 mt-1">Sorted</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Strategy Details */}
        <motion.div
          key={strategy}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("p-6 rounded-xl border-2", strategyInfo.bgColor)}
        >
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-xl", strategyInfo.bgColor)}>
              <Icon className={cn("w-6 h-6", strategyInfo.color)} />
            </div>
            <div className="flex-1">
              <h4 className={cn("font-bold text-lg", strategyInfo.color)}>
                {strategyInfo.name}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 mt-1 mb-4">
                {strategyInfo.description}
              </p>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-bold text-green-600 dark:text-green-400 mb-2">Pros</h5>
                  <ul className="space-y-1">
                    {strategyInfo.pros.map((pro, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-400">• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-bold text-red-600 dark:text-red-400 mb-2">Cons</h5>
                  <ul className="space-y-1">
                    {strategyInfo.cons.map((con, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-400">• {con}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-bold text-blue-600 dark:text-blue-400 mb-2">When Used</h5>
                  <p className="text-slate-600 dark:text-slate-400">{strategyInfo.when}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hint */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            <strong>Pro tip:</strong> If your small table is just over the broadcast threshold, 
            consider using <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">broadcast(df)</code> hint 
            to force broadcast join. But be careful—if it&apos;s too big, you&apos;ll OOM your driver!
          </p>
        </div>
      </div>
    </div>
  );
}
