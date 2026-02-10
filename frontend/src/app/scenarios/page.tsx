'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, BarChart2, Zap, Clock, AlertTriangle, Layers, ArrowRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, Badge, Button, PageHeader, PageContainer } from '@/components/ui';
import type { ScenarioSummary, ScenarioWithSimulation } from '@/types';
import { ScenarioDAG } from '@/components/scenarios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Utility functions - kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function LevelBadge({ level }: { level: string }) {
  const variants = {
    basic: 'success' as const,
    intermediate: 'warning' as const,
    advanced: 'danger' as const,
  };
  return (
    <Badge variant={variants[level as keyof typeof variants] || 'success'} size="sm">
      {level.toUpperCase()}
    </Badge>
  );
}

function ScenarioCard({ 
  scenario, 
  isSelected, 
  onClick 
}: { 
  scenario: ScenarioSummary; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <Card
        hover
        variant={isSelected ? "bordered" : "default"}
        className={cn(
          "text-left smooth-transition group card-hover shadow-md hover:shadow-xl",
          isSelected && "border-blue-500 glass glow-primary"
        )}
      >
        <CardContent className="flex flex-col gap-3">
      <div className="flex items-start justify-between w-full">
        <h3 className={cn(
          "font-bold text-lg",
          isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
        )}>
          {scenario.title}
        </h3>
        <LevelBadge level={scenario.level} />
      </div>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
        {scenario.real_world_context}
      </p>
      
      <div className="flex flex-wrap gap-2 mt-2">
        {scenario.spark_concepts.slice(0, 3).map((concept, i) => (
          <Badge key={i} variant="default" size="sm">
            {concept}
          </Badge>
        ))}
        {scenario.spark_concepts.length > 3 && (
             <span className="px-2 py-0.5 text-xs text-slate-400">+ {scenario.spark_concepts.length - 3}</span>
        )}
      </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}

function ScenarioDetail({ data }: { data: ScenarioWithSimulation }) {
  const { scenario, dag } = data;
  const [explanationRevealed, setExplanationRevealed] = useState(false);
  
  // Reset reveal state when scenario changes
  useEffect(() => {
    setExplanationRevealed(false);
  }, [scenario.id]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <Book className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-semibold text-blue-500 uppercase tracking-wide">Learner Scenario</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">{scenario.title}</h2>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
           <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>{scenario.level} Level</span>
           </div>
           <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>~5 min read</span>
           </div>
        </div>
      </div>

      {/* Story */}
      <Card variant="default" className="smooth-transition hover:shadow-lg">
        <CardContent>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="text-lg">📖</span> The Context
          </h3>
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-light">
            {scenario.story}
          </p>
        </CardContent>
      </Card>

      {/* Scenario DAG per scenario-dag-spec.md */}
      {dag && (
        <Card variant="default" className="relative overflow-hidden group smooth-transition hover:shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 smooth-transition" />
          <CardContent>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              Visual Execution Plan
            </h3>
            <ScenarioDAG dag={dag} />
          </CardContent>
        </Card>
      )}

      {/* Learning Goals */}
      {scenario.learning_goals && scenario.learning_goals.length > 0 && (
        <Card variant="gradient" className="bg-gradient-to-br from-blue-50 via-blue-100/30 to-purple-50/20 dark:from-blue-950/30 dark:via-blue-900/20 dark:to-purple-950/10 border-blue-200/50 dark:border-blue-800/30 shadow-lg smooth-transition hover:shadow-xl">
          <CardContent>
            <h3 className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Zap className="w-4 h-4" /> Learning Objectives
            </h3>
            <ul className="space-y-3">
              {scenario.learning_goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {i + 1}
                  </div>
                  <span className="leading-relaxed">{goal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Takeaways */}
      {scenario.key_takeaways && scenario.key_takeaways.length > 0 && (
        <Card variant="gradient" className="bg-gradient-to-br from-emerald-50 via-emerald-100/30 to-teal-50/20 dark:from-emerald-950/30 dark:via-emerald-900/20 dark:to-teal-950/10 border-emerald-200/50 dark:border-emerald-800/30 shadow-lg smooth-transition hover:shadow-xl">
          <CardContent>
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Key Takeaways — Remember These
            </h3>
            <ul className="space-y-3">
              {scenario.key_takeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{takeaway}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Common Mistakes */}
      {scenario.common_mistakes && scenario.common_mistakes.length > 0 && (
        <Card variant="gradient" className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-slate-900/50 border-red-200 dark:border-red-800/50">
          <CardContent>
            <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Common Mistakes — Avoid These
            </h3>
            <ul className="space-y-3">
              {scenario.common_mistakes.map((mistake, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <span className="text-red-400 dark:text-red-500 shrink-0 mt-0.5">✗</span>
                  <span className="leading-relaxed">{mistake}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Spark's Explanation - Per scenario-to-playground-bridge-spec Section 2 */}
      <Card variant="gradient" className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900/50 border-amber-200 dark:border-amber-800/50">
        <CardContent>
          <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> What Spark Does (And Why)
          </h3>
          
          {!explanationRevealed ? (
            <div className="text-center py-6">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Think about how Spark might execute this scenario before revealing the explanation.
              </p>
              <Button
                onClick={() => setExplanationRevealed(true)}
                variant="secondary"
                size="md"
                data-testid="reveal-explanation"
              >
                🔍 Reveal Explanation
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {scenario.explanation_goal}
              </p>
              {scenario.evidence_signals && scenario.evidence_signals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/50">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">Evidence signals:</p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    {scenario.evidence_signals.map((signal, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-amber-500">•</span> {signal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Try in Playground - Only shown after explanation revealed */}
      <AnimatePresence>
        {explanationRevealed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end pt-4"
          >
            <Link 
              href={`/playground?scenario=${scenario.id}`}
              className="inline-flex items-center px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1"
              data-testid="explore-playground"
            >
              Explore in Playground <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioWithSimulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch list on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/scenarios/list`)
      .then(res => res.json())
      .then(data => {
        setScenarios(data);
        if (data.length > 0) {
          setSelectedId(prev => prev ?? data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch scenarios:', err);
        setError('Failed to load scenarios. Please try again later.');
        setLoading(false);
      });
  }, []);

  // Fetch detail when selected
  useEffect(() => {
    if (!selectedId) return;
    
    // Scroll to top when scenario changes (especially for mobile)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    fetch(`${API_BASE}/api/scenarios/${selectedId}`)
      .then(res => res.json())
      .then(setSelectedScenario)
      .catch(console.error);
  }, [selectedId]);

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-screen">
             <div className="flex flex-col items-center gap-4">
                 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                 <p className="text-slate-500 animate-pulse">Loading scenarios...</p>
             </div>
        </div>
     );
  }

  if (error) {
     return (
        <div className="flex items-center justify-center min-h-screen">
             <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-center gap-4">
                 <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                 <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
             </div>
        </div>
     );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Learning Scenarios"
        description="Master Spark optimization patterns through real-world examples. From skew mitigation to join strategies, see the theory in action."
      />

      <div className="grid lg:grid-cols-12 gap-8">
          {/* List Sidebar — hidden on mobile when detail is showing */}
          <div className={cn(
            "lg:col-span-4 space-y-4",
            selectedScenario ? "hidden lg:block" : "block"
          )}>
             <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-2">
               Available Lessons
             </h2>
            <div className="space-y-3">
              {scenarios.map(s => (
                <ScenarioCard
                    key={s.id}
                    scenario={s}
                    isSelected={selectedId === s.id}
                    onClick={() => {
                        setSelectedId(s.id);
                        setSelectedScenario(null); // Clear while loading
                    }}
                />
              ))}
            </div>
          </div>

          {/* Detail View — on mobile, show back button */}
          <div className={cn(
            "lg:col-span-8",
            selectedScenario ? "block" : "hidden lg:block"
          )}>
            {/* Mobile back button */}
            {selectedScenario && (
              <button
                onClick={() => { setSelectedScenario(null); setSelectedId(null); }}
                className="lg:hidden flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Scenarios
              </button>
            )}
            <AnimatePresence mode="wait">
              {selectedScenario ? (
                <ScenarioDetail key={selectedScenario.scenario.id} data={selectedScenario} />
              ) : (
                <Card variant="default" className="h-60 sm:h-96 flex items-center justify-center border-dashed">
                  <CardContent className="text-center text-slate-400">
                    <BarChart2 className="w-10 h-10 mx-auto mb-4 opacity-50" />
                    <p>Loading scenario details...</p>
                  </CardContent>
                </Card>
              )}
            </AnimatePresence>
          </div>
        </div>
    </PageContainer>
  );
}
