'use client';

import { PlaygroundV3Revamp } from '@/components/playground';
import { ScenarioBridgeProvider } from '@/components/playground/ScenarioBridge';
import Link from 'next/link';
import { LearningModeToggle } from '@/components/learning';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageContainer, PageHeader } from '@/components/ui';

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
      <ScenarioBridgeProvider>
        <PlaygroundV3Revamp initialScenario={scenarioId || undefined} />
      </ScenarioBridgeProvider>
    </PageContainer>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </PageContainer>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}
