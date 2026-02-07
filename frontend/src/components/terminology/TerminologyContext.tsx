'use client';

/**
 * Terminology Context System
 * 
 * Per spark-terminology-interactive-spec.md:
 * - Contextual terminology cards (not glossary)
 * - Follow lifecycle: Observe → Predict → Experience → Name → Reinforce
 * - Appear near relevant visuals, never modal
 * - Terms follow understanding, not the other way around
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TERMINOLOGY DATA
// ============================================================================

export interface SparkTerm {
  id: string;
  name: string;
  explanation: string;
  group: TermGroup;
  visualReference?: string;
}

export type TermGroup = 
  | 'execution-planning'
  | 'transformations'
  | 'parallelism'
  | 'join-mechanics'
  | 'memory-storage'
  | 'skew-adaptivity'
  | 'codegen';

export const SPARK_TERMS: Record<string, SparkTerm> = {
  // Group 1: Execution Planning
  dag: {
    id: 'dag',
    name: 'DAG',
    explanation: 'Directed Acyclic Graph — Spark\'s execution plan showing how transformations flow from source to action.',
    group: 'execution-planning',
    visualReference: 'The connected boxes you see are the DAG.'
  },
  stage: {
    id: 'stage',
    name: 'Stage',
    explanation: 'A group of tasks that can run together without shuffling data. Stage boundaries occur at wide transformations.',
    group: 'execution-planning',
    visualReference: 'Each colored section represents one stage.'
  },
  task: {
    id: 'task',
    name: 'Task',
    explanation: 'The smallest unit of work in Spark. One task processes one partition of data on one executor core.',
    group: 'execution-planning'
  },
  lazy_evaluation: {
    id: 'lazy_evaluation',
    name: 'Lazy Evaluation',
    explanation: 'Spark waits to execute transformations until an action is called. This allows optimization of the entire plan.',
    group: 'execution-planning'
  },

  // Group 2: Transformations & Data Movement
  narrow_transformation: {
    id: 'narrow_transformation',
    name: 'Narrow Transformation',
    explanation: 'An operation where each input partition contributes to at most one output partition. Examples: filter, map.',
    group: 'transformations',
    visualReference: 'Blue nodes that don\'t cause stage boundaries.'
  },
  wide_transformation: {
    id: 'wide_transformation',
    name: 'Wide Transformation',
    explanation: 'An operation requiring data from multiple input partitions. Always triggers a shuffle. Examples: groupBy, join.',
    group: 'transformations',
    visualReference: 'Orange nodes that create stage boundaries.'
  },
  shuffle: {
    id: 'shuffle',
    name: 'Shuffle',
    explanation: 'Spark moves data across executors so rows with the same key end up together. Expensive due to network I/O.',
    group: 'transformations',
    visualReference: 'The data movement animation between stages.'
  },

  // Group 3: Parallelism & Distribution
  partition: {
    id: 'partition',
    name: 'Partition',
    explanation: 'A chunk of data that one task processes. More partitions = more parallelism, but also more overhead.',
    group: 'parallelism',
    visualReference: 'Each bar in the partition visualization.'
  },
  parallelism: {
    id: 'parallelism',
    name: 'Parallelism',
    explanation: 'How many tasks can run simultaneously. Limited by executors × cores and number of partitions.',
    group: 'parallelism'
  },
  task_slot: {
    id: 'task_slot',
    name: 'Task Slot',
    explanation: 'One executor core that can run one task. If partitions > task slots, tasks queue up.',
    group: 'parallelism'
  },

  // Group 4: Join Mechanics
  broadcast_join: {
    id: 'broadcast_join',
    name: 'Broadcast Join',
    explanation: 'The smaller table is sent to all executors. Fast because no shuffle of the large table.',
    group: 'join-mechanics',
    visualReference: 'The purple broadcast animation.'
  },
  shuffle_join: {
    id: 'shuffle_join',
    name: 'Shuffle Join',
    explanation: 'Both tables are shuffled so matching keys end up together. Expensive but necessary for large-large joins.',
    group: 'join-mechanics',
    visualReference: 'The orange shuffle paths from both tables.'
  },
  join_strategy: {
    id: 'join_strategy',
    name: 'Join Strategy',
    explanation: 'How Spark executes a join: broadcast, shuffle-hash, or sort-merge. Chosen based on table sizes and hints.',
    group: 'join-mechanics'
  },

  // Group 5: Memory & Storage
  execution_memory: {
    id: 'execution_memory',
    name: 'Execution Memory',
    explanation: 'Memory used for shuffles, joins, sorts, and aggregations. Competes with storage memory.',
    group: 'memory-storage',
    visualReference: 'The upper portion of the memory diagram.'
  },
  storage_memory: {
    id: 'storage_memory',
    name: 'Storage Memory',
    explanation: 'Memory used for caching DataFrames. Can be evicted if execution needs more space.',
    group: 'memory-storage',
    visualReference: 'The lower portion of the memory diagram.'
  },
  spill: {
    id: 'spill',
    name: 'Spill',
    explanation: 'When data exceeds memory, Spark writes to disk. Disk is 100x slower than memory.',
    group: 'memory-storage',
    visualReference: 'The red overflow animation.'
  },
  cache: {
    id: 'cache',
    name: 'Cache / Persist',
    explanation: 'Storing a DataFrame in memory to avoid recomputation. Only helps if data is reused.',
    group: 'memory-storage'
  },

  // Group 6: Skew & Adaptivity
  data_skew: {
    id: 'data_skew',
    name: 'Data Skew',
    explanation: 'Uneven data distribution where one partition has far more data than others. Causes stragglers.',
    group: 'skew-adaptivity',
    visualReference: 'The tall partition bar that dominates the visualization.'
  },
  straggler: {
    id: 'straggler',
    name: 'Straggler',
    explanation: 'A task that takes much longer than others, delaying the entire stage. Often caused by skew.',
    group: 'skew-adaptivity',
    visualReference: 'The long task bar in the timeline.'
  },
  aqe: {
    id: 'aqe',
    name: 'Adaptive Query Execution',
    explanation: 'Spark 3+ feature that adjusts plans at runtime based on actual data statistics.',
    group: 'skew-adaptivity'
  },

  // Group 7: Code Generation (Advanced)
  catalyst: {
    id: 'catalyst',
    name: 'Catalyst Optimizer',
    explanation: 'Spark\'s query optimizer that rewrites logical plans for better performance.',
    group: 'codegen'
  },
  tungsten: {
    id: 'tungsten',
    name: 'Tungsten Engine',
    explanation: 'Spark\'s execution engine with memory management and code generation for speed.',
    group: 'codegen'
  }
};

// ============================================================================
// CONTEXT FOR TRACKING SEEN TERMS
// ============================================================================

interface TerminologyContextType {
  seenTerms: Set<string>;
  markTermSeen: (termId: string) => void;
  showTermCard: (termId: string, position?: { x: number; y: number }) => void;
  hideTermCard: () => void;
  activeTermId: string | null;
  activePosition: { x: number; y: number } | null;
}

const TerminologyContext = createContext<TerminologyContextType | null>(null);

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const [seenTerms, setSeenTerms] = useState<Set<string>>(new Set());
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [activePosition, setActivePosition] = useState<{ x: number; y: number } | null>(null);

  // Load seen terms from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('preprabbit-seen-terms');
    if (stored) {
      setSeenTerms(new Set(JSON.parse(stored)));
    }
  }, []);

  const markTermSeen = (termId: string) => {
    setSeenTerms(prev => {
      const next = new Set(prev);
      next.add(termId);
      localStorage.setItem('preprabbit-seen-terms', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const showTermCard = (termId: string, position?: { x: number; y: number }) => {
    setActiveTermId(termId);
    setActivePosition(position || null);
    markTermSeen(termId);
  };

  const hideTermCard = () => {
    setActiveTermId(null);
    setActivePosition(null);
  };

  return (
    <TerminologyContext.Provider value={{
      seenTerms,
      markTermSeen,
      showTermCard,
      hideTermCard,
      activeTermId,
      activePosition
    }}>
      {children}
    </TerminologyContext.Provider>
  );
}

export function useTerminology() {
  const ctx = useContext(TerminologyContext);
  if (!ctx) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }
  return ctx;
}

// ============================================================================
// TERMINOLOGY CARD COMPONENT
// ============================================================================

interface TermCardProps {
  termId: string;
  onDismiss: () => void;
  position?: { x: number; y: number };
  className?: string;
}

export function TermCard({ termId, onDismiss, position, className }: TermCardProps) {
  const term = SPARK_TERMS[termId];
  
  if (!term) return null;

  const groupColors: Record<TermGroup, string> = {
    'execution-planning': 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    'transformations': 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    'parallelism': 'border-green-500 bg-green-50 dark:bg-green-900/20',
    'join-mechanics': 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    'memory-storage': 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    'skew-adaptivity': 'border-red-500 bg-red-50 dark:bg-red-900/20',
    'codegen': 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
  };

  const style = position ? {
    position: 'fixed' as const,
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y + 10, window.innerHeight - 200)
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={style}
      className={cn(
        "w-80 rounded-xl border-2 shadow-lg z-50",
        groupColors[term.group],
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h4 className="font-bold text-slate-900 dark:text-white">
              {term.name}
            </h4>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {term.explanation}
        </p>
        
        {term.visualReference && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
            👁️ {term.visualReference}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// GLOBAL TERMINOLOGY CARD OVERLAY
// ============================================================================

export function TerminologyOverlay() {
  const { activeTermId, activePosition, hideTermCard } = useTerminology();

  return (
    <AnimatePresence>
      {activeTermId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={hideTermCard}
            className="fixed inset-0 z-40"
          />
          {/* Card */}
          <TermCard
            termId={activeTermId}
            onDismiss={hideTermCard}
            position={activePosition || undefined}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// INLINE TERM HIGHLIGHT
