/**
 * Partition Bars Visualization
 * 
 * Per dataframe-playground-spec.md Section 4.2:
 * - Shows 10-20 partition bars
 * - Skew stretches bars live
 * - Color-coded warnings
 * 
 * This is the "heartbeat" of the playground.
 */

'use client';

interface PartitionBarsProps {
  partitions: number;
  skewFactor: number;
  avgPartitionSizeBytes: number;
  className?: string;
}

// 2GB typical task memory threshold
const SPILL_THRESHOLD_BYTES = 2 * 1024 * 1024 * 1024;

// Deterministic pseudo-random based on seed — avoids hydration mismatch from Math.random()
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function PartitionBars({
  partitions,
  skewFactor,
  avgPartitionSizeBytes,
  className = '',
}: PartitionBarsProps) {
  // Show max 20 bars, min 5
  const barCount = Math.min(20, Math.max(5, Math.min(partitions, 20)));
  
  // Generate partition sizes with skew simulation
  // Simulate skew: most partitions are normal, a few are larger
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Last few partitions get the skew effect
    const skewedIndex = barCount - 3; // Last 3 partitions are "hot"
    if (i >= skewedIndex && skewFactor > 1) {
      const skewAmount = 1 + (skewFactor - 1) * ((i - skewedIndex + 1) / 3);
      return avgPartitionSizeBytes * skewAmount;
    }
    // Add deterministic variance to normal partitions (seeded by index + partition count)
    const variance = 0.8 + seededRandom(i + partitions * 7 + barCount * 13) * 0.4; // 0.8 to 1.2
    return avgPartitionSizeBytes * variance;
  });
  
  const maxSize = Math.max(...bars);
  const maxPartitionSize = avgPartitionSizeBytes * skewFactor;
  
  // Determine risk level
  const spillRisk = maxPartitionSize > SPILL_THRESHOLD_BYTES;
  const highRisk = maxPartitionSize > SPILL_THRESHOLD_BYTES * 2;
  
  return (
    <div className={`space-y-2 ${className}`} data-testid="partition-bars">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Partition Distribution</span>
        <span className={`font-medium ${
          highRisk ? 'text-red-400' : spillRisk ? 'text-yellow-400' : 'text-slate-400'
        }`}>
          {skewFactor > 1 ? `${skewFactor.toFixed(1)}x skew` : 'Even'}
        </span>
      </div>
      
      {/* Partition bars */}
      <div className="flex items-end gap-0.5 h-16 bg-slate-900/50 rounded p-2">
        {bars.map((size, i) => {
          const height = maxSize > 0 ? (size / maxSize) * 100 : 10;
          const isHot = size > avgPartitionSizeBytes * 1.5;
          const isSpillRisk = size > SPILL_THRESHOLD_BYTES;
          
          let barColor = 'bg-blue-500';
          if (isSpillRisk) {
            barColor = 'bg-red-500';
          } else if (isHot) {
            barColor = 'bg-yellow-500';
          }
          
          return (
            <div
              key={i}
              className={`flex-1 rounded-t transition-all ${barColor}`}
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`Partition ${i + 1}: ${formatBytes(size)}`}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded" />
          <span>Hot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded" />
          <span>Spill Risk</span>
        </div>
      </div>
      
      {/* Warning if applicable */}
      {spillRisk && (
        <div className={`text-xs p-2 rounded ${
          highRisk 
            ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
        }`}>
          ⚠️ Max partition (~{formatBytes(maxPartitionSize)}) may cause disk spill
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default PartitionBars;
