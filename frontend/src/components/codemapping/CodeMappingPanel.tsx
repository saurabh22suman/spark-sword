'use client';

/**
 * Code Mapping Component
 * 
 * Shows the relationship between user code (transformations) and Spark stages.
 * Implements Phase 2 of work-ahead: Code ↔ Execution Mapping
 * 
 * "This line caused that stage."
 */

import { useState, useMemo } from 'react';

export interface CodeLocation {
  file_name: string;
  line_number: number;
  full_path: string | null;
}

export interface TransformationMapping {
  stage_id: number;
  stage_name: string;
  transformation_type: string;
  causes_shuffle: boolean;
  is_action: boolean;
  is_narrow: boolean;
  is_wide: boolean;
  num_tasks: number;
  parent_stage_ids: number[];
  location: CodeLocation | null;
}

interface CodeMappingPanelProps {
  mappings: TransformationMapping[];
  onStageClick?: (stageId: number) => void;
  selectedStageId?: number | null;
  learningMode?: boolean;
  className?: string;
}

// Group transformation types by category
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TRANSFORMATION_CATEGORIES: Record<string, string[]> = {
  'Narrow': ['map', 'filter', 'flatMap', 'mapPartitions', 'union', 'coalesce'],
  'Wide (Shuffle)': ['groupBy', 'reduceByKey', 'aggregateByKey', 'join', 'repartition', 'distinct', 'sort', 'sortBy', 'orderBy'],
  'Actions': ['action'],
};

// Icons for transformation types
const TRANSFORMATION_ICONS: Record<string, string> = {
  map: '🔄',
  filter: '🔍',
  flatMap: '📤',
  mapPartitions: '📦',
  union: '➕',
  coalesce: '📉',
  groupBy: '📊',
  reduceByKey: '📊',
  aggregateByKey: '📊',
  join: '🔗',
  repartition: '🔀',
  distinct: '✨',
  sort: '📝',
  sortBy: '📝',
  orderBy: '📝',
  action: '▶️',
  unknown: '❓',
};

