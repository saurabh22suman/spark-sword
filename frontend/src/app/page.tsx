import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-4xl text-center">
        {/* Logo */}
        <h1 className="text-6xl font-bold mb-4">
          <span className="text-spark-orange">Spark</span>
          <span className="text-spark-yellow">-Sword</span>
        </h1>
        
        <p className="text-2xl text-gray-300 mb-8">
          Spark Internals Explorer
        </p>
        
        {/* Tagline */}
        <div className="flex justify-center gap-8 mb-12">
          <div className="text-center">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-lg font-semibold">Explain</div>
            <p className="text-sm text-gray-400">Understand execution</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-lg font-semibold">Simulate</div>
            <p className="text-sm text-gray-400">What-if analysis</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">💡</div>
            <div className="text-lg font-semibold">Suggest</div>
            <p className="text-sm text-gray-400">Evidence-based insights</p>
          </div>
        </div>
        
        {/* CTA */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex justify-center gap-4">
            <Link
              href="/upload"
              className="bg-spark-orange hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Upload Event Log
            </Link>
            <Link
              href="/playground"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              DataFrame Playground
            </Link>
          </div>
          
          {/* Scenarios - Real-Life Learning */}
          <Link
            href="/scenarios"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>📚</span>
            <span>Learn with Real-Life Scenarios</span>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
              5 lessons
            </span>
          </Link>
          
          {/* Demo Mode - Feature 6 */}
          <Link
            href="/demo"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>🎮</span>
            <span>Try Demo Mode</span>
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
              No upload needed
            </span>
          </Link>
        </div>
        
        {/* Philosophy */}
        <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-3 text-spark-yellow">
            Our Philosophy
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Spark optimization is about <strong>trade-offs, not tricks</strong>.
            This tool exists to teach you how Spark thinks — 
            so you can outgrow the tool itself.
          </p>
          <p className="text-gray-400 text-xs mt-4 italic">
            We explain Spark. We never hallucinate Spark.
          </p>
        </div>
      </div>
    </main>
  );
}
