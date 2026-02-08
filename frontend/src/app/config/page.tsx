import { ConfigSimulator } from '@/components/config';
import { BeforeAfterComparison } from '@/components/comparison';
import { PageContainer, PageHeader } from '@/components/ui';

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
    <PageContainer>
      <PageHeader
        title={<span className="text-gradient">Spark Config Simulator</span>}
        description="Explore how different Spark configurations affect your jobs. Each config shows its benefits, trade-offs, and when it's most relevant."
      />
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 glass p-4 rounded-lg shadow-sm">
        Remember: Spark optimization is about <span className="text-gradient-warm font-semibold">trade-offs, not tricks</span>. 
        The best config depends on your specific workload, data size, and cluster resources.
      </p>

        {/* What-If Scenarios Section */}
        <div className="mb-12">
          <BeforeAfterComparison currentMetrics={sampleMetrics} />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200/50 dark:border-slate-800/50 my-8 shadow-sm" />

      {/* Config Simulator */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Configuration Explorer</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Adjust individual Spark configurations to understand their impact.
        </p>
      </div>
      <ConfigSimulator />
    </PageContainer>
  );
}
