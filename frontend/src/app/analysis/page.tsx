'use client';

/**
 * Analysis Page
 * 
 * Displays the execution DAG, insights, and metrics from a parsed Spark event log.
 * Implements Phase 1-2 of work-ahead: Execution Graph + "Why Spark Did This"
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DAGVisualization } from '@/components/dag';
import { InsightsPanel } from '@/components/insights';
import { CodeMappingPanel, type TransformationMapping } from '@/components/codemapping';
import { BeforeAfterComparison } from '@/components/comparison';
import { StageTimeline, type StageTimelineData } from '@/components/timeline';
import type { DAGData, OptimizationInsight, StageExplanation } from '@/types';

interface AnalysisResult {
  dag: DAGData;
  insights: OptimizationInsight[];
  code_mappings: TransformationMapping[];
  stage_explanations: StageExplanation[];
  summary: {
    total_jobs: number;
    total_stages: number;
    total_tasks: number;
    total_duration_ms: number;
    total_shuffle_bytes: number;
    total_spill_bytes: number;
  };
  // Feature 6: Demo mode support
  is_demo?: boolean;
  demo_label?: string;
}

type ViewMode = 'dag' | 'code' | 'insights' | 'compare' | 'metrics';

function MetricCard({ label, value, unit, warning }: { 
  label: string; 
  value: string | number; 
  unit?: string;
  warning?: boolean;
}) {
  return (
    <div className={`p-4 bg-slate-800/50 rounded-lg border ${warning ? 'border-yellow-500/50' : 'border-slate-700'}`}>
      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-semibold ${warning ? 'text-yellow-400' : 'text-white'}`}>
        {value}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function AnalysisPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dag');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [learningMode, setLearningMode] = useState(false);

  useEffect(() => {
    // Load analysis result from sessionStorage
    const stored = sessionStorage.getItem('analysisResult');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        router.push('/upload');
      }
    } else {
      router.push('/upload');
    }
  }, [router]);

  // Generate stage timeline data from DAG nodes
  // Must be before conditional return to follow Rules of Hooks
  const stageTimelineData: StageTimelineData[] = useMemo(() => {
    if (!result?.dag?.nodes) return [];
    let cumulativeTime = 0;
    return result.dag.nodes.map((node, index) => {
      const metadata = node.data?.metadata || {};
      // Use actual timing data if available, otherwise estimate based on position
      const duration = metadata.duration_ms ?? 2000;
      const startTime = cumulativeTime;
      cumulativeTime += duration + 500; // Add gap between stages
      return {
        stageId: metadata.stage_id ?? index,
        stageName: node.data?.label || `Stage ${node.id}`,
        startTime,
        endTime: startTime + duration,
        duration,
        taskCount: metadata.num_tasks ?? 0,
        status: (metadata.status as 'completed' | 'running' | 'failed') || 'completed',
      };
    });
  }, [result?.dag?.nodes]);

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading analysis...</div>
      </div>
    );
  }

  const { dag, insights, code_mappings, summary } = result;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Demo Mode Banner - Feature 6 */}
      {result.is_demo && (
        <div className="bg-purple-500/10 border-b border-purple-500/30">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>🎮</span>
              <span className="text-purple-300">
                {result.demo_label || 'Demo Data — Try uploading your own files for real analysis'}
              </span>
            </div>
            <Link
              href="/upload"
              className="text-xs px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded transition-colors"
            >
              Upload Your Own →
            </Link>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold">
                <span className="text-orange-500">Spark</span>
                <span className="text-yellow-500">-Sword</span>
              </Link>
              
              {/* View Mode Tabs */}
              <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                {(['dag', 'code', 'insights', 'compare', 'metrics'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`
                      px-4 py-1.5 rounded text-sm font-medium transition-colors
                      ${viewMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'}
                    `}
                  >
                    {mode === 'dag' ? 'DAG' : mode === 'code' ? 'Code' : mode === 'compare' ? 'Compare' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Learning Mode Toggle */}
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={learningMode}
                  onChange={(e) => setLearningMode(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                Learning Mode
              </label>
              
              <Link
                href="/upload"
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                New Upload
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="border-b border-slate-800 bg-slate-900/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-slate-500">Jobs:</span>
              <span className="ml-2 text-white font-medium">{summary.total_jobs}</span>
            </div>
            <div>
              <span className="text-slate-500">Stages:</span>
              <span className="ml-2 text-white font-medium">{summary.total_stages}</span>
            </div>
            <div>
              <span className="text-slate-500">Tasks:</span>
              <span className="ml-2 text-white font-medium">{summary.total_tasks.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500">Duration:</span>
              <span className="ml-2 text-white font-medium">{formatDuration(summary.total_duration_ms)}</span>
            </div>
            <div>
              <span className="text-slate-500">Shuffle:</span>
              <span className={`ml-2 font-medium ${summary.total_shuffle_bytes > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {formatBytes(summary.total_shuffle_bytes)}
              </span>
            </div>
            {summary.total_spill_bytes > 0 && (
              <div>
                <span className="text-slate-500">Spill:</span>
                <span className="ml-2 text-red-400 font-medium">
                  {formatBytes(summary.total_spill_bytes)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {viewMode === 'dag' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DAG View */}
            <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white">Execution DAG</h2>
                {learningMode && (
                  <p className="text-xs text-slate-400 mt-1">
                    Each node represents a stage. Edges show data dependencies. 
                    Red edges indicate shuffle boundaries where data is redistributed across the cluster.
                  </p>
                )}
              </div>
              <div className="h-[600px]">
                <DAGVisualization
                  data={dag}
                  onNodeClick={(nodeId) => setSelectedStageId(nodeId)}
                  selectedNodeId={selectedStageId ?? undefined}
                />
              </div>
            </div>

            {/* Stage Details Panel */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white">Stage Details</h2>
              </div>
              <div className="p-4">
                {selectedStageId ? (
                  <StageDetails
                    stageId={selectedStageId}
                    dag={dag}
                    insights={insights}
                    stageExplanations={result.stage_explanations || []}
                    learningMode={learningMode}
                  />
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-3xl mb-2">👆</div>
                    <p>Click a stage in the DAG to see details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'code' && (
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
            <CodeMappingPanel
              mappings={code_mappings || []}
              onStageClick={(stageId) => {
                setSelectedStageId(String(stageId));
                setViewMode('dag');
              }}
              selectedStageId={selectedStageId ? parseInt(selectedStageId) : null}
              learningMode={learningMode}
            />
          </div>
        )}

        {viewMode === 'insights' && (
          <InsightsPanel
            insights={insights}
            onInsightClick={(insight) => {
              if (insight.stage_id) {
                setSelectedStageId(String(insight.stage_id));
                setViewMode('dag');
              }
            }}
          />
        )}

        {viewMode === 'compare' && (
          <BeforeAfterComparison
            currentMetrics={{
              shuffleBytes: summary.total_shuffle_bytes,
              spillBytes: summary.total_spill_bytes,
              taskDurationMs: summary.total_duration_ms / Math.max(summary.total_tasks, 1),
              partitions: summary.total_stages * 200, // Estimate based on default
              stages: summary.total_stages,
            }}
          />
        )}

        {viewMode === 'metrics' && (
          <div className="space-y-6">
            {/* Overview Metrics */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Execution Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Total Jobs" value={summary.total_jobs} />
                <MetricCard label="Total Stages" value={summary.total_stages} />
                <MetricCard label="Total Tasks" value={summary.total_tasks.toLocaleString()} />
                <MetricCard label="Duration" value={formatDuration(summary.total_duration_ms)} />
              </div>
            </div>

            {/* Data Movement */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Data Movement</h2>
              {learningMode && (
                <p className="text-sm text-slate-400 mb-4">
                  Shuffle moves data across the network. Spill writes to disk when memory is exhausted.
                  Both are expensive operations that indicate potential optimization opportunities.
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard 
                  label="Total Shuffle" 
                  value={formatBytes(summary.total_shuffle_bytes)}
                  warning={summary.total_shuffle_bytes > 10 * 1024 * 1024 * 1024}
                />
                <MetricCard 
                  label="Spill to Disk" 
                  value={formatBytes(summary.total_spill_bytes)}
                  warning={summary.total_spill_bytes > 0}
                />
              </div>
            </div>

            {/* Insights Summary */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Optimization Insights
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 rounded-full">
                  {insights.length}
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard 
                  label="High Confidence" 
                  value={insights.filter(i => i.confidence === 'high').length}
                />
                <MetricCard 
                  label="Medium Confidence" 
                  value={insights.filter(i => i.confidence === 'medium').length}
                />
                <MetricCard 
                  label="Low Confidence" 
                  value={insights.filter(i => i.confidence === 'low').length}
                />
              </div>
            </div>

            {/* Stage Timeline */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Stage Metrics Timeline</h2>
              {learningMode && (
                <p className="text-sm text-slate-400 mb-4">
                  The timeline shows when each stage executed and how long it took.
                  Overlapping bars indicate parallel execution. Use this to identify bottleneck stages.
                </p>
              )}
              <div className="bg-slate-800/30 rounded-lg p-4">
                <StageTimeline stages={stageTimelineData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StageDetails({ 
  stageId, 
  dag, 
  insights,
  stageExplanations,
  learningMode 
}: { 
  stageId: string;
  dag: DAGData;
  insights: OptimizationInsight[];
  stageExplanations: StageExplanation[];
  learningMode: boolean;
}) {
  const stage = dag.nodes.find(n => n.id === stageId);
  if (!stage) {
    return <div className="text-slate-500">Stage not found</div>;
  }

  // Find explanation for this stage
  const stageIdNum = parseInt(stageId.replace('stage_', ''), 10);
  const explanation = stageExplanations.find(e => e.stage_id === stageIdNum);
  
  const stageInsights = insights.filter(i => String(i.stage_id) === stageId);
  const metadata = stage.data.metadata;

  return (
    <div className="space-y-4">
      {/* Stage header */}
      <div>
        <h3 className="text-lg font-semibold text-white">{stage.data.label}</h3>
        <div className="flex items-center gap-2 mt-1">
          {metadata?.status && (
            <span className={`
              inline-block px-2 py-0.5 text-xs rounded
              ${metadata.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                metadata.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'}
            `}>
              {metadata.status}
            </span>
          )}
          {explanation?.is_shuffle_boundary && (
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">
              Shuffle
            </span>
          )}
          {explanation?.is_expensive && (
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
              Expensive
            </span>
          )}
        </div>
      </div>

      {/* Structured Explanation (Feature 2: Explanation Engine) */}
      {explanation && (
        <div className="space-y-3">
          {/* Observation - What happened */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">📊 Observation</div>
            <p className="text-sm text-slate-300">{explanation.observation}</p>
          </div>
          
          {/* Spark Rule - Why it exists */}
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <div className="text-xs text-blue-400 uppercase tracking-wide mb-1">⚙️ Spark Rule Involved</div>
            <p className="text-sm text-slate-300">{explanation.spark_rule}</p>
          </div>
          
          {/* Cost Driver - Why expensive (if applicable) */}
          {explanation.cost_driver && (
            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
              <div className="text-xs text-orange-400 uppercase tracking-wide mb-1">💰 Cost Driver</div>
              <p className="text-sm text-slate-300">{explanation.cost_driver}</p>
            </div>
          )}
        </div>
      )}

      {/* Metrics */}
      {metadata && (
        <div className="space-y-2">
          {metadata.num_tasks && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tasks</span>
              <span className="text-white">{metadata.num_tasks}</span>
            </div>
          )}
          {metadata.duration_ms && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Duration</span>
              <span className="text-white">{formatDuration(metadata.duration_ms)}</span>
            </div>
          )}
          {metadata.input_bytes && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Input</span>
              <span className="text-white">{formatBytes(metadata.input_bytes)}</span>
            </div>
          )}
          {(metadata.shuffle_write_bytes ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Shuffle Write</span>
              <span className="text-yellow-400">{formatBytes(metadata.shuffle_write_bytes!)}</span>
            </div>
          )}
          {(metadata.spill_bytes ?? 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Spill</span>
              <span className="text-red-400">{formatBytes(metadata.spill_bytes!)}</span>
            </div>
          )}
        </div>
      )}

      {/* Learning mode - additional explanation (fallback if no structured explanation) */}
      {learningMode && !explanation && metadata && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-xs text-blue-400 uppercase tracking-wide mb-1">Why This Stage</div>
          <p className="text-sm text-slate-300">
            {(metadata.shuffle_write_bytes ?? 0) > 0 
              ? 'This stage writes shuffle data, indicating a wide transformation (join, groupBy, repartition). Data is redistributed across the cluster.'
              : 'This stage performs narrow transformations. Data stays within partitions.'}
          </p>
        </div>
      )}

      {/* Related insights */}
      {stageInsights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Related Insights</h4>
          {stageInsights.map((insight, idx) => (
            <div 
              key={idx}
              className={`
                p-3 rounded-lg border
                ${insight.confidence === 'high' ? 'border-green-500/30 bg-green-500/5' :
                  insight.confidence === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-orange-500/30 bg-orange-500/5'}
              `}
            >
              <div className="text-sm text-white">{insight.title}</div>
              <div className="text-xs text-slate-400 mt-1">{insight.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
