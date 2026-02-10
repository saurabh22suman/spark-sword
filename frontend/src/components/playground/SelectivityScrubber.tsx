/**
 * Continuous Selectivity Scrubber Component
 * 
 * Interactive slider for adjusting filter selectivity with real-time
 * visual feedback and preset values for quick adjustment.
 * 
 * Features:
 * - Continuous slider with fine-grained control
 * - Real-time percentage display
 * - Preset quick-select buttons
 * - Visual feedback during interaction
 * - Shows impact on row count
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SelectivityScrubberProps {
  value: number; // 0.0 to 1.0
  onChange: (value: number) => void;
  inputRows?: number; // To show output estimate
  className?: string;
}

const PRESETS = [
  { value: 0.01, label: '1%' },
  { value: 0.1, label: '10%' },
  { value: 0.25, label: '25%' },
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 0.9, label: '90%' },
];

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function SelectivityScrubber({
  value,
  onChange,
  inputRows,
  className = '',
}: SelectivityScrubberProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const percentage = (value * 100).toFixed(1);
  const outputRows = inputRows ? Math.floor(inputRows * value) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Value Display */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">
          Selectivity
        </label>
        <div className="text-right">
          <div className="text-sm text-slate-400 font-mono">
            {percentage}%
          </div>
          {outputRows !== null && (
            <div className="text-xs text-slate-500">
              {formatNumber(outputRows)} rows out
            </div>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0.01}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          data-testid="selectivity-scrubber"
          aria-label="Selectivity"
          aria-valuenow={value}
        />
        
        {/* Active indicator */}
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-blue-500 text-white text-sm font-mono rounded-lg shadow-lg"
            data-testid="scrubber-active-indicator"
          >
            {percentage}%
          </motion.div>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 mr-1">Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              Math.abs(value - preset.value) < 0.01
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            data-testid={`selectivity-preset-${preset.value}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500">
        Fraction of rows that pass the filter. Lower = more filtering.
      </p>
    </div>
  );
}

export default SelectivityScrubber;
