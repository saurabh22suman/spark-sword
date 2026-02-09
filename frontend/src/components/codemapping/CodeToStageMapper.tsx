"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Code2, 
  GitBranch, 
  Shuffle, 
  ArrowRight, 
  Zap,
  FileCode,
  Activity,
  ChevronRight
} from "lucide-react";

interface CodeSnippet {
  cell_index: number;
  line_start: number;
  line_end: number;
  code: string;
  language: string;
}

interface StageCodeLink {
  stage_id: number;
  stage_name: string;
  transformation_type: string;
  causes_shuffle: boolean;
  code_snippet?: CodeSnippet;
  file_name?: string;
  line_number?: number;
  depends_on_stages: number[];
  consumed_by_stages: number[];
}

interface CodeToStageMapperProps {
  stageLinks: StageCodeLink[];
  onStageClick?: (stageId: number) => void;
  highlightedStageId?: number;
  className?: string;
}

const TransformationBadge: React.FC<{ 
  type: string; 
  shuffle: boolean;
}> = ({ type, shuffle }) => {
  const colors = shuffle
    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700";
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${colors}`}>
      {shuffle && <Shuffle className="h-3 w-3" />}
      <span>{type}</span>
    </div>
  );
};

const StageCard: React.FC<{ 
  link: StageCodeLink;
  isHighlighted: boolean;
  onClick?: () => void;
}> = ({ link, isHighlighted, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick?.();
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        rounded-lg border-2 overflow-hidden cursor-pointer transition-all
        ${isHighlighted 
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Activity className="h-4 w-4" />
                <span>Stage {link.stage_id}</span>
              </div>
              <TransformationBadge 
                type={link.transformation_type} 
                shuffle={link.causes_shuffle}
              />
            </div>
            
            {link.file_name && link.line_number && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <FileCode className="h-3 w-3" />
                <span className="font-mono">
                  {link.file_name}:{link.line_number}
                </span>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 truncate">
              {link.stage_name}
            </div>
          </div>
          
          <ChevronRight 
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
        
        {/* Dependencies */}
        {(link.depends_on_stages.length > 0 || link.consumed_by_stages.length > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs">
            {link.depends_on_stages.length > 0 && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <ArrowRight className="h-3 w-3" />
                <span>Depends on: {link.depends_on_stages.join(', ')}</span>
              </div>
            )}
            {link.consumed_by_stages.length > 0 && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Zap className="h-3 w-3" />
                <span>Feeds: {link.consumed_by_stages.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Code Snippet (Expanded) */}
      <AnimatePresence>
        {isExpanded && link.code_snippet && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t-2 border-gray-200 dark:border-gray-700"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Source Code
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Cell {link.code_snippet.cell_index} · Lines {link.code_snippet.line_start}-{link.code_snippet.line_end}
                </span>
              </div>
              <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-gray-700">
                <code>{link.code_snippet.code}</code>
              </pre>
              {link.causes_shuffle && (
                <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                  <Shuffle className="h-3 w-3" />
                  <span>This operation triggered a shuffle boundary</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const CodeToStageMapper: React.FC<CodeToStageMapperProps> = ({
  stageLinks,
  onStageClick,
  highlightedStageId,
  className = "",
}) => {
  const shuffleStages = stageLinks.filter(link => link.causes_shuffle);
  const totalStages = stageLinks.length;
  
  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <GitBranch className="h-6 w-6" />
          Code-to-Stage Mapping
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div>{totalStages} stages</div>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center gap-1.5">
            <Shuffle className="h-4 w-4 text-orange-500" />
            <span>{shuffleStages.length} shuffle boundaries</span>
          </div>
        </div>
      </div>
      
      {/* Stage List */}
      <div className="space-y-3">
        {stageLinks.map((link) => (
          <StageCard
            key={link.stage_id}
            link={link}
            isHighlighted={highlightedStageId === link.stage_id}
            onClick={() => onStageClick?.(link.stage_id)}
          />
        ))}
      </div>
      
      {/* Empty State */}
      {stageLinks.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Code2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No code mappings available</p>
          <p className="text-sm mt-1">Upload an event log with callsite information</p>
        </div>
      )}
    </div>
  );
};

export default CodeToStageMapper;
