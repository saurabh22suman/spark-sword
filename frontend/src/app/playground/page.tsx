import { PlaygroundV3 } from '@/components/playground';
import Link from 'next/link';

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-400 mb-2 inline-block">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">DataFrame Shape Playground</h1>
          <p className="text-slate-400 max-w-3xl">
            Develop intuition for how Spark reacts to data shape and operations. 
            Build operation chains, see the execution DAG, and understand trade-offs.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            ⚡ <span className="text-yellow-400">Everything is simulation</span> — no actual Spark execution. 
            Results are estimates based on typical Spark behavior.
          </p>
        </div>

        {/* Playground v3 */}
        <PlaygroundV3 />
      </div>
    </main>
  );
}
