/**
 * Unit Tests for HoverSyncContext
 * 
 * Tests the multi-view hover synchronization system:
 * - Context provider setup
 * - Hook usage validation  
 * - Hover state propagation
 * - Multi-view coordination
 */

import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { HoverSyncProvider, useHoverSync } from '../HoverSyncContext';

describe('HoverSyncContext', () => {
  describe('useHoverSync hook', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useHoverSync());
      }).toThrow('useHoverSync must be used within HoverSyncProvider');

      consoleSpy.mockRestore();
    });

    it('provides hover sync context when used inside provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result } = renderHook(() => useHoverSync(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.hoveredOperation).toBeNull();
      expect(result.current.hoveredPartition).toBeNull();
      expect(result.current.hoveredStage).toBeNull();
    });
  });

  describe('Hover state management', () => {
    it('updates operation hover state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result } = renderHook(() => useHoverSync(), { wrapper });

      act(() => {
        result.current.setHoveredOperation('filter-1');
      });

      expect(result.current.hoveredOperation).toBe('filter-1');
    });

    it('updates partition hover state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result } = renderHook(() => useHoverSync(), { wrapper });

      act(() => {
        result.current.setHoveredPartition(5);
      });

      expect(result.current.hoveredPartition).toBe(5);
    });

    it('updates stage hover state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result } = renderHook(() => useHoverSync(), { wrapper });

      act(() => {
        result.current.setHoveredStage('stage-2');
      });

      expect(result.current.hoveredStage).toBe('stage-2');
    });

    it('clears hover state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result } = renderHook(() => useHoverSync(), { wrapper });

      // Set multiple hover states
      act(() => {
        result.current.setHoveredOperation('filter-1');
        result.current.setHoveredPartition(3);
        result.current.setHoveredStage('stage-1');
      });

      // Clear all
      act(() => {
        result.current.clearHover();
      });

      expect(result.current.hoveredOperation).toBeNull();
      expect(result.current.hoveredPartition).toBeNull();
      expect(result.current.hoveredStage).toBeNull();
    });

    it('supports independent hover state updates', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result } = renderHook(() => useHoverSync(), { wrapper });

      act(() => {
        result.current.setHoveredOperation('filter-1');
      });

      expect(result.current.hoveredOperation).toBe('filter-1');
      expect(result.current.hoveredPartition).toBeNull();
      expect(result.current.hoveredStage).toBeNull();

      act(() => {
        result.current.setHoveredPartition(2);
      });

      expect(result.current.hoveredOperation).toBe('filter-1');
      expect(result.current.hoveredPartition).toBe(2);
      expect(result.current.hoveredStage).toBeNull();
    });
  });

  describe('Multi-view coordination', () => {
    it('syncs hover state across multiple hooks', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HoverSyncProvider>{children}</HoverSyncProvider>
      );

      const { result: result1 } = renderHook(() => useHoverSync(), { wrapper });
      const { result: result2 } = renderHook(() => useHoverSync(), { wrapper });

      // Update from first hook
      act(() => {
        result1.current.setHoveredOperation('join-1');
      });

      // Should be visible in second hook
      expect(result2.current.hoveredOperation).toBe('join-1');

      // Update from second hook
      act(() => {
        result2.current.setHoveredPartition(10);
      });

      // Should be visible in first hook
      expect(result1.current.hoveredPartition).toBe(10);
    });
  });
});
