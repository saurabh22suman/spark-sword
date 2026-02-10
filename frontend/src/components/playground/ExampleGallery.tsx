/**
 * Example Gallery Component
 * 
 * Provides pre-configured examples organized by category
 * for quick learning and experimentation.
 * 
 * Core principles:
 * - Examples teach specific Spark concepts
 * - Organized by category for easy discovery
 * - Include expected outcomes and learning objectives
 * - Can be loaded instantly into playground
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Operation } from './OperationsBuilder';
import type { DataShape } from './DataShapePanel';

export type ExampleCategory = 'basics' | 'shuffle' | 'joins' | 'performance' | 'skew';

export interface PlaygroundExample {
  id: string;
  title: string;
  category: ExampleCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  learningObjective: string;
  expectedOutcome: string;
  shape: Partial<DataShape>;
  operations: Omit<Operation, 'id'>[];
  tags: string[];
}

// Example definitions
const EXAMPLES: PlaygroundExample[] = [
  {
    id: 'simple-filter',
    title: 'Simple Filter',
    category: 'basics',
    difficulty: 'beginner',
    description: 'A basic filter operation - the most common narrow transformation.',
    learningObjective: 'Understand that filters process each partition independently with no shuffle.',
    expectedOutcome: 'No shuffle edges in DAG, data size reduces based on selectivity.',
    shape: { totalSizeBytes: 1 * 1024 * 1024 * 1024, partitions: 200 },
    operations: [
      { type: 'filter', params: { selectivity: 0.3 } },
    ],
    tags: ['narrow', 'filter', 'beginner'],
  },
  {
    id: 'broadcast-join',
    title: 'Broadcast Join',
    category: 'joins',
    difficulty: 'beginner',
    description: 'Join a large table with a small dimension table using broadcast.',
    learningObjective: 'Learn when Spark chooses broadcast join to avoid shuffle.',
    expectedOutcome: 'No shuffle - small table is broadcast to all executors.',
    shape: { totalSizeBytes: 10 * 1024 * 1024 * 1024, partitions: 200 },
    operations: [
      { type: 'filter', params: { selectivity: 0.5 } },
      { type: 'join', params: { right_rows: 10000, join_type: 'inner', broadcast_threshold: 10485760 } },
    ],
    tags: ['join', 'broadcast', 'no-shuffle'],
  },
  {
    id: 'sort-merge-join',
    title: 'Sort-Merge Join',
    category: 'joins',
    difficulty: 'intermediate',
    description: 'Join two large tables - Spark must shuffle both sides.',
    learningObjective: 'Understand when shuffle joins are necessary and their cost.',
    expectedOutcome: 'Both tables shuffle to colocate matching keys.',
    shape: { totalSizeBytes: 10 * 1024 * 1024 * 1024, partitions: 200 },
    operations: [
      { type: 'join', params: { right_rows: 50000000, join_type: 'inner', broadcast_threshold: 10485760 } },
    ],
    tags: ['join', 'shuffle', 'sort-merge'],
  },
  {
    id: 'filter-before-groupby',
    title: 'Filter Before GroupBy',
    category: 'shuffle',
    difficulty: 'beginner',
    description: 'Reduce shuffle volume by filtering before aggregation.',
    learningObjective: 'Learn that operation order affects shuffle volume.',
    expectedOutcome: 'Less data shuffles = faster aggregation.',
    shape: { totalSizeBytes: 10 * 1024 * 1024 * 1024, partitions: 200 },
    operations: [
      { type: 'filter', params: { selectivity: 0.1 } },
      { type: 'groupby', params: { num_groups: 1000, partial_aggregation: true } },
    ],
    tags: ['shuffle', 'optimization', 'groupby'],
  },
  {
    id: 'skewed-groupby',
    title: 'Skewed GroupBy',
    category: 'skew',
    difficulty: 'intermediate',
    description: 'Aggregate data with high skew - some keys have much more data.',
    learningObjective: 'Recognize how skew causes stragglers during shuffles.',
    expectedOutcome: 'Some tasks take much longer, bottlenecking the job.',
    shape: { totalSizeBytes: 10 * 1024 * 1024 * 1024, partitions: 200, skewFactor: 5.0 },
    operations: [
      { type: 'groupby', params: { num_groups: 100, partial_aggregation: true } },
    ],
    tags: ['skew', 'stragglers', 'groupby'],
  },
  {
    id: 'repartition-before-join',
    title: 'Repartition Before Join',
    category: 'performance',
    difficulty: 'advanced',
    description: 'Repartition to increase parallelism before expensive join.',
    learningObjective: 'Understand when explicit repartitioning helps.',
    expectedOutcome: 'More tasks = better parallelism, but extra shuffle cost.',
    shape: { totalSizeBytes: 50 * 1024 * 1024 * 1024, partitions: 100 },
    operations: [
      { type: 'repartition', params: { new_partitions: 400 } },
      { type: 'join', params: { right_rows: 100000000, join_type: 'inner', broadcast_threshold: 10485760 } },
    ],
    tags: ['repartition', 'parallelism', 'join'],
  },
  {
    id: 'cache-reuse',
    title: 'Cache for Reuse',
    category: 'performance',
    difficulty: 'intermediate',
    description: 'Cache intermediate results when the same data is used multiple times.',
    learningObjective: 'Learn when caching avoids recomputation.',
    expectedOutcome: 'Trade memory for speed - subsequent operations are faster.',
    shape: { totalSizeBytes: 5 * 1024 * 1024 * 1024, partitions: 200 },
    operations: [
      { type: 'filter', params: { selectivity: 0.2 } },
      { type: 'cache', params: { storage_level: 'MEMORY_ONLY' } },
      { type: 'groupby', params: { num_groups: 1000, partial_aggregation: true } },
    ],
    tags: ['cache', 'memory', 'reuse'],
  },
  {
    id: 'wide-transformations',
    title: 'Shuffle Chain',
    category: 'shuffle',
    difficulty: 'intermediate',
    description: 'Multiple wide transformations create multiple shuffle stages.',
    learningObjective: 'Understand that each shuffle creates a stage boundary.',
    expectedOutcome: 'DAG shows multiple stages with shuffle boundaries.',
    shape: { totalSizeBytes: 10 * 1024 * 1024 * 1024, partitions: 200 },
    operations: [
      { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
      { type: 'orderby', params: {} },
      { type: 'distinct', params: { duplicates_ratio: 0.1 } },
    ],
    tags: ['shuffle', 'stages', 'dag'],
  },
];

interface ExampleGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExample: (shape: Partial<DataShape>, operations: Operation[]) => void;
  hasCurrentWork: boolean;
}

export function ExampleGallery({
  isOpen,
  onClose,
  onLoadExample,
  hasCurrentWork,
}: ExampleGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExampleCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewExample, setPreviewExample] = useState<PlaygroundExample | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingExample, setPendingExample] = useState<PlaygroundExample | null>(null);

  const filteredExamples = EXAMPLES.filter(ex => {
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleLoadExample = (example: PlaygroundExample) => {
    if (hasCurrentWork) {
      setPendingExample(example);
      setShowConfirm(true);
    } else {
      loadExample(example);
    }
  };

  const loadExample = (example: PlaygroundExample) => {
    const operations: Operation[] = example.operations.map((op, idx) => ({
      ...op,
      id: `example-op-${idx}`,
    }));
    onLoadExample(example.shape, operations);
    onClose();
    setShowConfirm(false);
    setPendingExample(null);
  };

  const categoryInfo = {
    basics: { icon: '📚', label: 'Basics', count: EXAMPLES.filter(e => e.category === 'basics').length },
    shuffle: { icon: '🔀', label: 'Shuffle', count: EXAMPLES.filter(e => e.category === 'shuffle').length },
    joins: { icon: '🔗', label: 'Joins', count: EXAMPLES.filter(e => e.category === 'joins').length },
    performance: { icon: '⚡', label: 'Performance', count: EXAMPLES.filter(e => e.category === 'performance').length },
    skew: { icon: '⚖️', label: 'Data Skew', count: EXAMPLES.filter(e => e.category === 'skew').length },
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
        data-testid="example-gallery"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl max-w-5xl w-full max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                📚 Example Gallery
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              data-testid="gallery-search"
            />
          </div>

          <div className="flex h-[calc(80vh-140px)]">
            {/* Categories sidebar */}
            <div className="w-48 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-2 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({EXAMPLES.length})
              </button>
              
              {(Object.entries(categoryInfo) as [ExampleCategory, typeof categoryInfo[ExampleCategory]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-2 transition-colors ${
                    selectedCategory === key
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  data-testid={`category-${key}`}
                >
                  <span className="mr-2">{info.icon}</span>
                  {info.label} ({info.count})
                </button>
              ))}
            </div>

            {/* Examples grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExamples.map(example => (
                  <motion.div
                    key={example.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => handleLoadExample(example)}
                    onMouseEnter={() => setPreviewExample(example)}
                    onMouseLeave={() => setPreviewExample(null)}
                    data-testid={`example-${example.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                        {example.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        example.difficulty === 'beginner' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                        example.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                        'bg-red-500/20 text-red-700 dark:text-red-400'
                      }`}>
                        {example.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                      {example.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {example.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredExamples.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No examples found matching your search.
                </div>
              )}
            </div>

            {/* Preview panel */}
            {previewExample && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-80 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto"
                data-testid="example-preview"
              >
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {previewExample.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {previewExample.description}
                </p>
                
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Learning Objective
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {previewExample.learningObjective}
                  </p>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Outcome
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {previewExample.expectedOutcome}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Operations
                  </h4>
                  <div className="space-y-1">
                    {previewExample.operations.map((op, idx) => (
                      <div key={idx} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                        {op.type}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Confirmation dialog */}
        <AnimatePresence>
          {showConfirm && pendingExample && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md mx-4 border border-slate-200 dark:border-slate-700"
                role="dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Load Example?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Your current work will be lost. Are you sure you want to load &quot;{pendingExample.title}&quot;?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => loadExample(pendingExample)}
                    className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Load Example
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default ExampleGallery;
