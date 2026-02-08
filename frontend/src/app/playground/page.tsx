'use client';

import { PlaygroundV3Revamp } from '@/components/playground';
import { ScenarioBridgeProvider } from '@/components/playground/ScenarioBridge';
import Link from 'next/link';
import { LearningModeToggle } from '@/components/learning';
import { useSearchParams } from 'next/navigation';
import { Suspense, Component, ReactNode } from 'react';
import { PageContainer, PageHeader } from '@/components/ui';

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

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario');
  
  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Link href={scenarioId ? "/scenarios" : "/"} className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-500 dark:hover:text-slate-400">
            ← {scenarioId ? 'Back to Scenarios' : 'Back'}
          </Link>
          <LearningModeToggle />
        </div>
        <PageHeader
          title="DataFrame Shape Playground"
          description={
            scenarioId 
              ? 'Explore this scenario by adjusting the data shape and observing how Spark reacts.'
              : 'Develop intuition for how Spark reacts to data shape and operations. Build operation chains, predict Spark\'s decisions, and understand trade-offs.'
          }
          className="mb-0"
        />
      </div>

      {/* Playground v3 Revamp with Scenario Bridge */}
      <PlaygroundErrorBoundary>
        <ScenarioBridgeProvider>
          <PlaygroundV3Revamp initialScenario={scenarioId || undefined} />
        </ScenarioBridgeProvider>
      </PlaygroundErrorBoundary>
    </PageContainer>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
          <div className="h-4 w-full max-w-96 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </PageContainer>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}
