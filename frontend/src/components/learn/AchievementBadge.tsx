'use client';

/**
 * Achievement Badge Component
 * 
 * Displays individual achievement with locked/unlocked states
 * Gamification element for progress tracking
 */

import { motion } from 'framer-motion';
import { 
  Trophy, Award, Target, Zap, Star, Medal, Crown,
  Lock, CheckCircle2, type LucideIcon
} from 'lucide-react';
import { Card, CardContent, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  unlocked: boolean;
  unlocked_at?: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  'trophy': Trophy,
  'award': Award,
  'target': Target,
  'zap': Zap,
  'star': Star,
  'medal': Medal,
  'crown': Crown,
};

export function AchievementBadge({ 
  achievement, 
  size = 'md',
  showDetails = true 
}: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon_name] || Trophy;
  const isUnlocked = achievement.unlocked;

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isUnlocked ? { scale: 1.05 } : {}}
      className="relative"
    >
      {showDetails ? (
        <Card 
          variant="bordered" 
          className={cn(
            "transition-all",
            isUnlocked 
              ? "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20" 
              : "border-slate-200 dark:border-slate-800 opacity-60 grayscale"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                sizeClasses[size],
                "rounded-full flex items-center justify-center shrink-0",
                isUnlocked 
                  ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white" 
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
              )}>
                {isUnlocked ? (
                  <Icon className={iconSizes[size]} />
                ) : (
                  <Lock className={iconSizes[size]} />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={cn(
                    "font-bold text-sm",
                    isUnlocked ? "text-amber-900 dark:text-amber-200" : "text-slate-600 dark:text-slate-400"
                  )}>
                    {achievement.title}
                  </h4>
                  {isUnlocked && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  )}
                </div>

                <p className={cn(
                  "text-xs leading-relaxed",
                  isUnlocked ? "text-amber-800 dark:text-amber-300" : "text-slate-500 dark:text-slate-500"
                )}>
                  {achievement.description}
                </p>

                {isUnlocked && achievement.unlocked_at && (
                  <Badge variant="success" className="mt-2 text-xs">
                    Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </Badge>
                )}

                {!isUnlocked && (
                  <Badge variant="default" className="mt-2 text-xs">
                    Locked
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Compact icon-only view
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full flex items-center justify-center relative",
            isUnlocked 
              ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white" 
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
          )}
          title={achievement.title}
        >
          {isUnlocked ? (
            <Icon className={iconSizes[size]} />
          ) : (
            <Lock className={iconSizes[size]} />
          )}
          
          {isUnlocked && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
