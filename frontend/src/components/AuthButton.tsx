"use client"

import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, User, Trophy, BookOpen } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export function AuthButton() {
  const { user, isLoading, login, logout, isAuthenticated } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
        title={user?.name}
      >
        {user?.picture ? (
          <img 
            src={user.picture} 
            alt={user.name}
            className="w-8 h-8 rounded-full ring-2 ring-slate-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden md:inline text-sm text-slate-300">{user?.name}</span>
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                href="/learn"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Learning Path</span>
              </Link>

              <Link
                href="/achievements"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Trophy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Achievements</span>
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left"
              >
                <LogOut className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
