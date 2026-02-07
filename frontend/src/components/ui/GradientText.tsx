import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'purple' | 'rainbow';
  className?: string;
}

export function GradientText({ children, variant = 'primary', className }: GradientTextProps) {
  const gradients = {
    primary: 'from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400',
    success: 'from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400',
    warning: 'from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400',
    purple: 'from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400',
    rainbow: 'from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400',
  };
  
  return (
    <span className={cn(
      'bg-clip-text text-transparent bg-gradient-to-r',
      gradients[variant],
      className
    )}>
      {children}
    </span>
  );
}
