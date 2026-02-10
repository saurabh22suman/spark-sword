/**
 * Hover Synchronization Context
 * 
 * Provides a shared context for synchronizing hover states across
 * multiple visualizations (DAG, operation chain, partition bars).
 * 
 * This helps users understand connections between views.
 */

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface HoverState {
  operationId: string | null;
  dagNodeId: string | null;
  edgeType: 'normal' | 'shuffle' | 'broadcast' | null;
  partitionIndex: number | null;
}

interface HoverSyncContextValue {
  hoverState: HoverState;
  setHoveredOperation: (operationId: string | null) => void;
  setHoveredDagNode: (nodeId: string | null) => void;
  setHoveredEdge: (edgeType: HoverState['edgeType']) => void;
  setHoveredPartition: (index: number | null) => void;
  clearHover: () => void;
}

const HoverSyncContext = createContext<HoverSyncContextValue | null>(null);

export function HoverSyncProvider({ children }: { children: React.ReactNode }) {
  const [hoverState, setHoverState] = useState<HoverState>({
    operationId: null,
    dagNodeId: null,
    edgeType: null,
    partitionIndex: null,
  });

  const setHoveredOperation = useCallback((operationId: string | null) => {
    setHoverState(prev => ({
      ...prev,
      operationId,
      // Map operation to DAG node if known
      dagNodeId: operationId ? `dag-node-${operationId}` : null,
    }));
  }, []);

  const setHoveredDagNode = useCallback((nodeId: string | null) => {
    setHoverState(prev => ({
      ...prev,
      dagNodeId: nodeId,
      // Try to extract operation ID from node ID
      operationId: nodeId ? nodeId.replace('dag-node-', '') : null,
    }));
  }, []);

  const setHoveredEdge = useCallback((edgeType: HoverState['edgeType']) => {
    setHoverState(prev => ({
      ...prev,
      edgeType,
    }));
  }, []);

  const setHoveredPartition = useCallback((index: number | null) => {
    setHoverState(prev => ({
      ...prev,
      partitionIndex: index,
    }));
  }, []);

  const clearHover = useCallback(() => {
    setHoverState({
      operationId: null,
      dagNodeId: null,
      edgeType: null,
      partitionIndex: null,
    });
  }, []);

  return (
    <HoverSyncContext.Provider
      value={{
        hoverState,
        setHoveredOperation,
        setHoveredDagNode,
        setHoveredEdge,
        setHoveredPartition,
        clearHover,
      }}
    >
      {children}
    </HoverSyncContext.Provider>
  );
}

export function useHoverSync() {
  const context = useContext(HoverSyncContext);
  if (!context) {
    throw new Error('useHoverSync must be used within HoverSyncProvider');
  }
  return context;
}
