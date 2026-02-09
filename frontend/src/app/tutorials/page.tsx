'use client';

/**
 * Interactive Tutorials Page
 * 
 * Based on tutorials-spec.md - Senior Engineer Mentorship approach.
 * Philosophy: Cause → Effect → Trade-off → Failure mode
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, LayoutGrid, Shuffle, GitMerge, Cpu, HardDrive, 
  AlertTriangle, FileOutput, Settings, Monitor,
  ChevronRight, BookOpen, Lightbulb, ArrowRight, CheckCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, Badge, IconBox, PageHeader, PageContainer } from '@/components/ui';
import type { TutorialGroupSummary, TutorialGroup } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Map icon names to components
const ICON_MAP: Record<string, React.ElementType> = {
  Brain,
  LayoutGrid,
  Shuffle,
  GitMerge,
  Cpu,
  HardDrive,
  AlertTriangle,
  FileOutput,
  Settings,
  Monitor,
};

// Color classes for each group
const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; light: string }> = {
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    light: 'bg-blue-50 dark:bg-blue-900/20',
  },
  green: {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-green-600 dark:text-green-400',
    light: 'bg-green-50 dark:bg-green-900/20',
  },
  orange: {
    bg: 'bg-orange-500',
    border: 'border-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    light: 'bg-orange-50 dark:bg-orange-900/20',
  },
  red: {
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-red-600 dark:text-red-400',
    light: 'bg-red-50 dark:bg-red-900/20',
  },
  purple: {
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    light: 'bg-purple-50 dark:bg-purple-900/20',
  },
  yellow: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    light: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  pink: {
    bg: 'bg-pink-500',
    border: 'border-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    light: 'bg-pink-50 dark:bg-pink-900/20',
  },
  cyan: {
    bg: 'bg-cyan-500',
    border: 'border-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400',
    light: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  slate: {
    bg: 'bg-slate-500',
    border: 'border-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
    light: 'bg-slate-50 dark:bg-slate-800/50',
  },
  indigo: {
    bg: 'bg-indigo-500',
    border: 'border-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    light: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
};

function GroupCard({ 
  group, 
  isSelected, 
  onClick 
}: { 
  group: TutorialGroupSummary; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const Icon = ICON_MAP[group.icon] || Brain;
  const colors = COLOR_CLASSES[group.color] || COLOR_CLASSES.blue;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <Card 
        variant={isSelected ? "bordered" : "default"}
        hover
        className={cn(
          "text-left smooth-transition group shadow-md hover:shadow-xl",
          isSelected && `${colors.border} ${colors.light} glow-primary`
        )}
      >
        <CardContent>
          <div className="flex items-start gap-4">
            <IconBox
              icon={Icon as React.ElementType}
              variant={(isSelected ? group.color : "slate") as "blue" | "green" | "amber" | "red" | "purple" | "pink" | "cyan" | "slate" | "indigo"}
              size="md"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isSelected ? "primary" : "default"} size="sm">
                  Group {group.number}
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{group.subtitle}</span>
              </div>
              <h3 className={cn(
                "font-bold text-lg truncate",
                isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
              )}>
                {group.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>{group.topic_count} topics</span>
                <span>•</span>
                <span>{group.tutorial_count} tutorials</span>
              </div>
            </div>

            <ChevronRight className={cn(
              "w-5 h-5 shrink-0 transition-transform",
              isSelected ? `${colors.text} rotate-90` : "text-slate-400"
            )} />
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}

function GroupDetail({ group }: { group: TutorialGroup }) {
  const colors = COLOR_CLASSES[group.color] || COLOR_CLASSES.blue;
  const Icon = ICON_MAP[group.icon] || Brain;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <IconBox icon={Icon as React.ElementType} variant={group.color as "blue" | "green" | "amber" | "red" | "purple" | "pink" | "cyan" | "slate" | "indigo"} size="md" />
          <Badge variant="primary" size="sm">
            Group {group.number} — {group.subtitle}
          </Badge>
        </div>
        <h2 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">{group.title}</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          {group.description}
        </p>
      </div>

      {/* Learning Outcome */}
      <Card variant="bordered" className={cn(colors.light, colors.border, "shadow-lg smooth-transition hover:shadow-xl")}>
        <CardContent>
          <div className="flex items-start gap-3">
            <Lightbulb className={cn("w-6 h-6 shrink-0 mt-0.5", colors.text)} />
            <div>
              <h4 className={cn("font-bold mb-1", colors.text)}>Learning Outcome</h4>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {group.learning_outcome}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      {group.key_takeaways && group.key_takeaways.length > 0 && (
        <Card variant="gradient" className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900/50 border-emerald-200 dark:border-emerald-800/50">
          <CardContent>
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Key Takeaways — Remember These
            </h3>
            <ul className="space-y-3">
              {group.key_takeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{takeaway}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Common Mistakes */}
      {group.common_mistakes && group.common_mistakes.length > 0 && (
        <Card variant="gradient" className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-slate-900/50 border-red-200 dark:border-red-800/50">
          <CardContent>
            <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Common Mistakes — Avoid These
            </h3>
            <ul className="space-y-3">
              {group.common_mistakes.map((mistake, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <span className="text-red-400 dark:text-red-500 shrink-0 mt-0.5">✗</span>
                  <span className="leading-relaxed">{mistake}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Topics Covered */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Topics Covered
        </h3>
        <div className="flex flex-wrap gap-2">
          {group.topics.map((topic, i) => (
            <span 
              key={i}
              className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Interactive Tutorials */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          ⚡ Interactive Tutorials
        </h3>
        <div className="space-y-4">
          {group.tutorial_topics.map((topic) => (
            <Card key={topic.id} variant="default">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white">{topic.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{topic.description}</p>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {topic.tutorials.map((tutorial) => (
                  <Link
                    key={tutorial.id}
                    href={`/tutorials/${group.id}/${tutorial.id}`}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎮</span>
                        <h5 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {tutorial.title}
                        </h5>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {tutorial.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-4" />
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TutorialsPageContent() {
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<TutorialGroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<TutorialGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/tutorials/groups`)
      .then(res => res.json())
      .then(data => {
        setGroups(data);
        // Check if there's a group parameter in URL
        const groupParam = searchParams.get('group');
        if (groupParam && data.find((g: TutorialGroupSummary) => g.id === groupParam)) {
          setSelectedGroupId(groupParam);
        } else if (data.length > 0) {
          setSelectedGroupId(data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [searchParams]);

  // Fetch group detail when selection changes
  useEffect(() => {
    if (!selectedGroupId) return;
    
    fetch(`${API_BASE}/api/tutorials/groups/${selectedGroupId}`)
      .then(res => res.json())
      .then(setSelectedGroup)
      .catch(console.error);
  }, [selectedGroupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 animate-pulse">Loading tutorials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        icon="🧠"
        badge={
          <Badge variant="primary" size="sm">
            Senior Engineer Mentorship
          </Badge>
        }
        title="Interactive Spark Tutorials"
        description={
          <>
            Learn Spark the way senior engineers teach it:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Cause → Effect → Trade-off → Failure mode
            </span>
            . No boring docs—just interactive visualizations that make Spark click.
          </>
        }
      />

      {/* Philosophy Banner — hide chevrons on mobile, use vertical layout */}
      <Card variant="gradient" className="mb-6 sm:mb-10 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 border-blue-100 dark:border-slate-700">
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-center">
            <Badge variant="primary" size="md">What Spark does</Badge>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <Badge variant="info" size="md">Why it behaves this way</Badge>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <Badge variant="warning" size="md">What usually goes wrong</Badge>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <Badge variant="success" size="md">How to reason</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Content — Mobile: show list OR detail, Desktop: side-by-side */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Groups List — hidden on mobile when a group detail is visible */}
        <div className={cn(
          "lg:col-span-5 space-y-3",
          selectedGroup ? "hidden lg:block" : "block"
        )}>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 mb-4">
            Learning Tracks
          </h2>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isSelected={selectedGroupId === group.id}
              onClick={() => setSelectedGroupId(group.id)}
            />
          ))}
        </div>

        {/* Detail Panel — on mobile, show back button to return to list */}
        <div className={cn(
          "lg:col-span-7",
          selectedGroup ? "block" : "hidden lg:block"
        )}>
          {/* Mobile back button */}
          {selectedGroup && (
            <button
              onClick={() => { setSelectedGroup(null); setSelectedGroupId(null); }}
              className="lg:hidden flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Learning Tracks
            </button>
          )}
          <AnimatePresence mode="wait">
            {selectedGroup ? (
              <GroupDetail key={selectedGroup.id} group={selectedGroup} />
            ) : (
              <Card variant="default" className="h-60 sm:h-96 flex items-center justify-center border-dashed">
                <CardContent className="text-center text-slate-400">
                  <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
                  <p>Select a track to explore</p>
                </CardContent>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageContainer>
  );
}

export default function TutorialsPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-pulse" />
            <p className="text-slate-400">Loading tutorials...</p>
          </div>
        </div>
      </PageContainer>
    }>
      <TutorialsPageContent />
    </Suspense>
  );
}
