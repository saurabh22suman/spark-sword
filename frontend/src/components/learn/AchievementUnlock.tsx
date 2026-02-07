'use client';

/**
 * Achievement Unlock Animation Component
 * 
 * Celebratory animation when user unlocks an achievement
 * Brilliant-style feedback with confetti and scale effects
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon_name: string;
}

interface AchievementUnlockProps {
  achievement: Achievement | null;
  onClose: () => void;
  show: boolean;
}

export function AchievementUnlock({ achievement, onClose, show }: AchievementUnlockProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; rotation: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.3,
      }));
      setConfetti(particles);

      // Auto-close after 5 seconds
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Confetti */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                y: '50%', 
                x: `${particle.x}%`,
                opacity: 1,
                scale: 0,
              }}
              animate={{ 
                y: ['-10%', '110%'],
                rotate: [0, particle.rotation],
                opacity: [1, 1, 0],
                scale: [0, 1, 1],
              }}
              transition={{ 
                duration: 2,
                delay: particle.delay,
                ease: "easeOut"
              }}
              className={cn(
                "absolute w-3 h-3 rounded-full",
                particle.id % 3 === 0 ? "bg-amber-400" : 
                particle.id % 3 === 1 ? "bg-yellow-500" :
                "bg-orange-400"
              )}
              style={{ top: 0 }}
            />
          ))}

          {/* Achievement Card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15 
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full"
          >
            <Card className="border-4 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/40 dark:via-yellow-900/40 dark:to-orange-900/40 overflow-hidden">
              <CardContent className="p-8 text-center relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ 
                    duration: 0.6,
                    times: [0, 0.6, 1],
                    delay: 0.2
                  }}
                  className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center relative"
                >
                  <Trophy className="w-12 h-12 text-white" />
                  
                  {/* Sparkles */}
                  <motion.div
                    animate={{ 
                      rotate: 360,
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute inset-0"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-2 -right-2" />
                    <Sparkles className="w-4 h-4 text-amber-300 absolute -bottom-1 -left-1" />
                  </motion.div>
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-200 mb-2">
                    🎉 Achievement Unlocked!
                  </h2>
                  <h3 className="text-xl font-semibold text-amber-800 dark:text-amber-300 mb-3">
                    {achievement.title}
                  </h3>
                  <p className="text-amber-700 dark:text-amber-400 leading-relaxed mb-6">
                    {achievement.description}
                  </p>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onClose}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                  >
                    Awesome! 🚀
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
