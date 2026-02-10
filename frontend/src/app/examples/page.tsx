/**
 * Worked Examples Library Page
 * 
 * Khan Academy-style learning library with step-by-step solutions.
 * Users can browse examples by category, difficulty, and topic.
 * Each example teaches a specific Spark optimization concept.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import WorkedExampleComponent from '@/components/examples/WorkedExample';
import WORKED_EXAMPLES, { type WorkedExample } from '@/data/worked-examples';

type FilterCategory = 'all' | 'basics' | 'joins' | 'shuffle' | 'skew' | 'performance';
type FilterDifficulty = 'all' | 'beginner' | 'intermediate' | 'advanced';

export default function WorkedExamplesPage() {
  const [selectedExample, setSelectedExample] = useState<WorkedExample | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<FilterDifficulty>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter examples
  const filteredExamples = WORKED_EXAMPLES.filter(example => {
    const matchesCategory = categoryFilter === 'all' || example.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || example.difficulty === difficultyFilter;
    const matchesSearch = searchQuery === '' || 
      example.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.problemStatement.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basics': return '📚';
      case 'joins': return '🔗';
      case 'shuffle': return '🔀';
      case 'skew': return '⚖️';
      case 'performance': return '⚡';
      default: return '📖';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // If an example is selected, show full view
  if (selectedExample) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto h-[calc(100vh-2rem)]">
          <WorkedExampleComponent
            example={selectedExample}
            onClose={() => setSelectedExample(null)}
            onTryYourTurn={() => {
              // Navigate to playground with initial state
              if (selectedExample.yourTurnVariant) {
                window.location.href = '/playground';
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Library view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                📚 Worked Examples Library
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Learn Spark optimization through expert-guided, step-by-step solutions
              </p>
            </div>
            <Link
              href="/playground"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Go to Playground →
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'basics', 'joins', 'shuffle', 'skew', 'performance'] as FilterCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${categoryFilter === cat 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {cat === 'all' ? 'All' : `${getCategoryIcon(cat)} ${getCategoryLabel(cat)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty
            </label>
            <div className="flex gap-2">
              {(['all', 'beginner', 'intermediate', 'advanced'] as FilterDifficulty[]).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                    ${difficultyFilter === diff 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredExamples.length} of {WORKED_EXAMPLES.length} examples
        </div>

        {/* Examples Grid */}
        {filteredExamples.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No examples found matching your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExamples.map((example, idx) => (
              <motion.div
                key={example.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                onClick={() => setSelectedExample(example)}
              >
                {/* Card Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{getCategoryIcon(example.category)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(example.difficulty)}`}>
                        {example.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {example.title}
                  </h3>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {example.problemStatement}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{example.steps.length} steps</span>
                    <span className="flex items-center gap-1">
                      {example.yourTurnVariant && (
                        <>
                          <span>🎓</span>
                          <span>Practice included</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-gray-50 dark:bg-gray-900 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    onClick={() => setSelectedExample(example)}
                  >
                    Start Learning →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            💡 Each worked example shows expert problem-solving strategies you can apply to your own Spark jobs.
          </p>
          <p className="mt-2">
            Try the practice challenges in the{' '}
            <Link href="/playground" className="text-blue-600 dark:text-blue-400 hover:underline">
              DataFrame Playground
            </Link>
            {' '}to test your understanding.
          </p>
        </div>
      </div>
    </div>
  );
}
