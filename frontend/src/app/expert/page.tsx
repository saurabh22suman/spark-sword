'use client';

/**
 * Expert Tools Page
 * 
 * Advanced Spark simulators and visualizers for expert users.
 */

import { AQESimulator } from '@/components/expert/AQESimulator';
import { DPPVisualizer } from '@/components/expert/DPPVisualizer';
import { BucketingCalculator } from '@/components/expert/BucketingCalculator';
import { FormatBenchmark } from '@/components/expert/FormatBenchmark';

export default function ExpertPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-12">
        <AQESimulator />
        <DPPVisualizer />
        <BucketingCalculator />
        <FormatBenchmark />
      </div>
    </div>
  );
}
