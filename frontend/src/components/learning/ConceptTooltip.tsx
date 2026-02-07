'use client';

/**
 * ConceptTooltip Component
 * 
 * Contextual tooltips for Spark terminology in Brilliant style.
 * Hover → instant definition, Click → expanded explanation + visual
 * 
 * Features:
 * - Hover for quick definition
 * - Click for detailed explanation
 * - Visual demonstrations
 * - Link to full tutorials
 * - Link to playground demos
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONCEPT_REVEAL } from './animations';

interface ConceptTooltipProps {
  term: string;
  definition: string;
  explanation?: string;
  visual?: React.ReactNode;
  tutorialLink?: string;
  playgroundLink?: string;
  category?: 'transformation' | 'action' | 'config' | 'concept';
  children?: React.ReactNode;
  className?: string;
}

export function ConceptTooltip({
  term,
  definition,
  explanation,
  visual,
  tutorialLink,
  playgroundLink,
  category,
  children,
  className = '',
}: ConceptTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close expanded view when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isExpanded &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const categoryColors = {
    transformation: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    action: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    config: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    concept: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  };

  const categoryBadgeColors = {
    transformation: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    action: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    config: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    concept: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  };

  return (
    <span className={cn('relative inline-block', className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'inline-flex items-center gap-1 px-1 py-0.5 rounded border-b-2 border-dotted transition-colors',
          category
            ? 'border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            : 'border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        )}
        data-testid={`concept-tooltip-${term}`}
      >
        {children || term}
        <Info className="w-3 h-3 opacity-60" />
      </button>

      {/* Quick Definition (Hover) */}
      <AnimatePresence>
        {isHovered && !isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 pointer-events-none"
          >
            <div className="p-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm shadow-xl">
              <div className="font-semibold mb-1">{term}</div>
              <div className="text-slate-300 dark:text-slate-600 text-xs leading-relaxed">
                {definition}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Click for details
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5">
              <div className="w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-100" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Explanation (Click) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            ref={tooltipRef}
            variants={CONCEPT_REVEAL}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-96 max-w-[90vw]"
          >
            <div
              className={cn(
                'p-6 rounded-xl border-2 shadow-2xl bg-white dark:bg-slate-900',
                category ? categoryColors[category] : 'border-slate-200 dark:border-slate-800'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {term}
                  </h4>
                  {category && (
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        categoryBadgeColors[category]
                      )}
                    >
                      {category}
                    </span>
                  )}
                </div>
              </div>

              {/* Definition */}
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                {definition}
              </p>

              {/* Explanation */}
              {explanation && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 mb-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {explanation}
                  </p>
                </div>
              )}

              {/* Visual */}
              {visual && (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  {visual}
                </div>
              )}

              {/* Links */}
              {(tutorialLink || playgroundLink) && (
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {tutorialLink && (
                    <a
                      href={tutorialLink}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Learn in tutorial
                    </a>
                  )}
                  {playgroundLink && (
                    <a
                      href={playgroundLink}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Play className="w-4 h-4" />
                      Try in playground
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Pre-configured tooltip for common Spark terms
 */
export function SparkTerm({ term, children }: { term: string; children?: React.ReactNode }) {
  const SPARK_TERMS: Record<string, Omit<ConceptTooltipProps, 'term' | 'children'>> = {
    shuffle: {
      definition: 'Data movement across executors to satisfy data locality requirements',
      explanation:
        'Shuffles are expensive because they involve network I/O, disk I/O, and serialization. Triggered by wide transformations like groupBy, join, and repartition.',
      category: 'concept',
      tutorialLink: '/tutorials/transformations-shuffles',
      playgroundLink: '/playground',
    },
    partition: {
      definition: 'A logical chunk of data that can be processed in parallel',
      explanation:
        'Spark splits data into partitions. Each partition is processed by one task on one executor core. Too few = underutilization. Too many = overhead.',
      category: 'concept',
      tutorialLink: '/tutorials/data-partitioning',
      playgroundLink: '/playground',
    },
    broadcast: {
      definition: 'Sending a small dataset to all executors to avoid shuffle',
      explanation:
        'Broadcast joins are fast because the small table is sent once to each executor, avoiding shuffle. Only works if table fits in memory.',
      category: 'transformation',
      tutorialLink: '/tutorials/joins',
      playgroundLink: '/playground',
    },
    skew: {
      definition: 'Uneven data distribution causing some partitions to be much larger',
      explanation:
        'Skew causes stragglers - one task processing 90% of data while others wait. Common with hot keys in joins and groupBy.',
      category: 'concept',
      tutorialLink: '/tutorials/joins',
    },
    coalesce: {
      definition: 'Reduce partition count without shuffle',
      explanation:
        'coalesce combines existing partitions without redistribution. Faster than repartition but can only decrease partition count.',
      category: 'transformation',
      tutorialLink: '/tutorials/data-partitioning',
    },
    repartition: {
      definition: 'Change partition count with full shuffle',
      explanation:
        'repartition triggers a shuffle to redistribute data evenly. Use when you need to increase partitions or ensure even distribution.',
      category: 'transformation',
      tutorialLink: '/tutorials/data-partitioning',
    },
    cache: {
      definition: 'Store DataFrame in memory for reuse',
      explanation:
        'Caching materializes a DataFrame in memory to avoid recomputation. Only beneficial if DataFrame is used multiple times.',
      category: 'action',
      tutorialLink: '/tutorials/memory-spills',
    },
  };

  const termConfig = SPARK_TERMS[term.toLowerCase()];
  if (!termConfig) {
    return <>{children || term}</>;
  }

  return (
    <ConceptTooltip term={term} {...termConfig}>
      {children}
    </ConceptTooltip>
  );
}
