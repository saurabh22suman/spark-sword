/**
 * URL State Management for Playground
 * 
 * Enables zero-friction sharing of playground configurations via URL
 * (Regex101 pattern from enhancement plan).
 * 
 * Encoding strategy:
 * - Compress to URL-safe base64
 * - Validate on decode to prevent malformed states
 * - Graceful degradation if decode fails
 */

export interface DataShape {
  totalSizeBytes: number;
  avgRowSizeBytes: number;
  rows: number;
  partitions: number;
  skewFactor: number;
}

export interface Operation {
  id: string;
  type: string;
  params: Record<string, number | string | boolean>;
}

export interface PlaygroundState {
  shape: DataShape;
  operations: Operation[];
  mode?: 'learning' | 'expert';
  scenarioId?: string;
}

/**
 * Encode playground state into URL-safe string.
 * 
 * @param state - Complete playground state
 * @returns Base64-encoded, URL-safe string
 */
export function encodePlaygroundState(state: PlaygroundState): string {
  try {
    const json = JSON.stringify(state);
    
    // Use btoa for browser-native base64 encoding
    const base64 = typeof window !== 'undefined' 
      ? btoa(json)
      : Buffer.from(json).toString('base64');
    
    // Make URL-safe by replacing characters
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // Remove padding
  } catch (error) {
    console.error('Failed to encode playground state:', error);
    return '';
  }
}

/**
 * Decode URL-safe string into playground state.
 * 
 * @param encoded - Base64-encoded state string
 * @returns Parsed playground state or null if invalid
 */
export function decodePlaygroundState(encoded: string): PlaygroundState | null {
  try {
    // Restore base64 characters
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    
    // Decode base64
    const json = typeof window !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString();
    
    const state = JSON.parse(json) as PlaygroundState;
    
    // Validate structure
    if (!isValidPlaygroundState(state)) {
      console.warn('Invalid playground state structure');
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to decode playground state:', error);
    return null;
  }
}

/**
 * Validate playground state structure.
 * 
 * @param state - Alleged playground state
 * @returns True if valid structure
 */
function isValidPlaygroundState(state: any): state is PlaygroundState {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  // Check shape exists and has required fields
  if (!state.shape || typeof state.shape !== 'object') {
    return false;
  }
  
  const shape = state.shape;
  if (
    typeof shape.totalSizeBytes !== 'number' ||
    typeof shape.avgRowSizeBytes !== 'number' ||
    typeof shape.partitions !== 'number'
  ) {
    return false;
  }
  
  // Check operations is array
  if (!Array.isArray(state.operations)) {
    return false;
  }
  
  // Validate each operation has type
  for (const op of state.operations) {
    if (!op || typeof op !== 'object' || typeof op.type !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * Build shareable URL for current playground state.
 * 
 * @param baseUrl - Base URL (e.g., '/playground')
 * @param state - Playground state to encode
 * @returns Complete shareable URL
 */
export function buildShareableUrl(baseUrl: string, state: PlaygroundState): string {
  const encoded = encodePlaygroundState(state);
  
  if (!encoded) {
    return baseUrl;
  }
  
  const url = new URL(baseUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  url.searchParams.set('state', encoded);
  
  // Add scenario if present
  if (state.scenarioId) {
    url.searchParams.set('scenario', state.scenarioId);
  }
  
  return url.pathname + url.search;
}

/**
 * Parse URL search params to extract playground state.
 * 
 * @param searchParams - URLSearchParams from Next.js or browser
 * @returns Decoded state or null
 */
export function parseUrlState(searchParams: URLSearchParams): PlaygroundState | null {
  const encoded = searchParams.get('state');
  
  if (!encoded) {
    return null;
  }
  
  return decodePlaygroundState(encoded);
}

/**
 * Create compact state encoding for common scenarios.
 * 
 * This creates shorter URLs by using abbreviations for common operations.
 * Format: size-partitions:op1:op2:op3
 * Example: 10GB-200p:filter0.5:groupby100:join
 */
export function encodeCompactState(state: PlaygroundState): string {
  const parts: string[] = [];
  
  // Shape: size-partitions
  const sizeGB = (state.shape.totalSizeBytes / 1_000_000_000).toFixed(1);
  parts.push(`${sizeGB}GB-${state.shape.partitions}p`);
  
  // Operations
  const ops = state.operations.map(op => {
    switch (op.type) {
      case 'filter':
        return `filter${op.params.selectivity || 0.5}`;
      case 'groupby':
        return `groupby${op.params.num_groups || 100}`;
      case 'join':
        return `join${op.params.join_type || 'inner'}`;
      case 'repartition':
        return `repartition${op.params.new_partitions || 100}`;
      default:
        return op.type;
    }
  });
  
  parts.push(...ops);
  
  return parts.join(':');
}

/**
 * Decode compact state format.
 * 
 * @param compact - Compact state string
 * @returns Partial playground state or null
 */
export function decodeCompactState(compact: string): Partial<PlaygroundState> | null {
  try {
    const parts = compact.split(':');
    
    if (parts.length === 0) {
      return null;
    }
    
    // Parse shape
    const shapePart = parts[0];
    const [sizeStr, partitionsStr] = shapePart.split('-');
    
    const sizeGB = parseFloat(sizeStr.replace('GB', ''));
    const partitions = parseInt(partitionsStr.replace('p', ''));
    
    const totalSizeBytes = sizeGB * 1_000_000_000;
    
    // Parse operations
    const operations: Operation[] = parts.slice(1).map((opStr, idx) => {
      const id = `op-${Date.now()}-${idx}`;
      
      if (opStr.startsWith('filter')) {
        const selectivity = parseFloat(opStr.replace('filter', ''));
        return { id, type: 'filter', params: { selectivity } } as Operation;
      } else if (opStr.startsWith('groupby')) {
        const num_groups = parseInt(opStr.replace('groupby', ''));
        return { id, type: 'groupby', params: { num_groups } } as Operation;
      } else if (opStr.startsWith('join')) {
        const join_type = opStr.replace('join', '') || 'inner';
        return { id, type: 'join', params: { join_type, right_rows: 100000 } } as Operation;
      } else if (opStr.startsWith('repartition')) {
        const new_partitions = parseInt(opStr.replace('repartition', ''));
        return { id, type: 'repartition', params: { new_partitions } } as Operation;
      } else {
        return { id, type: opStr, params: {} } as Operation;
      }
    });
    
    // Calculate derived values
    const rowCount = Math.floor(totalSizeBytes / 100); // Assume 100 bytes per row
    
    return {
      shape: {
        totalSizeBytes,
        avgRowSizeBytes: 100,
        partitions,
        skewFactor: 1.0,
        rows: rowCount,
      },
      operations,
    };
  } catch (error) {
    console.error('Failed to decode compact state:', error);
    return null;
  }
}
