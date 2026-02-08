"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Award, Target, Zap, Star, Medal, Crown,
  Lock, CheckCircle2, TrendingUp, Filter,
  type LucideIcon
} from 'lucide-react';
import { PageContainer, PageHeader, Card, CardContent, Badge } from '@/components/ui';
import { LoginPrompt } from '@/components/LoginPrompt';
import { useAchievements } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | 'tutorials' | 'challenges' | 'scenarios' | 'streak' | 'mastery';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  tutorials: 'Tutorials',
  challenges: 'Challenges',
  scenarios: 'Scenarios',
  streak: 'Streaks',
  mastery: 'Mastery',
};

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  award: Award,
  target: Target,
  zap: Zap,
  star: Star,
  medal: Medal,
  crown: Crown,
};

export default function AchievementsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { achievements, totalAchievements, unlockedCount, isLoading } = useAchievements();
  const [filter, setFilter] = useState<CategoryFilter>('all');

  if (authLoading || isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🏆</div>
            <p className="text-slate-500 dark:text-slate-400">Loading achievements...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeader
          title={<span className="text-gradient">Achievements</span>}
          description="Track your accomplishments and earn badges as you master Spark."
        />
        <LoginPrompt
          feature="View Your Achievements"
          icon={<Trophy className="w-12 h-12 text-amber-500 dark:text-amber-400" />}
        />
      </PageContainer>
    );
  }

  const completionPercentage = totalAchievements > 0
    ? (unlockedCount / totalAchievements) * 100
    : 0;

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  // Category filtering (dummy categories based on icon/title for now)
  const filteredUnlocked = filter === 'all'
    ? unlockedAchievements
    : unlockedAchievements;
  const filteredLocked = filter === 'all'
    ? lockedAchievements
    : lockedAchievements;

  return (
    <PageContainer>
      <PageHeader
        title={<span className="text-gradient">Achievements</span>}
        description="Track your accomplishments and earn badges as you master Spark."
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Trophy className="w-6 h-6 text-amber-500" />}
          label="Total Unlocked"
          value={`${unlockedCount}/${totalAchievements}`}
          bgColor="bg-amber-50 dark:bg-amber-900/20"
          borderColor="border-amber-200 dark:border-amber-800"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
          label="Completion"
          value={`${completionPercentage.toFixed(0)}%`}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
          borderColor="border-blue-200 dark:border-blue-800"
        />
        <StatCard
          icon={<Star className="w-6 h-6 text-purple-500" />}
          label="Remaining"
          value={`${totalAchievements - unlockedCount}`}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          borderColor="border-purple-200 dark:border-purple-800"
        />
      </div>

      {/* Progress Bar */}
      <Card variant="bordered" className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {completionPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as CategoryFilter)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Unlocked Achievements */}
      {filteredUnlocked.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Unlocked ({filteredUnlocked.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredUnlocked.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AchievementCard achievement={achievement} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Locked Achievements */}
      {filteredLocked.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            Locked ({filteredLocked.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredLocked.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AchievementCard achievement={achievement} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Empty State */}
      {achievements.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-slate-400 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No achievements yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Complete tutorials and challenges to start earning badges and tracking your mastery of Spark!
          </p>
        </div>
      )}

      {/* All Complete Banner */}
      {unlockedCount === totalAchievements && totalAchievements > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl border-2 border-amber-400 dark:border-amber-600 text-center"
        >
          <Trophy className="w-12 h-12 text-amber-500 dark:text-amber-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200 mb-2">
            🎉 All Achievements Unlocked!
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 max-w-lg mx-auto">
            Congratulations! You&apos;ve mastered Spark fundamentals and earned every achievement. 
            You&apos;re ready for production Spark development!
          </p>
        </motion.div>
      )}
    </PageContainer>
  );
}

/* ───────── Sub-components ───────── */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  borderColor: string;
}

function StatCard({ icon, label, value, bgColor, borderColor }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card variant="bordered" className={cn(borderColor)}>
        <CardContent className={cn("p-5", bgColor)}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/70 dark:bg-slate-900/50 flex items-center justify-center shadow-sm">
              {icon}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {label}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {value}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AchievementCardProps {
  achievement: {
    id: string;
    title: string;
    description: string;
    icon_name: string;
    unlocked: boolean;
    unlocked_at?: string;
  };
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const Icon = iconMap[achievement.icon_name] || Trophy;
  const isUnlocked = achievement.unlocked;

  return (
    <Card
      variant="bordered"
      className={cn(
        "transition-all hover:shadow-md",
        isUnlocked
          ? "border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10"
          : "border-slate-200 dark:border-slate-800 opacity-70 grayscale hover:opacity-90 hover:grayscale-0"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shrink-0",
            isUnlocked
              ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/50"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
          )}>
            {isUnlocked ? (
              <Icon className="w-7 h-7" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={cn(
                "font-bold text-sm",
                isUnlocked
                  ? "text-amber-900 dark:text-amber-200"
                  : "text-slate-600 dark:text-slate-400"
              )}>
                {achievement.title}
              </h4>
              {isUnlocked && (
                <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
              )}
            </div>

            <p className={cn(
              "text-xs leading-relaxed mb-2",
              isUnlocked
                ? "text-amber-800/80 dark:text-amber-300/80"
                : "text-slate-500 dark:text-slate-500"
            )}>
              {achievement.description}
            </p>

            {isUnlocked && achievement.unlocked_at && (
              <Badge variant="success" className="text-xs">
                Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
              </Badge>
            )}
            {!isUnlocked && (
              <Badge variant="default" className="text-xs">
                Locked
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
