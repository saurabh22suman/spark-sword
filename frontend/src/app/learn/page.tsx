"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
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
  Lock,
  Unlock,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { Card, CardContent, Badge, IconBox, PageContainer, PageHeader, Button } from '@/components/ui';
import { AchievementsPanel } from '@/components/learn';
import { LoginPrompt } from '@/components/LoginPrompt';
import { useAchievements } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';

interface GroupStatus {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  unlocked: boolean;
  completed: boolean;
  progress_percentage: number;
  total_tutorials: number;
  completed_tutorials: number;
}

// Map icon names to components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, any> = {
  Brain,
  LayoutGrid,
  Shuffle,
  GitMerge,
  Cpu,
  HardDrive,
  AlertTriangle,
  FileOutput,
  Settings,
  Monitor
};

// Color palette matching tutorial groups
const colorClasses: Record<string, { bg: string; border: string; text: string; progress: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', progress: 'bg-blue-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', progress: 'bg-green-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', progress: 'bg-orange-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', progress: 'bg-red-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', progress: 'bg-purple-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', progress: 'bg-yellow-500' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', progress: 'bg-pink-500' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', progress: 'bg-cyan-500' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', progress: 'bg-slate-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', progress: 'bg-indigo-500' }
};

export default function LearningPathPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupStatus[]>([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedLockedGroup, setSelectedLockedGroup] = useState<GroupStatus | null>(null);

  // Fetch achievements
  const { achievements, totalAchievements, unlockedCount, isLoading: achievementsLoading } = useAchievements();

  // Fetch learning path status - MUST be before conditional returns (React Hooks rule)
  useEffect(() => {
    // Fetch learning path status (for now, mock data - will connect to API)
    const mockStatus: GroupStatus[] = [
      {
        id: 'spark-mental-model',
        number: 1,
        title: 'Spark Mental Model',
        subtitle: 'Foundation',
        icon: 'Brain',
        color: 'blue',
        unlocked: true,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 2,
        completed_tutorials: 0
      },
      {
        id: 'data-partitioning',
        number: 2,
        title: 'Data & Partitioning',
        subtitle: 'Most Common Failure Source',
        icon: 'LayoutGrid',
        color: 'green',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 2,
        completed_tutorials: 0
      },
      {
        id: 'transformations-shuffles',
        number: 3,
        title: 'Transformations & Shuffles',
        subtitle: 'The Pain Layer',
        icon: 'Shuffle',
        color: 'orange',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 2,
        completed_tutorials: 0
      },
      {
        id: 'joins',
        number: 4,
        title: 'Joins',
        subtitle: 'Where Production Jobs Die',
        icon: 'GitMerge',
        color: 'red',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 2,
        completed_tutorials: 0
      },
      {
        id: 'execution-engine',
        number: 5,
        title: 'Execution Engine Internals',
        subtitle: 'Under the Hood',
        icon: 'Cpu',
        color: 'purple',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 2,
        completed_tutorials: 0
      },
      {
        id: 'memory-spills',
        number: 6,
        title: 'Memory Model & Spills',
        subtitle: 'Silent Killers',
        icon: 'HardDrive',
        color: 'yellow',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 2,
        completed_tutorials: 0
      },
      {
        id: 'skew-stragglers',
        number: 7,
        title: 'Skew, Stragglers & Stability',
        subtitle: 'Long Tail Problems',
        icon: 'AlertTriangle',
        color: 'pink',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 1,
        completed_tutorials: 0
      },
      {
        id: 'writes-file-layout',
        number: 8,
        title: 'Writes & File Layout',
        subtitle: 'Downstream Pain',
        icon: 'FileOutput',
        color: 'cyan',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 1,
        completed_tutorials: 0
      },
      {
        id: 'configs',
        number: 9,
        title: 'Configs',
        subtitle: 'Only After Understanding',
        icon: 'Settings',
        color: 'slate',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 1,
        completed_tutorials: 0
      },
      {
        id: 'spark-ui',
        number: 10,
        title: 'Reading Spark UI Like a Pro',
        subtitle: 'Turning UI into Story',
        icon: 'Monitor',
        color: 'indigo',
        unlocked: false,
        completed: false,
        progress_percentage: 0,
        total_tutorials: 1,
        completed_tutorials: 0
      }
    ];

    setGroups(mockStatus);
  }, []);

  // Show login prompt if not authenticated
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">📚</div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeader
          title={<span className="text-gradient">Your Learning Path</span>}
          description="Track your progress as you master Spark step by step."
        />
        <LoginPrompt 
          feature="Track Your Learning Progress" 
          icon={<Trophy className="w-12 h-12 text-blue-600 dark:text-blue-400" />}
        />
      </PageContainer>
    );
  }

  const handleGroupClick = (group: GroupStatus) => {
    if (group.unlocked) {
      // Navigate to group page (will implement routing)
      window.location.href = `/learn/${group.id}`;
    } else {
      // Show unlock modal
      setSelectedLockedGroup(group);
      setShowUnlockModal(true);
    }
  };

  const getPreviousGroup = (groupNumber: number): GroupStatus | null => {
    if (groupNumber === 1) return null;
    return groups.find(g => g.number === groupNumber - 1) || null;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Your Learning Path"
        description="Master Spark progressively. Complete 80% of a group to unlock the next."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Learning Path - Takes 2 columns */}
        <div className="lg:col-span-2">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <Card variant="bordered" className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {groups.filter(g => g.unlocked).length}/{groups.length}
                </div>
                <div className="text-xs text-blue-800 dark:text-blue-300">Groups Unlocked</div>
              </CardContent>
            </Card>
            <Card variant="bordered" className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {groups.filter(g => g.completed).length}/{groups.length}
                </div>
                <div className="text-xs text-green-800 dark:text-green-300">Completed</div>
              </CardContent>
            </Card>
            <Card variant="bordered" className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                  {unlockedCount}/{totalAchievements}
                </div>
                <div className="text-xs text-amber-800 dark:text-amber-300">Achievements</div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Path Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{groups.map((group, index) => {
            const Icon = iconMap[group.icon];
            const colors = colorClasses[group.color];
            const isLocked = !group.unlocked;
            const previousGroup = getPreviousGroup(group.number);

            return (
              <motion.div
                key={group.id}
                data-testid={`group-${group.number}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleGroupClick(group)}
              >
                <Card
                  variant="bordered"
                  className={`relative cursor-pointer transition-all ${
                    isLocked ? 'opacity-50' : 'hover:shadow-lg md:hover:scale-105'
                  }`}
                >
                  <CardContent className="p-6">
                    {/* Lock/Unlock Indicator */}
                    <div className="absolute top-4 right-4" data-testid={isLocked ? "lock-icon" : "unlock-icon"}>
                      {isLocked ? (
                        <Lock className="w-6 h-6 text-slate-400" />
                      ) : (
                        <Unlock className="w-6 h-6 text-green-500" />
                      )}
                    </div>

                    {/* Completion Badge */}
                    {group.completed && (
                      <div
                        className="absolute top-4 right-14"
                        data-testid="completion-badge"
                      >
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                    )}

                    {/* Group Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <IconBox
                        icon={Icon}
                        variant={group.color as "blue" | "green" | "amber" | "red" | "purple" | "pink" | "cyan" | "slate" | "indigo"}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary" size="sm">
                            Group {group.number}
                          </Badge>
                        </div>
                        <h3
                          className="text-xl font-bold text-slate-900 dark:text-white mt-1"
                          data-testid="group-title"
                        >
                          {group.title}
                        </h3>
                        <p
                          className="text-sm text-slate-600 dark:text-slate-400 mt-1"
                          data-testid="group-subtitle"
                        >
                          {group.subtitle}
                        </p>
                      </div>
                    </div>

                {/* Progress Bar */}
                <div className="mt-4" data-testid="progress-bar">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">
                      {group.completed_tutorials} / {group.total_tutorials} tutorials
                    </span>
                    <span className={`font-semibold ${colors.text}`}>
                      {group.progress_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${colors.progress} transition-all duration-500`}
                      style={{ width: `${group.progress_percentage}%` }}
                      data-testid="progress-fill"
                    />
                  </div>
                </div>

                    {/* Unlock Requirement Tooltip */}
                    {isLocked && previousGroup && (
                      <div
                        className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                        data-testid="unlock-tooltip"
                      >
                        🔒 Complete 80% of <strong>{previousGroup.title}</strong> to unlock
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          </div>
        </div>

        {/* Achievements Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            {!achievementsLoading && (
              <AchievementsPanel 
                achievements={achievements} 
                totalAchievements={totalAchievements} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Unlock Modal */}
      {showUnlockModal && selectedLockedGroup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUnlockModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            data-testid="unlock-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <Card variant="default" className="max-w-md">
              <CardContent className="p-8">
                <div className="text-center">
                  <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Group Locked
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Complete <strong>80%</strong> of{' '}
                    <strong>{getPreviousGroup(selectedLockedGroup.number)?.title}</strong>{' '}
                    to unlock this group.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowUnlockModal(false)}
                  >
                    Got It
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </PageContainer>
  );
}
