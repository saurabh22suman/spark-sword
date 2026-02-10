/**
 * Validation Warnings Panel Component
 * 
 * Displays real-time feedback about potentially problematic configurations.
 * Educational and non-blocking.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ValidationWarning } from './ValidationWarnings';
import { getSeverityStyles } from './ValidationWarnings';

interface ValidationWarningsPanelProps {
  warnings: ValidationWarning[];
  isLearningMode: boolean;
  onDismiss?: (warningId: string) => void;
  className?: string;
}

export function ValidationWarningsPanel({
  warnings,
  isLearningMode,
  onDismiss,
  className = '',
}: ValidationWarningsPanelProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);
  
  const visibleWarnings = warnings.filter(w => !dismissedWarnings.includes(w.id));
  
  const handleDismiss = (warningId: string) => {
    setDismissedWarnings(prev => [...prev, warningId]);
    onDismiss?.(warningId);
  };
  
  if (visibleWarnings.length === 0) return null;
  
  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {visibleWarnings.map((warning) => {
          const styles = getSeverityStyles(warning.severity);
          const message = isLearningMode && warning.learningModeMessage
            ? warning.learningModeMessage
            : warning.message;
          
          return (
            <motion.div
              key={warning.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}
              data-testid="validation-warning"
              data-severity={warning.severity}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <span className="text-lg flex-shrink-0" data-testid={`warning-severity-${warning.severity}`}>
                  {styles.icon}
                </span>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-semibold ${styles.text}`}>
                      {warning.title}
                    </h4>
                    <button
                      onClick={() => handleDismiss(warning.id)}
                      className={`flex-shrink-0 text-xs ${styles.text} opacity-60 hover:opacity-100 transition-opacity`}
                      data-testid="dismiss-warning"
                      aria-label="Dismiss warning"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <p className={`text-xs mt-1 ${styles.text} opacity-90`}>
                    {message}
                  </p>
                  
                  {warning.suggestedAction && (
                    <p className={`text-xs mt-2 ${styles.text} opacity-75 italic`}>
                      💡 {warning.suggestedAction}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ValidationWarningsPanel;
