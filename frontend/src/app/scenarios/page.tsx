'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ScenarioSummary, ScenarioWithSimulation } from '@/types';
import { ScenarioDAG } from '@/components/scenarios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function LevelBadge({ level }: { level: string }) {
  const colors = {
    basic: 'bg-green-500/20 text-green-400 border-green-500/50',
    intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    advanced: 'bg-red-500/20 text-red-400 border-red-500/50',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[level as keyof typeof colors] || colors.basic}`}>
      {level.toUpperCase()}
    </span>
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
    <button
      onClick={onClick}
      data-testid="scenario-card"
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isSelected 
          ? 'border-spark-orange bg-spark-orange/10' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white">{scenario.title}</h3>
        <LevelBadge level={scenario.level} />
      </div>
      <p className="text-sm text-slate-400 mb-3">{scenario.real_world_context}</p>
      <div className="flex flex-wrap gap-1">
        {scenario.spark_concepts.map((concept, i) => (
          <span 
            key={i}
            className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded"
          >
            {concept}
          </span>
        ))}
      </div>
    </button>
  );
}

function ScenarioDetail({ data }: { data: ScenarioWithSimulation }) {
  const { scenario, simulation, dag } = data;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-white">{scenario.title}</h2>
          <LevelBadge level={scenario.level} />
        </div>
        <p className="text-slate-400">{scenario.real_world_context}</p>
      </div>

      {/* Story */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          📖 Story
        </h3>
        <p className="text-slate-300">{scenario.story}</p>
      </div>

      {/* Scenario DAG per scenario-dag-spec.md */}
      {dag && (
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <ScenarioDAG dag={dag} />
        </div>
      )}

      {/* Operations */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Code Pattern
        </h3>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
          {scenario.logical_operations.map((op, i) => (
            <div key={i} className="text-green-400">
              {op}
            </div>
          ))}
        </div>
      </div>

      {/* Expected Behavior */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <div className="text-3xl font-bold text-white">{scenario.expected_stages}</div>
          <div className="text-sm text-slate-400">Stages</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <div className="text-3xl font-bold text-white">{scenario.expected_shuffles}</div>
          <div className="text-sm text-slate-400">Shuffles</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <div className={`text-3xl font-bold ${scenario.expected_skew ? 'text-red-400' : 'text-green-400'}`}>
            {scenario.expected_skew ? 'Yes' : 'No'}
          </div>
          <div className="text-sm text-slate-400">Skew</div>
        </div>
      </div>

      {/* Simulation Preview */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-spark-yellow uppercase tracking-wide mb-3">
          ⚡ Simulation Preview
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-slate-400">Shuffle Bytes</div>
            <div className="text-xl font-semibold text-white">{formatBytes(simulation.shuffle_bytes)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Task Time Range</div>
            <div className="text-xl font-semibold text-white">
              {formatMs(simulation.estimated_min_task_ms)} - {formatMs(simulation.estimated_max_task_ms)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-slate-500 uppercase">Spark Path</div>
            <p className="text-sm text-slate-300">{simulation.spark_path_explanation}</p>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase">Dominant Factor</div>
            <p className="text-sm text-slate-300">{simulation.dominant_factor}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-slate-500">Confidence:</span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            simulation.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
            simulation.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {simulation.confidence}
          </span>
        </div>
      </div>

      {/* Evidence Signals */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
          🔍 Evidence Signals
        </h3>
        <ul className="space-y-1">
          {scenario.evidence_signals.map((signal, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-spark-orange mt-0.5">•</span>
              {signal}
            </li>
          ))}
        </ul>
      </div>

      {/* Learning Goal */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/30">
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">
          🎯 What You'll Learn
        </h3>
        <p className="text-slate-300">{scenario.explanation_goal}</p>
      </div>

      {/* Action Button */}
      <Link
        href={`/playground?scenario=${scenario.id}`}
        className="block w-full text-center bg-spark-orange hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
      >
        Open in Playground →
      </Link>
    </div>
  );
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioWithSimulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all scenarios on mount
  useEffect(() => {
    async function fetchScenarios() {
      try {
        const response = await fetch(`${API_BASE}/scenarios/`);
        if (!response.ok) throw new Error('Failed to fetch scenarios');
        const data = await response.json();
        setScenarios(data);
        // Auto-select first scenario
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchScenarios();
  }, []);

  // Fetch selected scenario details
  useEffect(() => {
    if (!selectedId) return;
    
    async function fetchScenarioDetail() {
      try {
        const response = await fetch(`${API_BASE}/scenarios/${selectedId}`);
        if (!response.ok) throw new Error('Failed to fetch scenario');
        const data = await response.json();
        setSelectedScenario(data);
      } catch (err) {
        console.error('Error fetching scenario:', err);
      }
    }
    fetchScenarioDetail();
  }, [selectedId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading scenarios...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              ← Back
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Real-Life Scenarios</h1>
          <p className="text-slate-400 max-w-2xl">
            Learn Spark internals through practical examples. Each scenario teaches a specific concept
            with simulated execution data and evidence-based insights.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scenario List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Select a Scenario
            </h2>
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isSelected={scenario.id === selectedId}
                onClick={() => setSelectedId(scenario.id)}
              />
            ))}
          </div>

          {/* Scenario Detail */}
          <div className="lg:col-span-2">
            {selectedScenario ? (
              <ScenarioDetail data={selectedScenario} />
            ) : (
              <div className="text-slate-400 text-center py-12">
                Select a scenario to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
