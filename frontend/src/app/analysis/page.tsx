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
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BarChart2, 
  Code2, 
  Cpu, 
  FileText, 
  Layers, 
  Layout, 
  Lightbulb, 
  Zap,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Server
} from 'lucide-react';

import { DAGVisualization } from '@/components/dag';
import { InsightsPanel } from '@/components/insights';
import { CodeMappingPanel, type TransformationMapping } from '@/components/codemapping';
import { BeforeAfterComparison } from '@/components/comparison';
import { StageTimeline, type StageTimelineData } from '@/components/timeline';
import { Card, CardContent, IconBox } from '@/components/ui';
import { cn } from '@/lib/utils';
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

function MetricCard({ label, value, unit, warning, icon: Icon }: { 
  label: string; 
  value: string | number; 
  unit?: string;
  warning?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <Card 
      hover
      variant={warning ? "bordered" : "default"}
      className={cn(
        warning && "border-yellow-500/50 bg-yellow-500/5"
      )}
    >
      <CardContent>
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
          {Icon && (
            <IconBox 
              icon={Icon as React.ElementType} 
              variant={warning ? "amber" : "blue"} 
              size="sm"
            />
          )}
        </div>
        <div className={cn(
          "text-2xl font-bold tracking-tight",
          warning ? "text-yellow-500" : "text-foreground"
        )}>
          {value}
          {unit && <span className="text-sm text-muted-foreground ml-1 font-normal">{unit}</span>}
        </div>
      </CardContent>
    </Card>
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-muted-foreground animate-pulse">Reconstructing execution graph...</div>
      </div>
    );
  }

  const { dag, insights, code_mappings, summary } = result;

  const tabs = [
    { id: 'dag', label: 'Flow Graph', icon: Layers },
    { id: 'code', label: 'Code Map', icon: Code2 },
    { id: 'insights', label: 'Insights', icon: Lightbulb },
    { id: 'compare', label: 'Compare', icon: Layout },
    { id: 'metrics', label: 'Metrics', icon: BarChart2 },
  ] as const;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Demo Mode Banner */}
        <AnimatePresence>
          {result.is_demo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-purple-500/10 border-b border-purple-500/20 backdrop-blur-sm"
            >
              <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎮</span>
                  <span className="text-purple-300 font-medium tracking-wide">
                    {result.demo_label || 'Demo Mode Active'}
                  </span>
                </div>
                <Link
                  href="/upload"
                  className="text-xs px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-md transition-all hover:scale-105"
                >
                  Upload Your Own →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
                  S
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  PrepRabbit
                </span>
              </Link>
              
              {/* Navigation Tabs */}
              <div className="hidden md:flex bg-muted/50 p-1 rounded-lg border border-border/50">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id as ViewMode)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all relative",
                      viewMode === tab.id
                        ? "text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {viewMode === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary rounded-md"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Learning Mode Toggle */}
              <label className={cn(
                "flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none",
                learningMode 
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
              )}>
                <input
                  type="checkbox"
                  checked={learningMode}
                  onChange={(e) => setLearningMode(e.target.checked)}
                  className="hidden"
                />
                <Lightbulb className={cn("w-4 h-4", learningMode ? "fill-current" : "")} />
                <span>Learning Mode</span>
              </label>
              
              <Link
                href="/upload"
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                New Analysis
              </Link>
            </div>
          </div>
        </header>

        {/* Global Summary Bar */}
        <div className="border-b border-border bg-muted/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-mono text-foreground font-medium bg-muted/50 px-2 py-0.5 rounded">
                  {formatDuration(summary.total_duration_ms)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Shuffle:</span>
                <span className={cn(
                  "font-mono font-medium px-2 py-0.5 rounded",
                  summary.total_shuffle_bytes > 0 ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"
                )}>
                  {formatBytes(summary.total_shuffle_bytes)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tasks:</span>
                <span className="font-mono text-foreground font-medium">
                  {summary.total_tasks.toLocaleString()}
                </span>
              </div>
              {summary.total_spill_bytes > 0 && (
                <div className="flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-500 font-medium">
                    Spill: {formatBytes(summary.total_spill_bytes)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="container mx-auto max-w-7xl h-full">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
            {viewMode === 'dag' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
                {/* DAG View */}
                <Card variant="default" className="lg:col-span-2 flex flex-col overflow-hidden h-[600px] lg:h-auto">
                  <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Execution Flow
                      </h2>
                      {learningMode && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nodes = Stages. Edges = Dependencies. <span className="text-red-400">Red edges</span> = Shuffles (costly data moves).
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 bg-gradient-to-br from-background to-muted/20 relative">
                     {/* 
                         In a real implementation, the DAG container needs explicit height. 
                         The component handles its own layout, we just provide the container.
                      */}
                    <DAGVisualization
                      data={dag}
                      onNodeClick={(nodeId) => setSelectedStageId(nodeId)}
                      selectedNodeId={selectedStageId ?? undefined}
                    />
                  </div>
                </Card>

                {/* Stage Details Panel */}
                <Card variant="default" className="overflow-hidden flex flex-col h-full lg:h-auto lg:max-h-[calc(100vh-250px)]">
                  <div className="p-4 border-b border-border bg-muted/10">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Stage Details
                    </h2>
                  </div>
                  <CardContent className="flex-1 overflow-y-auto">
                    {selectedStageId ? (
                      <StageDetails
                        stageId={selectedStageId}
                        dag={dag}
                        insights={insights}
                        stageExplanations={result.stage_explanations || []}
                        learningMode={learningMode}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Layers className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-foreground">No Stage Selected</p>
                        <p className="text-sm mt-2 max-w-xs">Click on any node in the graph to inspect its metrics, operations, and insights.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {viewMode === 'code' && (
              <Card variant="default" className="min-h-[600px]">
                <CardContent>
                  <CodeMappingPanel
                    mappings={code_mappings || []}
                    onStageClick={(stageId) => {
                      setSelectedStageId(String(stageId));
                      setViewMode('dag');
                    }}
                    selectedStageId={selectedStageId ? parseInt(selectedStageId) : null}
                    learningMode={learningMode}
                  />
                </CardContent>
              </Card>
            )}

            {viewMode === 'insights' && (
              <div className="h-full">
                <InsightsPanel
                  insights={insights}
                  onInsightClick={(insight) => {
                    if (insight.stage_id) {
                      setSelectedStageId(String(insight.stage_id));
                      setViewMode('dag');
                    }
                  }}
                />
              </div>
            )}

            {viewMode === 'compare' && (
              <Card variant="default">
                <CardContent>
                  <BeforeAfterComparison
                    currentMetrics={{
                      shuffleBytes: summary.total_shuffle_bytes,
                      spillBytes: summary.total_spill_bytes,
                      taskDurationMs: summary.total_duration_ms / Math.max(summary.total_tasks, 1),
                      partitions: summary.total_stages * 200, // Estimate based on default
                      stages: summary.total_stages,
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {viewMode === 'metrics' && (
              <div className="space-y-8 max-w-5xl mx-auto pb-12">
                {/* Overview Metrics */}
                <section>
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Overall Health
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard label="Total Jobs" value={summary.total_jobs} icon={Server} />
                    <MetricCard label="Total Stages" value={summary.total_stages} icon={Layers} />
                    <MetricCard label="Total Tasks" value={summary.total_tasks.toLocaleString()} icon={Cpu} />
                    <MetricCard label="Duration" value={formatDuration(summary.total_duration_ms)} icon={Clock} />
                  </div>
                </section>

                {/* Data Movement */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Database className="w-5 h-5 text-primary" />
                      Data Movement
                    </h2>
                    {learningMode && (
                      <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Shuffle = Network I/O. Spill = Disk I/O. Both slow.
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard 
                      label="Total Shuffle" 
                      value={formatBytes(summary.total_shuffle_bytes)}
                      warning={summary.total_shuffle_bytes > 10 * 1024 * 1024 * 1024}
                      icon={Zap}
                    />
                    <MetricCard 
                      label="Spill to Disk" 
                      value={formatBytes(summary.total_spill_bytes)}
                      warning={summary.total_spill_bytes > 0}
                      unit="wasted IO"
                      icon={AlertTriangle}
                    />
                    <MetricCard 
                      label="Avg Task Time" 
                      value={formatDuration(summary.total_duration_ms / Math.max(summary.total_tasks, 1))}
                      icon={Clock}
                    />
                  </div>
                </section>

                {/* Insights Summary */}
                <section>
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Optimization Opportunities
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
                </section>

                {/* Stage Timeline */}
                <section>
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Timeline Analysis
                  </h2>
                  <div className="bg-card rounded-xl border border-border p-6 shadow-sm overflow-x-auto">
                    <StageTimeline stages={stageTimelineData} />
                  </div>
                </section>
              </div>
            )}
            </motion.div>
          </div>
        </div>
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
    return <div className="text-muted-foreground p-4">Stage not found</div>;
  }

  // Find explanation for this stage
  const stageIdNum = parseInt(stageId.replace('stage_', ''), 10);
  const explanation = stageExplanations.find(e => e.stage_id === stageIdNum);
  
  const stageInsights = insights.filter(i => String(i.stage_id) === stageId);
  const metadata = stage.data.metadata;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      key={stageId} // Re-animate on stage change
      className="space-y-6"
    >
      {/* Stage header */}
      <div>
        <h3 className="text-xl font-bold break-words leading-tight">{stage.data.label}</h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {metadata?.status && (
            <span className={cn(
              "px-2.5 py-0.5 text-xs font-semibold rounded-full border",
              metadata.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                metadata.status === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            )}>
              {metadata.status.toUpperCase()}
            </span>
          )}
          {explanation?.is_shuffle_boundary && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              Shuffle Boundary
            </span>
          )}
          {explanation?.is_expensive && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              Expensive
            </span>
          )}
        </div>
      </div>

      {/* Structured Explanation (Feature 2: Explanation Engine) */}
      {explanation ? (
        <div className="space-y-3">
          {/* Observation */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Observation</div>
            </div>
            <p className="text-sm leading-relaxed">{explanation.observation}</p>
          </div>
          
          {/* Spark Rule */}
          <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <div className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Spark Logic</div>
            </div>
            <p className="text-sm text-foreground/90">{explanation.spark_rule}</p>
          </div>
          
          {/* Cost Driver */}
          {explanation.cost_driver && (
            <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <div className="text-xs text-orange-500 uppercase tracking-wider font-semibold">Cost Driver</div>
              </div>
              <p className="text-sm text-foreground/90">{explanation.cost_driver}</p>
            </div>
          )}
        </div>
      ) : learningMode && metadata ? (
        // Fallback for learning mode
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <div className="text-xs text-blue-500 uppercase tracking-wider font-semibold">Why This Stage Exists</div>
          </div>
          <p className="text-sm text-foreground/90">
            {(metadata.shuffle_write_bytes ?? 0) > 0 
              ? 'This stage ends with a shuffle, meaning data is being redistributed across the cluster for a wide transformation (like a join or aggregation).'
              : 'This stage consists of narrow transformations (like map or filter) where data can be processed without moving between nodes.'}
          </p>
        </div>
      ) : null}

      {/* Metrics Grid */}
      {metadata && (
        <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded border border-border">
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="text-lg font-mono font-medium">{formatDuration(metadata.duration_ms || 0)}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded border border-border">
              <div className="text-xs text-muted-foreground">Tasks</div>
              <div className="text-lg font-mono font-medium">{metadata.num_tasks}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded border border-border">
              <div className="text-xs text-muted-foreground">Input Data</div>
              <div className="text-lg font-mono font-medium">{formatBytes(metadata.input_bytes || 0)}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded border border-border">
              <div className="text-xs text-muted-foreground">Shuffle Write</div>
              <div className={cn("text-lg font-mono font-medium", (metadata.shuffle_write_bytes || 0) > 0 ? "text-yellow-500" : "")}>
                {formatBytes(metadata.shuffle_write_bytes || 0)}
              </div>
            </div>
            {(metadata.spill_bytes ?? 0) > 0 && (
              <div className="col-span-2 p-3 bg-red-500/10 rounded border border-red-500/20">
                <div className="text-xs text-red-400">Disk Spill (Performance Hit)</div>
                <div className="text-lg font-mono font-medium text-red-500">{formatBytes(metadata.spill_bytes!)}</div>
              </div>
            )}
        </div>
      )}

      {/* Related insights (Mini-cards) */}
      {stageInsights.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary" />
            Smart Hints
          </h4>
          {stageInsights.map((insight, idx) => {
            const colors = {
              high: "border-green-500/30 bg-green-500/5 text-green-500",
              medium: "border-yellow-500/30 bg-yellow-500/5 text-yellow-500",
              low: "border-orange-500/30 bg-orange-500/5 text-orange-500"
            };
            const borderColor = colors[insight.confidence as keyof typeof colors] || colors.low;
            
            return (
              <div key={idx} className={cn("p-3 rounded-lg border", borderColor)}>
                <div className="text-sm font-medium text-foreground">{insight.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-normal">{insight.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M9 3v4" />
      <path d="M3 5h4" />
      <path d="M3 9h4" />
    </svg>
  );
}
