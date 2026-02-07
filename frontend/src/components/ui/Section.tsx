import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}

export function Section({ children, className, variant = 'default' }: SectionProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900/50',
    primary: 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-900/50 border border-blue-100 dark:border-blue-800/50',
    success: 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900/50 border border-emerald-200 dark:border-emerald-800/50',
    warning: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900/50 border border-amber-200 dark:border-amber-800/50',
    info: 'bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-900/10 dark:to-slate-900/50 border border-cyan-200 dark:border-cyan-800/50',
  };
  
  return (
    <div className={cn('rounded-2xl p-6', variantStyles[variant], className)}>
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}

export function SectionHeader({ children, icon, className, variant = 'default' }: SectionHeaderProps) {
  const variantStyles = {
    default: 'text-slate-400',
    primary: 'text-blue-500 dark:text-blue-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-cyan-600 dark:text-cyan-400',
  };
  
  return (
    <h3 className={cn(
      'text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2',
      variantStyles[variant],
      className
    )}>
      {icon}
      {children}
    </h3>
  );
}

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2 className={cn('text-3xl font-bold text-slate-900 dark:text-white mb-4', className)}>
      {children}
    </h2>
  );
}

interface SectionDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function SectionDescription({ children, className }: SectionDescriptionProps) {
  return (
    <p className={cn('text-lg text-slate-600 dark:text-slate-400 leading-relaxed', className)}>
      {children}
    </p>
  );
}
