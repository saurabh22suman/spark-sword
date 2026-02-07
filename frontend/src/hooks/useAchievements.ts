'use client';

/**
 * Custom hook for achievement management
 * 
 * Fetches achievements from backend and provides unlock notification system
 */

import { useState, useEffect, useCallback } from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  unlocked: boolean;
  unlocked_at?: string;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  totalAchievements: number;
  unlockedCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkNewAchievements: () => Promise<Achievement | null>;
}

export function useAchievements(userId: string = 'default-user'): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousUnlocked, setPreviousUnlocked] = useState<Set<string>>(new Set());

  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/progress/${userId}/achievements`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }

      const data = await response.json();
      setAchievements(data.achievements);
      setTotalAchievements(data.total);

      // Track which achievements were already unlocked
      const currentUnlocked: Set<string> = new Set(
        data.achievements.filter((a: Achievement) => a.unlocked).map((a: Achievement) => a.id)
      );
      setPreviousUnlocked(currentUnlocked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const checkNewAchievements = useCallback(async (): Promise<Achievement | null> => {
    try {
      const response = await fetch(`http://localhost:8000/api/progress/${userId}/achievements`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const currentAchievements = data.achievements as Achievement[];
      
      // Find newly unlocked achievement
      const newlyUnlocked = currentAchievements.find(
        (a: Achievement) => a.unlocked && !previousUnlocked.has(a.id)
      );

      if (newlyUnlocked) {
        // Update state
        setAchievements(currentAchievements);
        setPreviousUnlocked(prev => {
          const newSet = new Set(prev);
          newSet.add(newlyUnlocked.id);
          return newSet;
        });
        return newlyUnlocked;
      }

      return null;
    } catch (err) {
      console.error('Failed to check for new achievements:', err);
      return null;
    }
  }, [userId, previousUnlocked]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return {
    achievements,
    totalAchievements,
    unlockedCount,
    isLoading,
    error,
    refetch: fetchAchievements,
    checkNewAchievements,
  };
}
