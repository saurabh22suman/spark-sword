"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Activity,
  TrendingUp,
  AlertOctagon
} from "lucide-react";
import { FailurePattern, FailureSeverity } from "@/types";

interface FailureDiagnosticsProps {
  patterns?: FailurePattern[];
  className?: string;
}

const severityConfig: Record<FailureSeverity, {
  icon: React.ComponentType<{ className?: string }>;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
  label: string;
}> = {
  critical: {
    icon: AlertOctagon,
    bgClass: "bg-red-50 dark:bg-red-950/30",
    borderClass: "border-red-300 dark:border-red-800",
    textClass: "text-red-900 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-400",
    label: "CRITICAL"
  },
  high: {
    icon: AlertTriangle,
    bgClass: "bg-orange-50 dark:bg-orange-950/30",
    borderClass: "border-orange-300 dark:border-orange-800",
    textClass: "text-orange-900 dark:text-orange-100",
    iconClass: "text-orange-600 dark:text-orange-400",
    label: "HIGH"
  },
  medium: {
    icon: AlertCircle,
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
    borderClass: "border-yellow-300 dark:border-yellow-800",
    textClass: "text-yellow-900 dark:text-yellow-100",
    iconClass: "text-yellow-600 dark:text-yellow-400",
    label: "MEDIUM"
  },
  low: {
    icon: Info,
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-300 dark:border-blue-800",
    textClass: "text-blue-900 dark:text-blue-100",
    iconClass: "text-blue-600 dark:text-blue-400",
    label: "LOW"
  }
};

const PatternCard: React.FC<{ pattern: FailurePattern }> = ({ pattern }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[pattern.severity];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border-2 ${config.borderClass} ${config.bgClass} overflow-hidden`}
    >
      {/* Header - Always Visible */}
      <div
        className="p-4 cursor-pointer flex items-start gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`p-2 rounded-lg ${config.bgClass} border ${config.borderClass}`}>
          <Icon className={`h-6 w-6 ${config.iconClass}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.iconClass} bg-white/50 dark:bg-gray-900/50`}>
              {config.label}
            </span>
            {pattern.stage_id !== undefined && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Stage {pattern.stage_id}
              </span>
            )}
            {pattern.executor_id && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Executor {pattern.executor_id}
              </span>
            )}
          </div>
          
          <h3 className={`font-semibold ${config.textClass} text-sm sm:text-base`}>
            {pattern.description}
          </h3>
          
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Activity className="h-3 w-3" />
            <span>Click to {isExpanded ? "collapse" : "expand"} details</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t-2 border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
              {/* Why This Matters */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Why This Matters
                  </h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {pattern.explanation}
                </p>
              </div>

              {/* How to Fix */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Suggested Fix
                  </h4>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  {pattern.suggested_fix.split('\n').map((line, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {line.trim().match(/^\d+\./) && (
                        <span className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                          →
                        </span>
                      )}
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supporting Metrics */}
              {Object.keys(pattern.metrics).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Supporting Evidence
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(pattern.metrics).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-gray-50 dark:bg-gray-800 rounded p-2"
                      >
                        <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const FailureDiagnostics: React.FC<FailureDiagnosticsProps> = ({ 
  patterns = [], 
  className = "" 
}) => {
  if (patterns.length === 0) {
    return (
      <div className={`rounded-lg border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6 ${className}`}>
        <div className="flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              No Issues Detected! 🎉
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              This job ran efficiently with no critical failure patterns detected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = patterns.filter(p => p.severity === 'critical').length;
  const highCount = patterns.filter(p => p.severity === 'high').length;

  return (
    <div className={className}>
      {/* Summary Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Failure Diagnostics
        </h2>
        <div className="flex items-center gap-4 text-sm">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertOctagon className="h-4 w-4" />
              <span className="font-semibold">{criticalCount} Critical</span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">{highCount} High</span>
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-400">
            Total: {patterns.length} {patterns.length === 1 ? 'issue' : 'issues'} found
          </div>
        </div>
      </div>

      {/* Patterns List */}
      <div className="space-y-4">
        {patterns.map((pattern, idx) => (
          <PatternCard key={idx} pattern={pattern} />
        ))}
      </div>
    </div>
  );
};

export default FailureDiagnostics;
