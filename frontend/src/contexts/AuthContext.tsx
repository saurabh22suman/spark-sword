"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name: string;
  picture?: string;
  user_id: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Resolve API URL: fallback to empty string (relative) so Next.js rewrites proxy to backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check for auth via cookie (set by backend, shared across subdomains)
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        credentials: 'include',  // Important: sends cookies cross-origin
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // Redirect to backend OAuth endpoint (relative URL proxied by Next.js rewrites)
    window.location.href = `${API_BASE}/api/auth/login`;
  };

  const logout = async () => {
    try {
      // Call logout endpoint (clears cookie on backend)
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',  // Important: sends cookies to clear
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear local state
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        login, 
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
