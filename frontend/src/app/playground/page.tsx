'use client';

import { PlaygroundV3Revamp } from '@/components/playground';
import { ScenarioBridgeProvider } from '@/components/playground/ScenarioBridge';
import Link from 'next/link';
import { LearningModeToggle } from '@/components/learning';
import { useState, useEffect, Component, ReactNode } from 'react';
import { PageContainer, PageHeader } from '@/components/ui';
import type { InferredIntent, IntentGraphNode } from '@/types';
import type { Operation } from '@/components/playground/OperationsBuilder';
import { parseUrlState, type DataShape } from '@/lib/url-state';

// Error boundary to prevent playground crashes from blocking navigation
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PlaygroundErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
            Playground failed to load
          </h3>
          <p className="text-sm text-red-600 dark:text-red-500 mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Map IntentGraphNode operations to playground Operation types
const INTENT_TO_OPERATION_TYPE: Record<string, string> = {
  filter: 'filter',
  where: 'filter',
  groupby: 'groupby',
  groupbykey: 'groupby',
  reducebykey: 'groupby',
  aggregatebykey: 'groupby',
  agg: 'groupby',
  join: 'join',
  leftjoin: 'join',
  rightjoin: 'join',
  innerjoin: 'join',
  fulljoin: 'join',
  crossjoin: 'join',
  write: 'write',
  save: 'write',
  writeto: 'write',
  window: 'window',
  distinct: 'distinct',
  dropduplicates: 'distinct',
  union: 'union',
  unionall: 'union',
  repartition: 'repartition',
  coalesce: 'coalesce',
  cache: 'cache',
  persist: 'cache',
  orderby: 'orderby',
  sort: 'orderby',
  sortby: 'orderby',
};

// Default parameters for each operation type (mirrors OperationsBuilder)
const DEFAULT_PARAMS: Record<string, Record<string, number | string | boolean>> = {
  filter: { selectivity: 0.5 },
  groupby: { num_groups: 1000, partial_aggregation: true },
  join: { right_rows: 100000, join_type: 'inner', broadcast_threshold: 10485760 },
  write: { output_partitions: 200, file_size_target: 134217728 },
  window: { partition_columns: 1, has_order_by: true },
  distinct: { duplicates_ratio: 0.1 },
  union: { other_rows: 1000000 },
  repartition: { new_partitions: 200 },
  coalesce: { new_partitions: 50 },
  cache: { storage_level: 'MEMORY_ONLY' },
  orderby: {},
};

/**
 * Convert IntentGraphNode[] from notebook parsing into Operation[] for the playground.
 * Merges user-edited assumptions (e.g., join_type, selectivity) into default params.
 */
function intentToOperations(nodes: IntentGraphNode[]): Operation[] {
  return nodes
    .map((node, idx) => {
      const opKey = node.operation.toLowerCase().replace(/[^a-z]/g, '');
      const type = INTENT_TO_OPERATION_TYPE[opKey];
      if (!type) return null; // Skip operations that don't map (select, withColumn, alias, etc.)

      const baseParams = { ...(DEFAULT_PARAMS[type] || {}) };

      // Merge editable assumptions from user edits on the intent page
      const editable = node.details?.editable;
      if (editable) {
        if (editable.join_type && type === 'join') {
          baseParams.join_type = editable.join_type;
        }
        if (editable.selectivity !== undefined && type === 'filter') {
          baseParams.selectivity = editable.selectivity;
        }
        if (editable.broadcast_hint !== undefined && type === 'join') {
          // If broadcast hint, lower the threshold to force broadcast behavior
          baseParams.broadcast_threshold = editable.broadcast_hint ? 999999999 : 10485760;
        }
      }

      return {
        id: `intent-op-${idx}-${Date.now()}`,
        type,
        params: baseParams,
      } as Operation;
    })
    .filter((op): op is Operation => op !== null);
}

export default function PlaygroundPage() {
  // Read scenario ID from URL without useSearchParams (avoids Suspense/transition lanes)
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [intentOperations, setIntentOperations] = useState<Operation[] | null>(null);
  const [intentSummary, setIntentSummary] = useState<string | null>(null);
  const [urlLoadedState, setUrlLoadedState] = useState<{ shape: DataShape; operations: Operation[] } | null>(null);
  // Defer heavy component rendering to client-only to prevent hydration mismatches
  // (PartitionBars, useReducedMotion, framer-motion) from creating stuck React lanes
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenario = params.get('scenario');
    const source = params.get('source');
    
    // Priority 1: Load from URL state (shareable links)
    const urlState = parseUrlState(params);
    if (urlState) {
      setUrlLoadedState({
        shape: urlState.shape,
        operations: urlState.operations,
      });
      if (urlState.scenarioId) {
        setScenarioId(urlState.scenarioId);
      }
      setClientReady(true);
      return;
    }

    // Priority 2: Load from intent (notebook parsing)
    if (source === 'intent') {
      // Load intent from sessionStorage and convert to operations
      try {
        const stored = sessionStorage.getItem('inferredIntent');
        if (stored) {
          const intent: InferredIntent = JSON.parse(stored);
          const ops = intentToOperations(intent.intent_graph || []);
          if (ops.length > 0) {
            setIntentOperations(ops);
            setIntentSummary(intent.summary || null);
          }
        }
      } catch (e) {
        console.error('Failed to load intent operations:', e);
      }
    } else if (scenario) {
      // Priority 3: Load from scenario
      setScenarioId(scenario);
    }

    setClientReady(true);
  }, []);

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Link href={scenarioId ? "/scenarios" : intentOperations ? "/intent" : "/"} className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-500 dark:hover:text-slate-400">
            ← {scenarioId ? 'Back to Scenarios' : intentOperations ? 'Back to Intent' : 'Back'}
          </Link>
          <LearningModeToggle />
        </div>
        <PageHeader
          title="DataFrame Shape Playground"
          description={
            intentOperations
              ? 'Simulating your notebook intent. Adjust data shape and operations to explore how Spark would execute this pipeline.'
              : scenarioId 
                ? 'Explore this scenario by adjusting the data shape and observing how Spark reacts.'
                : 'Develop intuition for how Spark reacts to data shape and operations. Build operation chains, predict Spark\'s decisions, and understand trade-offs.'
          }
          className="mb-0"
        />
        {intentSummary && (
          <div className="mt-3 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-lg">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <span className="font-semibold">Notebook Intent:</span> {intentSummary}
            </p>
          </div>
        )}
      </div>

      {/* Playground v3 Revamp — deferred to client to avoid hydration mismatch */}
      {clientReady ? (
        <PlaygroundErrorBoundary>
          <ScenarioBridgeProvider>
            <PlaygroundV3Revamp
              initialScenario={scenarioId || undefined}
              initialIntentOperations={intentOperations || undefined}
              initialShape={urlLoadedState?.shape}
              initialOperations={urlLoadedState?.operations}
            />
          </ScenarioBridgeProvider>
        </PlaygroundErrorBoundary>
      ) : (
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      )}
    </PageContainer>
  );
}
