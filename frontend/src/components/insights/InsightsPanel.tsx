'use client';

/**
 * Insights Panel Component
 * 
 * Displays optimization insights with evidence, confidence levels,
 * and actionable suggestions.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  ArrowRight, 
  ChevronDown, 
  Database, 
  Layout, 
  Lightbulb, 
  Network, 
  Search, 
  Server, 
  Shuffle, 
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptimizationInsight, InsightConfidence } from '@/types';

interface InsightsPanelProps {
  insights: OptimizationInsight[];
  onInsightClick?: (insight: OptimizationInsight) => void;
  className?: string;
}

const confidenceConfig: Record<InsightConfidence, { bg: string, text: string, border: string, icon: React.ElementType }> = {
  high: { 
    bg: 'bg-green-500/10', 
    text: 'text-green-600 dark:text-green-400', 
    border: 'border-green-500/20',
    icon: CheckCircle2
  },
  medium: { 
    bg: 'bg-yellow-500/10', 
    text: 'text-yellow-600 dark:text-yellow-400', 
    border: 'border-yellow-500/20',
    icon: AlertTriangle
  },
  low: { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-600 dark:text-orange-400', 
    border: 'border-orange-500/20',
    icon: Info
  },
};

const insightTypeIcons: Record<string, React.ElementType> = {
  shuffle: Shuffle,
  skew: Layout,
  join: Network,
  spill: Database,
  broadcast: Server,
  partition: Layout,
  default: Lightbulb,
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
  const Icon = insightTypeIcons[insight.type] || insightTypeIcons.default;
  const config = confidenceConfig[insight.confidence];
  const ConfidenceIcon = config.icon;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group border rounded-xl overflow-hidden transition-all duration-200",
        "bg-card hover:bg-muted/50 hover:shadow-md",
        "border-border hover:border-primary/20",
        isExpanded ? "ring-2 ring-primary/20 border-primary shadow-sm" : ""
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div 
        className="flex items-start gap-4 p-4 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <div className={cn("p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground transition-colors")}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-base font-semibold text-foreground truncate max-w-full">
              {insight.title}
            </h3>
            <span className={cn(
              "px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full border flex items-center gap-1",
              config.bg, config.text, config.border
            )}>
              <ConfidenceIcon className="w-3 h-3" />
              {insight.confidence}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {insight.description}
          </p>
        </div>
        
        <button 
          className={cn(
            "p-1 rounded hover:bg-muted transition-all duration-200 text-muted-foreground",
            isExpanded ? "rotate-180 text-foreground" : ""
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      
      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-muted/30"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border">
              <div className="grid gap-4 pt-4">
                {/* Evidence */}
                {insight.evidence.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                       <Search className="w-3 h-3" /> Evidence
                    </h4>
                    <ul className="space-y-1.5 pl-2">
                      {insight.evidence.map((ev, idx) => (
                        <li key={idx} className="text-sm text-foreground/90 flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Affected Stages */}
                {(insight.affected_stages?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Affected Stages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insight.affected_stages!.map((stageId) => (
                        <span 
                          key={stageId}
                          className="px-2.5 py-1 bg-background border border-border rounded text-xs font-mono font-medium text-foreground transition-colors hover:border-primary/50"
                        >
                          Stage {stageId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Suggestions */}
                {insight.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="w-3 h-3" /> Suggestion
                    </h4>
                    <ul className="space-y-2 bg-background border border-border/50 rounded-lg p-3">
                      {insight.suggestions.map((suggestion, idx) => (
                        <li 
                          key={idx} 
                          className="text-sm text-foreground flex items-start gap-3"
                        >
                          <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  
  // Count by confidence - used for potential filter badge display
  const _counts = {
    all: insights.length,
    high: insights.filter(i => i.confidence === 'high').length,
    medium: insights.filter(i => i.confidence === 'medium').length,
    low: insights.filter(i => i.confidence === 'low').length,
  };
  void _counts; // Silence unused warning, kept for potential future use
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Insights
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {filteredInsights.length}
          </span>
        </h2>
        
        {/* Filter buttons */}
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
          {(['all', 'high', 'medium', 'low'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                filter === level 
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border" 
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              )}
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                level === 'all' && "bg-slate-400",
                level === 'high' && "bg-green-500",
                level === 'medium' && "bg-yellow-500",
                level === 'low' && "bg-orange-500"
              )} />
              {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Insights list */}
      {filteredInsights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-6 h-6 opacity-50" />
          </div>
          <p className="font-medium">No insights found</p>
          <p className="text-sm mt-1">Try adjusting the filters</p>
          {filter !== 'all' && (
            <button 
              onClick={() => setFilter('all')}
              className="mt-4 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-2 pb-4">
          <AnimatePresence mode="popLayout">
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
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default InsightsPanel;
