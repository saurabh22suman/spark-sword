import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface IconBoxProps {
  icon: LucideIcon | React.ElementType;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'orange' | 'pink' | 'cyan' | 'blue' | 'green' | 'amber' | 'red' | 'yellow' | 'slate' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBox({ icon: Icon, variant = 'default', size = 'md', className }: IconBoxProps) {
  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  const variantStyles = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    primary: 'bg-blue-500 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-yellow-500 text-white',
    danger: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
    pink: 'bg-pink-500 text-white',
    cyan: 'bg-cyan-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    amber: 'bg-amber-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    slate: 'bg-slate-500 text-white',
    indigo: 'bg-indigo-500 text-white',
  };
  
  return (
    <div className={cn(
      'rounded-xl flex items-center justify-center shrink-0',
      containerSizes[size],
      variantStyles[variant],
      className
    )}>
      <Icon className={iconSizes[size]} />
    </div>
  );
}
