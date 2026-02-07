'use client';

/**
 * Custom hook for user progress tracking
 * 
 * Manages tutorial completion and prediction attempts
 */

import { useState, useCallback } from 'react';

interface UseProgressReturn {
  markComplete: (tutorialId: string) => Promise<void>;
  recordPrediction: (tutorialId: string, selectedIndex: number, correct: boolean, timeTaken: number, hintsUsed: number) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function useProgress(userId: string = 'default-user'): UseProgressReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markComplete = useCallback(async (tutorialId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/progress/${userId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorial_id: tutorialId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark tutorial complete');
      }

      const data = await response.json();
      
      // Return the response so caller can check for new achievements
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  const recordPrediction = useCallback(async (
    tutorialId: string,
    selectedIndex: number,
    correct: boolean,
    timeTaken: number,
    hintsUsed: number
  ) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/progress/${userId}/prediction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorial_id: tutorialId,
          selected_index: selectedIndex,
          correct,
          time_taken_seconds: timeTaken,
          hints_used: hintsUsed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record prediction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to record prediction:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  return {
    markComplete,
    recordPrediction,
    isSubmitting,
    error,
  };
}
