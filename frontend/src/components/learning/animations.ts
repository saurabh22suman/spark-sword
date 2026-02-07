/**
 * Learning Animation Utilities
 * 
 * Brilliant-style animations for learning interactions:
 * - Celebration for correct predictions
 * - Gentle correction for incorrect predictions
 * - Progressive concept reveals
 * - Insight moments
 */

import { Variants } from 'framer-motion';

/**
 * Celebration animation for correct predictions
 * Scale up briefly with spring physics
 */
export const CELEBRATION_ANIMATION: Variants = {
  initial: { scale: 1 },
  celebrate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.5,
      times: [0, 0.5, 1],
      ease: 'easeInOut',
    },
  },
};

/**
 * Gentle shake animation for incorrect predictions
 * Horizontal shake with decreasing amplitude
 */
export const GENTLE_CORRECTION: Variants = {
  initial: { x: 0 },
  shake: {
    x: [0, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

/**
 * Concept reveal animation
 * Fade in from below with spring
 */
export const CONCEPT_REVEAL: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

/**
 * Staggered children reveal
 * For progressive disclosure of multiple items
 */
export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

/**
 * Insight moment - highlight with glow
 */
export const INSIGHT_HIGHLIGHT: Variants = {
  initial: { 
    boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)',
  },
  highlight: {
    boxShadow: [
      '0 0 0 0 rgba(59, 130, 246, 0)',
      '0 0 0 8px rgba(59, 130, 246, 0.2)',
      '0 0 0 0 rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 1.5,
      times: [0, 0.5, 1],
      ease: 'easeInOut',
    },
  },
};

/**
 * Success checkmark animation
 */
export const SUCCESS_CHECKMARK: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: 'spring', duration: 0.6, bounce: 0 },
      opacity: { duration: 0.2 },
    },
  },
};

/**
 * Card flip animation for reveal
 */
export const CARD_FLIP: Variants = {
  front: {
    rotateY: 0,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
  back: {
    rotateY: 180,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

/**
 * Learning colors based on Brilliant style
 */
export const LEARNING_COLORS = {
  challenge: 'from-purple-500 to-pink-500',
  correct: 'from-green-500 to-emerald-500',
  incorrect: 'from-orange-500 to-amber-500',
  insight: 'from-blue-500 to-cyan-500',
  mastery: 'from-yellow-500 to-orange-500',
  neutral: 'from-slate-600 to-slate-700',
} as const;

/**
 * Confetti configuration for celebration
 */
export const CONFETTI_CONFIG = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
};

/**
 * Sound effects (optional - can be added later)
 */
export const LEARNING_SOUNDS = {
  correct: '/sounds/success.mp3',
  incorrect: '/sounds/try-again.mp3',
  reveal: '/sounds/reveal.mp3',
  achievement: '/sounds/achievement.mp3',
} as const;
