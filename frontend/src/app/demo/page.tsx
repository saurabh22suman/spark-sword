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
import { Card, CardContent, Button, PageContainer } from '@/components/ui';

export default function DemoPage() {
  const router = useRouter();
  const [_loading, setLoading] = useState(true);
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
      <PageContainer className="min-h-screen flex items-center justify-center">
        <Card variant="default" className="max-w-md">
          <CardContent className="text-center py-8">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl text-red-400 mb-4">Failed to Load Demo</h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => window.location.reload()}
                variant="secondary"
                size="md"
              >
                Try Again
              </Button>
              <Link href="/upload">
                <Button variant="primary" size="md">
                  Upload Your Own
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="min-h-screen flex items-center justify-center">
      <Card variant="glass">
        <CardContent className="text-center py-8">
          <div className="text-5xl mb-4 animate-pulse">🎮</div>
          <h2 className="text-xl text-white mb-2">Loading Demo...</h2>
          <p className="text-slate-400 text-sm">
            Preparing sample Spark job for exploration
          </p>
          
          {/* Loading spinner */}
          <div className="mt-6">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
