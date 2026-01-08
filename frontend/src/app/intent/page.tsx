'use client';

/**
 * Intent Page - Feature 5: Notebook Intent Extraction + Intent Graph UI
 * 
 * Per intent-graph-ui-spec.md:
 * - Makes inferred intent visible
 * - Allows users to confirm or correct assumptions
 * - Preserves trust through explicit uncertainty
 * - User edits assumptions, not behavior
 * 
 * Per Section 6: First-Time Confirmation is mandatory before simulation
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IntentGraph, NodeDetailsPanel } from '@/components/intent';
import type { InferredIntent, IntentGraphNode, EditableAssumptions } from '@/types';

export default function IntentPage() {
  const router = useRouter();
  const [intent, setIntent] = useState<InferredIntent | null>(null);
  const [selectedNode, setSelectedNode] = useState<IntentGraphNode | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number>(0);
  const [learningMode, setLearningMode] = useState(false);

  useEffect(() => {
    // Load learning mode preference
    const storedLearning = localStorage.getItem('learningMode');
    setLearningMode(storedLearning === 'true');
    
    // Load inferred intent from sessionStorage
    const stored = sessionStorage.getItem('inferredIntent');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setIntent(parsed);
        // Auto-select first node if available
        if (parsed.intent_graph && parsed.intent_graph.length > 0) {
          setSelectedNode(parsed.intent_graph[0]);
        }
        // Check if already confirmed
        setIsConfirmed(parsed.is_confirmed || false);
      } catch {
        router.push('/upload');
      }
    } else {
      router.push('/upload');
    }
  }, [router]);

  const handleConfirmIntent = () => {
    if (!intent) return;
    
    // Save confirmed state
    const confirmedIntent = { ...intent, is_confirmed: true };
    sessionStorage.setItem('inferredIntent', JSON.stringify(confirmedIntent));
    setIntent(confirmedIntent);
    setIsConfirmed(true);
  };

  const handleUpdateAssumptions = (nodeStep: number, assumptions: EditableAssumptions) => {
    if (!intent) return;
    
    // Update the intent graph node with new assumptions
    const updatedGraph = intent.intent_graph.map(node => {
      if (node.step === nodeStep) {
        return {
          ...node,
          details: {
            ...node.details,
            editable: assumptions,
          },
        };
      }
      return node;
    });
    
    const updatedIntent = {
      ...intent,
      intent_graph: updatedGraph,
      // Editing resets confirmation per spec
      is_confirmed: false,
    };
    
    sessionStorage.setItem('inferredIntent', JSON.stringify(updatedIntent));
    setIntent(updatedIntent);
    setIsConfirmed(false);
    
    // Update selected node
    const updatedNode = updatedGraph.find(n => n.step === nodeStep);
    if (updatedNode) {
      setSelectedNode(updatedNode);
    }
  };

  if (!intent) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔍</div>
          <p className="text-slate-400">Loading intent...</p>
        </div>
      </main>
    );
  }

  const shuffleOperations = intent.transformations.filter(t => t.causes_shuffle);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="inline-block mb-2">
              <h1 className="text-2xl font-bold">
                <span className="text-orange-500">Spark</span>
                <span className="text-yellow-500">-Sword</span>
              </h1>
            </Link>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">
                Intent
              </h2>
              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">
                Inferred • User Adjustable
              </span>
              {isConfirmed && (
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                  ✓ Confirmed
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <Link
              href="/upload"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
            >
              Upload New
            </Link>
            {isConfirmed ? (
              <Link
                href="/playground"
                className="px-4 py-2 bg-spark-orange hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Simulate →
              </Link>
            ) : (
              <button
                onClick={handleConfirmIntent}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                ✓ Confirm Intent
              </button>
            )}
          </div>
        </div>

        {/* Guidance banner per spec Section 3.2 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
          <p className="text-slate-300">
            <span className="text-lg mr-2">🧠</span>
            This is Spark-Sword&apos;s interpretation of your code. 
            <strong className="text-white"> Confirm or adjust assumptions</strong> below before simulation.
          </p>
          {learningMode && (
            <p className="text-sm text-slate-400 mt-2">
              💡 <strong>Learning Mode:</strong> The intent graph shows what Spark was asked to do. 
              Each node maps to a transformation that may cause shuffles, sorts, or other execution effects.
              Adjusting assumptions helps simulate &quot;what-if&quot; scenarios.
            </p>
          )}
        </div>

        {/* Summary */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
          <p className="text-slate-300">{intent.summary}</p>
          {shuffleOperations.length > 0 && (
            <p className="text-sm text-yellow-400 mt-2">
              ⚠️ {shuffleOperations.length} operation(s) may cause shuffle
            </p>
          )}
        </div>

        {/* Main Content: Intent Graph + Details */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Intent Graph Panel - Left/Center (2 cols) */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Intent Graph
            </h3>
            <IntentGraph
              nodes={intent.intent_graph || []}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              uncertainties={intent.uncertainties || []}
            />
          </div>

          {/* Details / Editor Panel - Right (1 col) */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Node Details
            </h3>
            {selectedNode ? (
              <NodeDetailsPanel
                node={selectedNode}
                onUpdateAssumptions={(assumptions) => 
                  handleUpdateAssumptions(selectedNode.step, assumptions)
                }
              />
            ) : (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-8 text-center">
                <p className="text-slate-400">Select a node to see details</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Gate Warning - per spec Section 6 */}
        {!isConfirmed && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl">ℹ️</span>
              <div>
                <p className="text-blue-400 font-medium">Confirmation Required</p>
                <p className="text-sm text-blue-300/80 mt-1">
                  Before running simulations, please review the intent graph above and click 
                  <strong> &quot;Confirm Intent&quot;</strong> to proceed. You can adjust assumptions before confirming.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Code Cells Section */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📝</span>
            Code Cells
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">
              {intent.code_cells.length}
            </span>
          </h3>

          {/* Cell Tabs */}
          {intent.code_cells.length > 1 && (
            <div className="flex gap-1 mb-4 flex-wrap">
              {intent.code_cells.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCell(idx)}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedCell === idx
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Cell {idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Code Display */}
          <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
            <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
              {intent.code_cells[selectedCell] || 'No code'}
            </pre>
          </div>
        </div>

        {/* Info Notices */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            💡 This is <strong>inferred intent</strong> from static code analysis. 
            No code was executed. Actual execution behavior depends on data shape and cluster configuration.
          </p>
          <p className="text-xs text-slate-600">
            Schema, row counts, and data sizes are intentionally not shown — 
            they cannot be inferred from code alone.
          </p>
        </div>
      </div>
    </main>
  );
}
