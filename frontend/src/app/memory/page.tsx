import { ExecutorMemoryDiagram } from '@/components/memory';
import Link from 'next/link';
import { LearningModeToggle } from '@/components/learning';
import { Card, CardHeader, CardTitle, CardContent, Button, PageContainer, PageHeader } from '@/components/ui';

export const metadata = {
  title: 'Executor Memory | PrepRabbit',
  description: 'Interactive diagram explaining how Spark executor memory works, including spills and caching trade-offs.',
};

export default function MemoryPage() {
  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm">← Back to Home</Button>
        </Link>
        <LearningModeToggle />
      </div>
      
      <PageHeader
        title="Executor Memory Diagram"
        description="Understand how Spark uses executor memory. See why spills happen, why caching can hurt, and why more memory doesn't always help."
      />
      
      <Card variant="bordered" className="mb-8">
        <CardContent className="p-4">
          <p className="text-sm text-slate-300">
            <span className="text-purple-400 font-medium">💡 Mental Model:</span>
            {' '}Think of the executor as a workroom with limited space.
            Active computations need desk space (execution memory).
            Cached data takes up shelf space (storage memory).
            When the room fills, things get pushed outside (spill to disk).
          </p>
        </CardContent>
      </Card>

      {/* Interactive Diagram */}
      <Card variant="glass" className="mb-8">
        <CardContent className="p-6">
          <ExecutorMemoryDiagram showPrediction={true} />
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-blue-400 text-sm">Why Spills Happen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              When execution memory fills up, Spark writes intermediate data to disk
              rather than failing. This slows things down but keeps the job running.
            </p>
          </CardContent>
        </Card>
        
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-purple-400 text-sm">Cache Trade-offs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Caching uses storage memory, which competes with execution.
              Too much cache = less room for shuffles and aggregations.
            </p>
          </CardContent>
        </Card>
        
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-orange-400 text-sm">Task Parallelism</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              More concurrent tasks = more parallelism, but each task needs memory.
              Sometimes fewer tasks run faster if memory is the bottleneck.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Resources */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-sm">Related Learning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/playground">
              <Button variant="secondary" size="sm">DataFrame Playground →</Button>
            </Link>
            <Link href="/tutorials">
              <Button variant="secondary" size="sm">Interactive Tutorials →</Button>
            </Link>
            <Link href="/scenarios">
              <Button variant="secondary" size="sm">Real-Life Scenarios →</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
