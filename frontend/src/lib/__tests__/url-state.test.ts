/**
 * Unit Tests for URL State Management
 * 
 * Tests the shareable playground state system (Regex101 pattern):
 * - State encoding/decoding
 * - URL-safe format
 * - State restoration
 * - Error handling for malformed URLs
 */

import { describe, it, expect } from 'vitest';
import {
  encodePlaygroundState,
  decodePlaygroundState,
  type PlaygroundState,
} from '@/lib/url-state';

describe('URL State Management', () => {
  const validState: PlaygroundState = {
    shape: {
      totalSizeBytes: 500_000_000,
      avgRowSizeBytes: 500,
      rows: 1_000_000,
      partitions: 200,
      skewFactor: 1.0,
    },
    operations: [
      {
        id: 'filter-1',
        type: 'filter',
        params: { selectivity: 0.5 },
      },
      {
        id: 'groupby-1',
        type: 'groupby',
        params: { numGroups: 100 },
      },
    ],
    mode: 'learning',
  };

  describe('encodePlaygroundState', () => {
    it('encodes state to URL-safe string', () => {
      const encoded = encodePlaygroundState(validState);
      
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      
      // Should not contain URL-unsafe characters
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('produces compact representation', () => {
      const encoded = encodePlaygroundState(validState);
      
      // Encoded state should be smaller than JSON
      const jsonLength = JSON.stringify(validState).length;
      expect(encoded.length).toBeLessThan(jsonLength);
    });

    it('handles empty operations', () => {
      const stateWithNoOps: PlaygroundState = {
        ...validState,
        operations: [],
      };

      const encoded = encodePlaygroundState(stateWithNoOps);
      expect(encoded).toBeDefined();
    });
  });

  describe('decodePlaygroundState', () => {
    it('decodes encoded state correctly', () => {
      const encoded = encodePlaygroundState(validState);
      const decoded = decodePlaygroundState(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded).toEqual(validState);
    });

    it('restores shape properties', () => {
      const encoded = encodePlaygroundState(validState);
      const decoded = decodePlaygroundState(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.shape.rows).toBe(validState.shape.rows);
      expect(decoded!.shape.partitions).toBe(validState.shape.partitions);
      expect(decoded!.shape.avgRowSizeBytes).toBe(validState.shape.avgRowSizeBytes);
    });

    it('restores operations array', () => {
      const encoded = encodePlaygroundState(validState);
      const decoded = decodePlaygroundState(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.operations).toHaveLength(validState.operations.length);
      expect(decoded!.operations[0]).toEqual(validState.operations[0]);
      expect(decoded!.operations[1]).toEqual(validState.operations[1]);
    });

    it('returns null for malformed input', () => {
      const result = decodePlaygroundState('invalid-base64!!!');
      expect(result).toBeNull();
    });

    it('returns null for corrupted data', () => {
      const result = decodePlaygroundState('QVFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVFBQVFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQVFBQUFBQVFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFB');
      expect(result).toBeNull();
    });
  });

  describe('Round-trip encoding', () => {
    it('preserves state through encode-decode cycle', () => {
      const states = [
        validState,
        {
          ...validState,
          operations: [
            { type: 'filter', selectivity: 0.1 },
            { type: 'join', rightRows: 1000, joinType: 'inner' },
            { type: 'groupby', numGroups: 500 },
          ],
        },
        {
          ...validState,
          shape: { rows: 500_000_000, partitions: 1000, avgRowSizeBytes: 2000 },
        },
      ];

      states.fid: 'filter-1', type: 'filter', params: { selectivity: 0.1 } },
            { id: 'join-1', type: 'join', params: { rightRows: 1000, joinType: 'inner' } },
            { id: 'groupby-1', type: 'groupby', params: { numGroups: 500 } },
          ],
        },
        {
          ...validState,
          shape: { 
            totalSizeBytes: 1_000_000_000,
            avgRowSizeBytes: 2000,
            rows: 500_000,
            partitions: 1000, 
            skewFactor: 2.5,
          },
        },
      ];

      states.forEach((state) => {
        const encoded = encodePlaygroundState(state);
        const decoded = decodePlaygroundState(encoded);
        expect(decoded).toEqual(state);
      });
    });

    it('handles large operation chains', () => {
      const largeState: PlaygroundState = {
        ...validState,
        operations: Array(20)
          .fill(null)
          .map((_, i) => ({
            id: `op-${i}`,
            type: i % 2 === 0 ? 'filter' : 'groupby',
            params: i % 2 === 0 
              ? { selectivity: 0.5 } 
              : { numGroups: 100 },
          })),
      };

      const encoded = encodePlaygroundState(largeState);
      const decoded = decodePlaygroundState(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!.operations).toHaveLength(20);
      expect(decoded).toEqual(largeState);
    });
  });

  describe('Edge cases', () => {
    it('handles zero values', () => {
      const zeroState: PlaygroundState = {
        shape: { 
          totalSizeBytes: 0,
          avgRowSizeBytes: 0,
          rows: 0, 
          partitions: 0, 
          skewFactor: 0,
        },
        operations: [],
      };

      const encoded = encodePlaygroundState(zeroState);
      const decoded = decodePlaygroundState(encoded);

      expect(decoded).toEqual(zeroState);
    });

    it('handles very large numbers', () => {
      const largeState: PlaygroundState = {
        ...validState,
        shape: {
          totalSizeBytes: Number.MAX_SAFE_INTEGER,
          avgRowSizeBytes: 1000000,
          rows: Number.MAX_SAFE_INTEGER,
          partitions: 100000,
          skewFactor: 10.0,
        },
      };

      const encoded = encodePlaygroundState(largeState);
      const decoded = decodePlaygroundState(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded!