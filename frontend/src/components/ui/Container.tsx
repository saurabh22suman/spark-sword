import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function Container({ children, size = 'xl', className }: ContainerProps) {
  const sizeStyles = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };
  
  return (
    <div className={cn(
      'mx-auto w-full px-4 md:px-8',
      sizeStyles[size],
      className
    )}>
      {children}
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function PageContainer({ children, size = 'xl', className }: PageContainerProps) {
  return (
    <div className={cn('flex flex-col min-h-screen pt-24 pb-20', className)}>
      <Container size={size}>
        {children}
      </Container>
    </div>
  );
}