// ============================================================================

interface TermHighlightProps {
  termId: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wrap text that should reveal terminology on hover/click
 */
export function TermHighlight({ termId, children, className }: TermHighlightProps) {
  const { showTermCard, seenTerms } = useTerminology();
  const hasSeen = seenTerms.has(termId);

  const handleClick = (e: React.MouseEvent) => {
    showTermCard(termId, { x: e.clientX, y: e.clientY });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline underline decoration-dotted underline-offset-2 cursor-help transition-colors",
        hasSeen
          ? "decoration-slate-400 hover:decoration-slate-600"
          : "decoration-blue-500 hover:decoration-blue-700 text-blue-600 dark:text-blue-400",
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// CONCEPTS SEEN PANEL
// ============================================================================

export function ConceptsSeenPanel({ className }: { className?: string }) {
  const { seenTerms, showTermCard } = useTerminology();
  const [isOpen, setIsOpen] = useState(false);

  const seenList = Array.from(seenTerms)
    .map(id => SPARK_TERMS[id])
    .filter(Boolean);

  if (seenList.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
      >
        <BookOpen className="w-4 h-4" />
        <span>Concepts ({seenList.length})</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Concepts You&apos;ve Learned
              </h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {seenList.map(term => (
                <button
                  key={term.id}
                  onClick={() => showTermCard(term.id)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="font-medium text-sm text-slate-700 dark:text-slate-300">
                    {term.name}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
