"use client"

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * OAuth callback handler component.
 * 
 * After successful Google OAuth, backend redirects here with token.
 * Backend also sets HttpOnly cookie for cross-subdomain auth.
 * This component just redirects to dashboard.
 */
function AuthCallbackHandler() {
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

/**
 * Auth callback page with Suspense boundary.
 * Required for useSearchParams() in Next.js 14+.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔐</div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  );
}
