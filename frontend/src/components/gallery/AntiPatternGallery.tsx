"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Filter,
} from "lucide-react";

interface AntiPattern {
  id: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  bad_code: string;
  why_bad: string;
  common_symptoms: string[];
  typical_metrics: Record<string, string>;
  good_code: string;
  why_good: string;
  improvements: string[];
  when_to_use: string;
  docs_link: string;
}

interface AntiPatternGalleryProps {
  patterns?: AntiPattern[];
}

export default function AntiPatternGallery({ patterns: initialPatterns }: AntiPatternGalleryProps) {
  const [patterns, setPatterns] = useState<AntiPattern[]>(initialPatterns || []);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialPatterns);

  useEffect(() => {
    if (!initialPatterns) {
      fetchPatterns();
    }
  }, [initialPatterns]);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/anti-patterns");
      const data = await response.json();
      setPatterns(data.anti_patterns);
    } catch (error) {
      console.error("Failed to load anti-patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatterns =
    selectedCategory === "all"
      ? patterns
      : patterns.filter((p) => p.category === selectedCategory);

  const categories = [
    { id: "all", label: "All", icon: Filter },
    { id: "joins", label: "Joins", icon: AlertCircle },
    { id: "memory", label: "Memory", icon: AlertTriangle },
    { id: "shuffles", label: "Shuffles", icon: Info },
    { id: "actions", label: "Actions", icon: XCircle },
    { id: "caching", label: "Caching", icon: CheckCircle2 },
    { id: "correctness", label: "Correctness", icon: AlertTriangle },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
      case "high":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30";
      case "low":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30";
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ⚠️ Anti-Pattern Gallery
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Learn from common mistakes. Each example shows what NOT to do, why it fails, and how to fix it.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${
                  isActive
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
              {cat.id !== "all" && (
                <span className="text-xs opacity-70">
                  ({patterns.filter((p) => p.category === cat.id).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Patterns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPatterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              isExpanded={expandedId === pattern.id}
              onToggle={() =>
                setExpandedId(expandedId === pattern.id ? null : pattern.id)
              }
              onCopy={copyCode}
              isCopied={copiedId === pattern.id}
              getSeverityColor={getSeverityColor}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredPatterns.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No patterns found in this category.
        </div>
      )}
    </div>
  );
}

interface PatternCardProps {
  pattern: AntiPattern;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (code: string, id: string) => void;
  isCopied: boolean;
  getSeverityColor: (severity: string) => string;
}

function PatternCard({
  pattern,
  isExpanded,
  onToggle,
  onCopy,
  isCopied,
  getSeverityColor,
}: PatternCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Card Header */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 text-xs font-bold rounded ${getSeverityColor(
                  pattern.severity
                )}`}
              >
                {pattern.severity.toUpperCase()}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                {pattern.category}
              </span>
            </div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {pattern.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {pattern.why_bad}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-gray-400"
          >
            ▼
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 space-y-4">
              {/* Bad Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <XCircle size={16} className="text-red-500" />
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      Bad Example
                    </span>
                  </div>
                  <button
                    onClick={() => onCopy(pattern.bad_code, `${pattern.id}-bad`)}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isCopied ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-xs overflow-x-auto">
                  <code className="text-red-900 dark:text-red-300">{pattern.bad_code}</code>
                </pre>
              </div>

              {/* Common Symptoms */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  Common Symptoms
                </h4>
                <ul className="space-y-1">
                  {pattern.common_symptoms.map((symptom, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-yellow-500 mt-0.5">•</span>
                      <span>{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Typical Metrics */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Info size={16} className="text-blue-500" />
                  What You&apos;ll See
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(pattern.typical_metrics).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded p-2"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {key}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Good Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      Fixed Example
                    </span>
                  </div>
                  <button
                    onClick={() => onCopy(pattern.good_code, `${pattern.id}-good`)}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {isCopied ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 text-xs overflow-x-auto">
                  <code className="text-green-900 dark:text-green-300">{pattern.good_code}</code>
                </pre>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {pattern.why_good}
                </p>
              </div>

              {/* Improvements */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500" />
                  Improvements
                </h4>
                <ul className="space-y-1">
                  {pattern.improvements.map((improvement, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* When to Use */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  💡 Best Practice
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  {pattern.when_to_use}
                </p>
              </div>

              {/* Docs Link */}
              <a
                href={pattern.docs_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink size={14} />
                Read Official Spark Docs
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
