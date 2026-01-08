import { ConfigSimulator } from '@/components/config';
import { BeforeAfterComparison } from '@/components/comparison';

// Sample metrics to demonstrate what-if scenarios
// In production, these would come from an uploaded event log
const sampleMetrics = {
  shuffleBytes: 500 * 1024 * 1024, // 500MB
  spillBytes: 50 * 1024 * 1024, // 50MB spill
  taskDurationMs: 45000, // 45 seconds
  partitions: 200,
  stages: 8,
};

export default function ConfigPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Spark Config Simulator</h1>
          <p className="text-slate-400 max-w-2xl">
            Explore how different Spark configurations affect your jobs. Each config shows
            its benefits, trade-offs, and when it&apos;s most relevant.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Remember: Spark optimization is about <span className="text-yellow-400">trade-offs, not tricks</span>. 
            The best config depends on your specific workload, data size, and cluster resources.
          </p>
        </div>

        {/* What-If Scenarios Section */}
        <div className="mb-12">
          <BeforeAfterComparison currentMetrics={sampleMetrics} />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 my-8" />

        {/* Config Simulator */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Configuration Explorer</h2>
          <p className="text-slate-400">
            Adjust individual Spark configurations to understand their impact.
          </p>
        </div>
        <ConfigSimulator />
      </div>
    </main>
  );
}
