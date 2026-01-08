'use client';

/**
 * Demo Page - Feature 6: Sample Canonical Spark Job
 * 
 * Allows users to explore Spark analysis without uploading their own files.
 * Uses pre-built sample event log with known shuffle, skew, and join patterns.
 * 
 * Per must-have-spec.md:
 * - Clear labels: "Demo Data — Try uploading your own files for real analysis"
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDemo() {
      try {
        const response = await fetch('/api/demo');
        
        if (!response.ok) {
          throw new Error('Failed to load demo data');
        }
        
        const result = await response.json();
        
        // Store in sessionStorage for analysis page
        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        
        // Redirect to analysis page
        router.push('/analysis');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load demo');
        setLoading(false);
      }
    }
    
    loadDemo();
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl text-red-400 mb-4">Failed to Load Demo</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Try Again
            </button>
            <Link
              href="/upload"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
            >
              Upload Your Own
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🎮</div>
        <h2 className="text-xl text-white mb-2">Loading Demo...</h2>
        <p className="text-slate-400 text-sm">
          Preparing sample Spark job for exploration
        </p>
        
        {/* Loading spinner */}
        <div className="mt-6">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </main>
  );
}
