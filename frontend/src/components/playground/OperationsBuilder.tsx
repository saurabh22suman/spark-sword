/**
 * Operations Chain Builder
 * 
 * Per dataframe-playground-spec.md Section 5.1-5.3:
 * - Common Operations (default): Filter, GroupBy, Join, Write
 * - Advanced Operations (expandable): Window, Distinct, Union, etc.
 * - Linear chain with reordering and deletion
 * 
 * Users build an operation chain: Read → Filter → GroupBy → Join → Write
 */

'use client';

import { useState, useCallback } from 'react';

export interface Operation {
  id: string;
  type: string;
  params: Record<string, number | string | boolean>;
}

interface OperationsBuilderProps {
  operations: Operation[];
  onChange: (operations: Operation[]) => void;
  onSelectOperation: (operation: Operation | null) => void;
  selectedOperationId: string | null;
  className?: string;
}

// Operation definitions
const COMMON_OPERATIONS = [
  { type: 'filter', label: 'Filter', icon: '🔍', color: 'green' },
  { type: 'groupby', label: 'GroupBy', icon: '📊', color: 'orange' },
  { type: 'join', label: 'Join', icon: '🔗', color: 'purple' },
  { type: 'write', label: 'Write', icon: '💾', color: 'pink' },
];

const ADVANCED_OPERATIONS = [
  { type: 'window', label: 'Window', icon: '🪟', color: 'cyan' },
  { type: 'distinct', label: 'Distinct', icon: '🎯', color: 'blue' },
  { type: 'union', label: 'Union', icon: '➕', color: 'green' },
  { type: 'repartition', label: 'Repartition', icon: '📦', color: 'yellow' },
  { type: 'coalesce', label: 'Coalesce', icon: '🔽', color: 'gray' },
  { type: 'cache', label: 'Cache', icon: '💎', color: 'blue' },
  { type: 'orderby', label: 'OrderBy', icon: '↕️', color: 'orange' },
];

// Default parameters for each operation type
const DEFAULT_PARAMS: Record<string, Record<string, number | string | boolean>> = {
  filter: { selectivity: 0.5 },
  groupby: { num_groups: 1000, partial_aggregation: true },
  join: { right_rows: 100000, join_type: 'inner', broadcast_threshold: 10485760 },
  write: { output_partitions: 200, file_size_target: 134217728 },
  window: { partition_columns: 1, has_order_by: true },
  distinct: { duplicates_ratio: 0.1 },
  union: { other_rows: 1000000 },
  repartition: { new_partitions: 200 },
  coalesce: { new_partitions: 50 },
  cache: { storage_level: 'MEMORY_ONLY' },
  orderby: {},
};

function generateId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function OperationsBuilder({
  operations,
  onChange,
  onSelectOperation,
  selectedOperationId,
  className = '',
}: OperationsBuilderProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addOperation = useCallback((type: string) => {
    const newOp: Operation = {
      id: generateId(),
      type,
      params: { ...DEFAULT_PARAMS[type] },
    };
    onChange([...operations, newOp]);
    onSelectOperation(newOp);
  }, [operations, onChange, onSelectOperation]);

  const removeOperation = useCallback((id: string) => {
    onChange(operations.filter(op => op.id !== id));
    if (selectedOperationId === id) {
      onSelectOperation(null);
    }
  }, [operations, onChange, selectedOperationId, onSelectOperation]);

  const moveOperation = useCallback((fromIndex: number, toIndex: number) => {
    const newOps = [...operations];
    const [removed] = newOps.splice(fromIndex, 1);
    newOps.splice(toIndex, 0, removed);
    onChange(newOps);
  }, [operations, onChange]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveOperation(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getOperationConfig = (type: string) => {
    return [...COMMON_OPERATIONS, ...ADVANCED_OPERATIONS].find(op => op.type === type);
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="operations-builder">
      {/* Operation chain */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-300">Operation Chain</h4>
          <span className="text-xs text-slate-500">{operations.length} operations</span>
        </div>

        {/* Chain visualization */}
        <div className="space-y-1">
          {/* Read node (always present) */}
          <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-sm">
            <span className="text-lg">📖</span>
            <span className="text-green-400 font-medium">Read</span>
            <span className="text-xs text-slate-500 ml-auto">Input DataFrame</span>
          </div>

          {/* Arrow */}
          {operations.length > 0 && (
            <div className="flex justify-center text-slate-500">↓</div>
          )}

          {/* Operations */}
          {operations.map((op, index) => {
            const config = getOperationConfig(op.type);
            const isSelected = selectedOperationId === op.id;
            const isDragging = draggedIndex === index;

            return (
              <div key={op.id}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectOperation(op)}
                  className={`
                    flex items-center gap-2 p-2 rounded text-sm cursor-pointer
                    transition-all border
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30' 
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }
                    ${isDragging ? 'opacity-50' : ''}
                  `}
                  data-testid={`chain-op-${op.type}`}
                >
                  <span className="cursor-grab text-slate-500">⋮⋮</span>
                  <span className="text-lg">{config?.icon || '⚙️'}</span>
                  <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {config?.label || op.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOperation(op.id);
                    }}
                    className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove operation"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Arrow between operations */}
                {index < operations.length - 1 && (
                  <div className="flex justify-center text-slate-500">↓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add operation buttons */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-400">Add Operation</h4>
        
        {/* Common operations - always visible */}
        <div className="grid grid-cols-2 gap-2">
          {COMMON_OPERATIONS.map((op) => (
            <button
              key={op.type}
              onClick={() => addOperation(op.type)}
              className="flex items-center gap-2 p-2 rounded border border-slate-700 bg-slate-800/50 
                         hover:border-slate-600 hover:bg-slate-800 transition-all text-left"
              data-testid={`add-${op.type}`}
            >
              <span className="text-lg">{op.icon}</span>
              <span className="text-sm text-slate-300">{op.label}</span>
            </button>
          ))}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          data-testid="toggle-advanced"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          <span>{showAdvanced ? 'Hide Advanced' : 'Show Advanced'}</span>
        </button>

        {/* Advanced operations - expandable */}
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2">
            {ADVANCED_OPERATIONS.map((op) => (
              <button
                key={op.type}
                onClick={() => addOperation(op.type)}
                className="flex items-center gap-2 p-2 rounded border border-slate-700/50 bg-slate-900/50 
                           hover:border-slate-600 hover:bg-slate-800/50 transition-all text-left"
                data-testid={`add-${op.type}`}
              >
                <span className="text-lg">{op.icon}</span>
                <span className="text-sm text-slate-400">{op.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OperationsBuilder;
