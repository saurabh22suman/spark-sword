'use client';

/**
 * Insights Panel Component
 * 
 * Displays optimization insights with evidence, confidence levels,
 * and actionable suggestions.
 */

import { useState } from 'react';
import type { OptimizationInsight, InsightConfidence } from '@/types';

interface InsightsPanelProps {
  insights: OptimizationInsight[];
  onInsightClick?: (insight: OptimizationInsight) => void;
  className?: string;
}

const confidenceColors: Record<InsightConfidence, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const insightTypeIcons: Record<string, string> = {
  shuffle: '🔀',
  skew: '⚖️',
  join: '🔗',
  spill: '💾',
  broadcast: '📡',
  partition: '📦',
  default: '💡',
};

function InsightCard({ 
  insight, 
  isExpanded, 
  onToggle,
  onSelect,
}: { 
  insight: OptimizationInsight; 
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: () => void;
}) {
  const icon = insightTypeIcons[insight.type] || insightTypeIcons.default;
  const confidenceStyle = confidenceColors[insight.confidence];
  
  return (
    <div 
      className={`
        border border-slate-700 rounded-lg bg-slate-800/50 
        hover:bg-slate-800 transition-colors cursor-pointer
      `}
      onClick={onSelect}
    >
      {/* Header */}
      <div 
        className="flex items-start gap-3 p-4"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <span className="text-xl">{icon}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-white truncate">
              {insight.title}
            </h3>
            <span className={`px-2 py-0.5 text-xs rounded border ${confidenceStyle}`}>
              {insight.confidence}
            </span>
          </div>
          
          <p className="text-sm text-slate-400 line-clamp-2">
            {insight.description}
          </p>
        </div>
        
        <button 
          className="text-slate-400 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          {/* Evidence */}
          {insight.evidence.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Evidence
              </h4>
              <ul className="space-y-1">
                {insight.evidence.map((ev, idx) => (
                  <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-slate-600">•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Affected Stages */}
          {(insight.affected_stages?.length ?? 0) > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Affected Stages
              </h4>
              <div className="flex flex-wrap gap-2">
                {insight.affected_stages!.map((stageId) => (
                  <span 
                    key={stageId}
                    className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                  >
                    Stage {stageId}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Suggestions */}
          {insight.suggestions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Suggestions
              </h4>
              <ul className="space-y-2">
                {insight.suggestions.map((suggestion, idx) => (
                  <li 
                    key={idx} 
                    className="text-sm text-blue-400 flex items-start gap-2"
                  >
                    <span className="text-blue-500">→</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InsightsPanel({ 
  insights, 
  onInsightClick,
  className = '',
}: InsightsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<InsightConfidence | 'all'>('all');
  
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const filteredInsights = insights.filter(
    insight => filter === 'all' || insight.confidence === filter
  );
  
  // Count by confidence
  const counts = {
    all: insights.length,
    high: insights.filter(i => i.confidence === 'high').length,
    medium: insights.filter(i => i.confidence === 'medium').length,
    low: insights.filter(i => i.confidence === 'low').length,
  };
  
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Insights
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({filteredInsights.length})
          </span>
        </h2>
        
        {/* Filter buttons */}
        <div className="flex gap-1">
          {(['all', 'high', 'medium', 'low'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`
                px-2 py-1 text-xs rounded transition-colors
                ${filter === level 
                  ? 'bg-slate-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
              `}
            >
              {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
              <span className="ml-1 opacity-60">({counts[level]})</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Insights list */}
      {filteredInsights.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">🔍</div>
          <p>No insights found</p>
          {filter !== 'all' && (
            <button 
              onClick={() => setFilter('all')}
              className="mt-2 text-sm text-blue-400 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto">
          {filteredInsights.map((insight, index) => {
            const insightKey = insight.id ?? `insight-${index}`;
            return (
              <InsightCard
                key={insightKey}
                insight={insight}
                isExpanded={expandedIds.has(insightKey)}
                onToggle={() => toggleExpanded(insightKey)}
                onSelect={() => onInsightClick?.(insight)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InsightsPanel;
