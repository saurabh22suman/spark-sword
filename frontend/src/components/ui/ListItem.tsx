import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ListItemProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'numbered' | 'success' | 'danger';
  number?: number;
  className?: string;
}

export function ListItem({ children, icon, variant = 'default', number, className }: ListItemProps) {
  const renderIcon = () => {
    if (icon) return <span className="shrink-0 mt-0.5">{icon}</span>;
    
    if (variant === 'numbered' && number !== undefined) {
      return (
        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
          {number}
        </span>
      );
    }
    
    if (variant === 'success') {
      return (
        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
          ✓
        </span>
      );
    }
    
    if (variant === 'danger') {
      return <span className="text-red-400 dark:text-red-500 shrink-0 mt-0.5">✗</span>;
    }
    
    return <span className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">•</span>;
  };
  
  return (
    <li className={cn('flex items-start gap-3 text-slate-700 dark:text-slate-300', className)}>
      {renderIcon()}
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

interface ListProps {
  children: ReactNode;
  className?: string;
}

export function List({ children, className }: ListProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {children}
    </ul>
  );
}
