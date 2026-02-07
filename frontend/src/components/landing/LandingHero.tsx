'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Play, Cpu, Zap } from 'lucide-react';
import { SparkExecutionAnimation } from './SparkExecutionAnimation';
import { Badge, Button, GradientText } from '@/components/ui';

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-slate-50">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" />
      </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Badge variant="success" className="gap-2 bg-white border-slate-200 shadow-sm text-slate-600 dark:text-slate-600">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              New: Interactive Cost Optimization Simulator
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6"
          >
            Learn <GradientText>PySpark</GradientText> by <br />
            <span className="relative inline-block">
              doing
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-blue-500 opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </span>
            , not watching.
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed"
          >
            Stop staring at execution plans you don&apos;t understand. Master Spark internals, 
            performance tuning, and architecture through interactive, crash-safe simulations.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/dashboard">
              <Button variant="primary" size="lg" className="shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)]">
                Start Learning Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm">
                <Play className="mr-2 w-4 h-4" />
                View Demo
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Hero Visual / Mock Screenshot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          {/* Window Frame (Keeping Dark for IDE feel, but lighter border) */}
          <div className="rounded-xl border border-slate-200 bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
            {/* Window Header */}
            <div className="flex items-center px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="mx-auto text-xs font-mono text-slate-400">spark-optimization-lab.py</div>
            </div>
            
            {/* Content Area */}
            <div className="relative bg-[#0F1117]"> {/* Custom dark background for editor */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              
              <div className="grid md:grid-cols-2">
                {/* Code Editor Side */}
                <div className="p-6 border-r border-slate-800 font-mono text-sm hidden md:block">
                  <div className="text-slate-500 mb-4"># Optimization Challenge: Fix the Shuffle</div>
                  <div className="space-y-1">
                    <div className="flex"><span className="text-slate-600 w-6">1</span><span className="text-purple-400">df</span> <span className="text-slate-400">=</span> <span className="text-blue-400">spark</span>.<span className="text-yellow-400">read</span>.<span className="text-yellow-400">parquet</span>(<span className="text-green-400">&quot;s3://logs/events&quot;</span>)</div>
                    <div className="flex"><span className="text-slate-600 w-6">2</span></div>
                    <div className="flex"><span className="text-slate-600 w-6">3</span><span className="text-slate-500"># ⚠️ This causes a massive shuffle</span></div>
                    <div className="flex"><span className="text-slate-600 w-6">4</span><span className="text-purple-400">result</span> <span className="text-slate-400">=</span> <span className="text-purple-400">df</span>.<span className="text-yellow-400">groupBy</span>(<span className="text-green-400">&quot;user_id&quot;</span>).<span className="text-yellow-400">count</span>()</div>
                    <div className="flex"><span className="text-slate-600 w-6">5</span></div>
                    <div className="flex"><span className="text-slate-600 w-6">6</span><span className="text-purple-400">result</span>.<span className="text-yellow-400">explain</span>()</div>
                  </div>
                  
                  <div className="mt-8 p-4 rounded bg-slate-800/50 border border-slate-700/50 relative group cursor-pointer hover:border-purple-500/50 transition-colors">
                    <div className="absolute -top-3 left-4">
                      <Badge size="sm" className="bg-purple-500 text-white border-purple-500">
                        Suggestion
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">
                      Detected extensive shuffle on high-cardinality column &quot;user_id&quot;. 
                    </p>
                    <div className="text-blue-400 text-xs font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Apply salting strategy
                    </div>
                  </div>
                </div>

                {/* Execution/Visual Side */}
                <div className="p-6 bg-slate-900/30 relative overflow-hidden min-h-[300px] flex items-center justify-center">
                   <SparkExecutionAnimation className="w-full max-w-[320px] shadow-none bg-transparent" />
                   
                   {/* Overlay UI elements to mimic playground tools */}
                   <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <div className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                         <Cpu className="w-3 h-3 text-blue-400" /> Executor 1: 85%
                      </div>
                      <div className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                         <Cpu className="w-3 h-3 text-green-400" /> Executor 2: 42%
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reflection/Glow below */}
          <div className="absolute -bottom-20 left-10 right-10 h-20 bg-blue-500/20 blur-[60px] opacity-20" />
        </motion.div>
      </div>
    </section>
  );
}
