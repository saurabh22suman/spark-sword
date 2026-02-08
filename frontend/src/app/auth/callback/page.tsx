"use client"

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * OAuth callback handler page.
 * 
 * After successful Google OAuth, backend redirects here with token.
 * Backend also sets HttpOnly cookie for cross-subdomain auth.
 * This page just redirects to dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');

    if (error) {
      console.error('Authentication error:', error);
      router.push('/?auth_error=' + error);
      return;
    }

    // Token is already set as HttpOnly cookie by backend
    // Just redirect to dashboard
    router.push('/dashboard');
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔐</div>
        <p className="text-slate-400">Completing authentication...</p>
        <p className="text-xs text-slate-500 mt-2">You can now use this account across all PrepRabbit subdomains</p>
      </div>
    </div>
  );
}
