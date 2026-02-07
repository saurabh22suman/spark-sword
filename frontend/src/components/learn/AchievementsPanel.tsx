'use client';

/**
 * Achievements Panel Component
 * 
 * Displays all available achievements with unlock status
 * Shows progress towards locked achievements
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { AchievementBadge } from './AchievementBadge';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  unlocked: boolean;
  unlocked_at?: string;
}

interface AchievementsPanelProps {
  achievements: Achievement[];
  totalAchievements: number;
}

export function AchievementsPanel({ achievements, totalAchievements }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const completionPercentage = (unlockedCount / totalAchievements) * 100;

  return (
    <Card variant="bordered">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Achievements
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Unlock rewards as you learn
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {unlockedCount}/{totalAchievements}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {completionPercentage.toFixed(0)}% complete
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500"
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AchievementBadge achievement={achievement} size="md" showDetails />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {achievements.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-slate-400 dark:text-slate-600" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">
              No achievements yet
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Complete tutorials and challenges to unlock achievements and track your progress!
            </p>
          </div>
        )}

        {/* Motivational Message */}
        {unlockedCount > 0 && unlockedCount < totalAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1">
                  Keep going!
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  You&apos;ve unlocked {unlockedCount} achievement{unlockedCount !== 1 ? 's' : ''}. 
                  Only {totalAchievements - unlockedCount} more to become a Spark Expert!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* All Complete */}
        {unlockedCount === totalAchievements && totalAchievements > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border-2 border-amber-400"
          >
            <div className="flex items-start gap-3">
              <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-1">
                  🎉 All Achievements Unlocked!
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  Congratulations! You&apos;ve mastered Spark fundamentals and earned all achievements. 
                  You&apos;re ready for production Spark development!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
