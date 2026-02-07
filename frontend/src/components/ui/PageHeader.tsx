import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string | ReactNode;
  description?: string | ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-12', className)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          {(icon || badge) && (
            <div className="flex items-center gap-3 mb-4">
              {icon && <span className="text-3xl">{icon}</span>}
              {badge}
            </div>
          )}
          
          {typeof title === 'string' ? (
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              {title}
            </h1>
          ) : (
            title
          )}
        </div>
        
        {actions && (
          <div className="shrink-0">
            {actions}
          </div>
        )}
      </div>
      
      {description && (
        <div className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
      )}
    </div>
  );
}