function TransformationBadge({ type, causesShuffle }: { type: string; causesShuffle: boolean }) {
  const icon = TRANSFORMATION_ICONS[type] || TRANSFORMATION_ICONS.unknown;
  
  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
      ${causesShuffle 
        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
        : 'bg-green-500/20 text-green-400 border border-green-500/30'}
    `}>
      <span>{icon}</span>
      {type}
      {causesShuffle && <span className="ml-1">⚡</span>}
    </span>
  );
}

function MappingCard({
  mapping,
  isSelected,
  onClick,
  learningMode,
}: {
  mapping: TransformationMapping;
  isSelected: boolean;
  onClick: () => void;
  learningMode: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-lg border transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Stage name */}
          <div className="font-medium text-white truncate">
            Stage {mapping.stage_id}
          </div>
          
          {/* Code location */}
          {mapping.location ? (
            <div className="text-sm text-blue-400 font-mono mt-1">
              {mapping.location.file_name}:{mapping.location.line_number}
            </div>
          ) : (
            <div className="text-sm text-slate-500 mt-1">
              No code location available
            </div>
          )}
          
          {/* Stage name (full) */}
          <div className="text-xs text-slate-500 mt-1 truncate" title={mapping.stage_name}>
            {mapping.stage_name}
          </div>
        </div>

        {/* Transformation badge */}
        <TransformationBadge 
          type={mapping.transformation_type} 
          causesShuffle={mapping.causes_shuffle}
        />
      </div>

      {/* Task info */}
      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span>{mapping.num_tasks} tasks</span>
        {mapping.parent_stage_ids.length > 0 && (
          <span>← depends on Stage {mapping.parent_stage_ids.join(', ')}</span>
        )}
      </div>

      {/* Learning mode explanation */}
      {learningMode && (
        <div className="mt-3 p-2 bg-slate-900/50 rounded text-xs text-slate-400">
          {mapping.causes_shuffle ? (
            <>
              <span className="text-yellow-400 font-medium">Wide transformation: </span>
              This operation requires shuffling data across the cluster. All data with the same key 
              must be co-located on the same partition.
            </>
          ) : mapping.is_action ? (
            <>
              <span className="text-blue-400 font-medium">Action: </span>
              This triggers the actual computation. Spark executes all preceding transformations.
            </>
          ) : (
            <>
              <span className="text-green-400 font-medium">Narrow transformation: </span>
              This operation works within each partition independently. No data movement required.
            </>
          )}
        </div>
      )}
    </button>
  );
}

function CodeFlowVisualization({ mappings }: { mappings: TransformationMapping[] }) {
  // Group by file for visualization
  const byFile = useMemo(() => {
    const grouped: Record<string, TransformationMapping[]> = {};
    mappings.forEach(m => {
      const file = m.location?.file_name || 'Unknown';
      if (!grouped[file]) grouped[file] = [];
      grouped[file].push(m);
    });
    // Sort by line number within each file
    Object.values(grouped).forEach(list => {
      list.sort((a, b) => (a.location?.line_number || 0) - (b.location?.line_number || 0));
    });
    return grouped;
  }, [mappings]);

  return (
    <div className="space-y-4">
      {Object.entries(byFile).map(([fileName, fileMappings]) => (
        <div key={fileName} className="bg-slate-800/30 rounded-lg overflow-hidden">
          {/* File header */}
          <div className="px-4 py-2 bg-slate-700/50 border-b border-slate-600">
            <span className="font-mono text-sm text-slate-300">📄 {fileName}</span>
          </div>
          
          {/* Lines */}
          <div className="p-4 space-y-2">
            {fileMappings.map((m, _idx) => (
              <div key={m.stage_id} className="flex items-center gap-3">
                {/* Line number */}
                <span className="w-12 text-right font-mono text-xs text-slate-500">
                  {m.location?.line_number || '?'}
                </span>
                
                {/* Connection line */}
                <div className="flex-1 flex items-center">
                  <div className={`
                    flex-1 h-0.5 
                    ${m.causes_shuffle ? 'bg-red-500/50' : 'bg-green-500/50'}
                  `} />
                  <div className={`
                    w-2 h-2 rounded-full
                    ${m.causes_shuffle ? 'bg-red-500' : 'bg-green-500'}
                  `} />
                </div>
                
                {/* Stage info */}
                <div className="flex items-center gap-2">
                  <TransformationBadge 
                    type={m.transformation_type} 
                    causesShuffle={m.causes_shuffle}
                  />
                  <span className="text-xs text-slate-400">
                    → Stage {m.stage_id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CodeMappingPanel({
  mappings,
  onStageClick,
  selectedStageId,
  learningMode = false,
  className = '',
}: CodeMappingPanelProps) {
  const [viewType, setViewType] = useState<'list' | 'flow'>('list');
  const [filterType, setFilterType] = useState<'all' | 'shuffle' | 'narrow'>('all');

  // Filter mappings
  const filteredMappings = useMemo(() => {
    let result = [...mappings];
    
    if (filterType === 'shuffle') {
      result = result.filter(m => m.causes_shuffle);
    } else if (filterType === 'narrow') {
      result = result.filter(m => m.is_narrow);
    }
    
    return result;
  }, [mappings, filterType]);

  // Summary stats
  const stats = useMemo(() => ({
    total: mappings.length,
    shuffles: mappings.filter(m => m.causes_shuffle).length,
    narrow: mappings.filter(m => m.is_narrow).length,
    withLocation: mappings.filter(m => m.location !== null).length,
  }), [mappings]);

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Code → Execution Mapping</h2>
          
          {/* View toggle */}
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewType('list')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors
                ${viewType === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewType('flow')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors
                ${viewType === 'flow' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Flow
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: `All (${stats.total})` },
            { id: 'shuffle', label: `Shuffles (${stats.shuffles})` },
            { id: 'narrow', label: `Narrow (${stats.narrow})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as typeof filterType)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors
                ${filterType === f.id 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-500 hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Learning mode explanation */}
      {learningMode && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-sm text-blue-400">
            <strong>Understanding Code-to-Stage Mapping:</strong>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Each transformation in your code creates one or more Spark stages. 
            <span className="text-red-400"> Red badges</span> indicate wide transformations that cause shuffles (expensive network data movement).
            <span className="text-green-400"> Green badges</span> are narrow transformations that work within partitions (fast).
          </p>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex gap-4 mb-4 text-xs text-slate-500">
        <span>{stats.total} stages</span>
        <span>•</span>
        <span className="text-red-400">{stats.shuffles} shuffle boundaries</span>
        <span>•</span>
        <span className="text-green-400">{stats.narrow} narrow transforms</span>
        <span>•</span>
        <span>{stats.withLocation} with code location</span>
      </div>

      {/* Content */}
      {viewType === 'list' ? (
        <div className="space-y-2">
          {filteredMappings.map(mapping => (
            <MappingCard
              key={mapping.stage_id}
              mapping={mapping}
              isSelected={selectedStageId === mapping.stage_id}
              onClick={() => onStageClick?.(mapping.stage_id)}
              learningMode={learningMode}
            />
          ))}
          {filteredMappings.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No stages match the current filter
            </div>
          )}
        </div>
      ) : (
        <CodeFlowVisualization mappings={filteredMappings} />
      )}
    </div>
  );
}

export default CodeMappingPanel;
