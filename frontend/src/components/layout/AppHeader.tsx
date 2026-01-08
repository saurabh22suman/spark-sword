'use client';

/**
 * App Header Component
 * 
 * Global header with navigation and learning mode toggle.
 */

import Link from 'next/link';
import { LearningModeToggle } from '@/components/learning';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-white font-bold">
            <span className="text-xl">⚔️</span>
            <span>Spark-Sword</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link 
              href="/upload" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Upload
            </Link>
            <Link 
              href="/playground" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Playground
            </Link>
            <Link 
              href="/config" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Config
            </Link>
            
            {/* Learning Mode Toggle */}
            <LearningModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
