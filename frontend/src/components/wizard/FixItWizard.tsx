"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, 
  Copy, 
  Check, 
  Code, 
  Settings, 
  TrendingUp,
  Zap,
  Clock,
  Shield
} from "lucide-react";

interface ConfigChange {
  key: string;
  old_value?: string;
  new_value: string;
  reason: string;
}

interface CodeModification {
  location: string;
  original: string;
  modified: string;
  explanation: string;
}

interface ImpactEstimate {
  metric: string;
  current_value: string;
  estimated_value: string;
  confidence: string;
  reasoning: string;
}

interface Fix {
  fix_id: string;
  title: string;
  strategy: string;
  description: string;
  config_changes: ConfigChange[];
  code_modifications: CodeModification[];
  impact_estimates: ImpactEstimate[];
  difficulty: string;
  risk_level: string;
  estimated_time: string;
  spark_submit_args?: string;
  pyspark_code?: string;
}

interface FixItWizardProps {
  fixes?: Fix[];
  className?: string;
}

const DifficultyBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    easy: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    hard: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[level as keyof typeof colors] || colors.medium}`}>
      {level}
    </span>
  );
};

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    low: "text-green-600 dark:text-green-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    high: "text-red-600 dark:text-red-400"
  };
  
  return (
    <div className={`flex items-center gap-1 text-xs ${colors[level as keyof typeof colors] || colors.medium}`}>
      <Shield className="h-3 w-3" />
      <span>{level} risk</span>
    </div>
  );
};

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

const FixCard: React.FC<{ fix: Fix }> = ({ fix }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {fix.title}
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {fix.description}
            </p>
            
            <div className="flex items-center gap-3 text-xs">
              <DifficultyBadge level={fix.difficulty} />
              <RiskBadge level={fix.risk_level} />
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{fix.estimated_time}</span>
              </div>
            </div>
          </div>
          
          <Zap className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''} text-gray-400`} />
        </div>
      </div>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t-2 border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-800/30">
              
              {/* Config Changes */}
              {fix.config_changes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        Configuration Changes
                      </h4>
                    </div>
                    {fix.spark_submit_args && (
                      <CopyButton text={fix.spark_submit_args} label="Copy Command" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {fix.config_changes.map((change, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                        <div className="font-mono text-xs text-gray-900 dark:text-gray-100 mb-1">
                          {change.key}
                        </div>
                        <div className="flex items-center gap-2 text-xs mb-1">
                          {change.old_value && (
                            <>
                              <span className="text-red-600 dark:text-red-400 line-through">{change.old_value}</span>
                              <span>→</span>
                            </>
                          )}
                          <span className="text-green-600 dark:text-green-400 font-semibold">{change.new_value}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {change.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {fix.spark_submit_args && (
                    <div className="mt-3 bg-gray-900 dark:bg-gray-950 rounded p-3 overflow-x-auto">
                      <code className="text-xs text-gray-100 font-mono">
                        $ spark-submit {fix.spark_submit_args}
                      </code>
                    </div>
                  )}
                </div>
              )}
              
              {/* Code Modifications */}
              {fix.code_modifications.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        Code Changes
                      </h4>
                    </div>
                    {fix.pyspark_code && (
                      <CopyButton text={fix.pyspark_code} label="Copy Code" />
                    )}
                  </div>
                  
                  {fix.code_modifications.map((mod, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {mod.location}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Before:</div>
                          <pre className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2 text-xs overflow-x-auto">
                            <code>{mod.original}</code>
                          </pre>
                        </div>
                        
                        <div>
                          <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">After:</div>
                          <pre className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 text-xs overflow-x-auto">
                            <code>{mod.modified}</code>
                          </pre>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 dark:text-gray-400 italic">
                        {mod.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Impact Estimates */}
              {fix.impact_estimates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Expected Impact
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    {fix.impact_estimates.map((impact, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {impact.metric}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            impact.confidence === 'high' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            impact.confidence === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            {impact.confidence} confidence
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">{impact.current_value}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">{impact.estimated_value}</span>
                        </div>
                        
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {impact.reasoning}
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

export const FixItWizard: React.FC<FixItWizardProps> = ({ fixes = [], className = "" }) => {
  if (fixes.length === 0) {
    return (
      <div className={`rounded-lg border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6 ${className}`}>
        <div className="flex items-center gap-4">
          <Zap className="h-8 w-8 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              No Optimizations Needed
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your Spark job is running efficiently. Keep up the good work!
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          Fix-It Wizard
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {fixes.length} optimization{fixes.length !== 1 ? 's' : ''} suggested (sorted by priority)
        </p>
      </div>
      
      {/* Fixes List */}
      <div className="space-y-4">
        {fixes.map((fix) => (
          <FixCard key={fix.fix_id} fix={fix} />
        ))}
      </div>
    </div>
  );
};

export default FixItWizard;
