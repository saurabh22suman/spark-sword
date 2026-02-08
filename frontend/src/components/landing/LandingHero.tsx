'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Play, Cpu, Zap } from 'lucide-react';
import { SparkExecutionAnimation } from './SparkExecutionAnimation';
import { Badge, Button, GradientText } from '@/components/ui';

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Modern Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-blue-400/30 to-cyan-300/20 dark:from-blue-500/20 dark:to-cyan-500/10 rounded-full blur-[140px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-purple-400/30 to-pink-300/20 dark:from-purple-500/20 dark:to-pink-500/10 rounded-full blur-[140px] animate-blob animation-delay-2000" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-gradient-to-br from-indigo-300/20 to-blue-300/10 dark:from-indigo-500/10 dark:to-blue-500/5 rounded-full blur-[120px] animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] dark:opacity-[0.05]" />
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
            <Badge variant="success" className="gap-2 glass shadow-lg shadow-green-500/10 text-slate-700 dark:text-slate-300 hover:scale-105 smooth-transition cursor-pointer">
              <span className="flex h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse shadow-sm shadow-green-500/50" />
              New: Interactive Cost Optimization Simulator
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6"
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
            className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mb-6 sm:mb-10 leading-relaxed"
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
              <Button variant="primary" size="lg" className="shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 smooth-transition hover:scale-105 glow-primary">
                Start Learning Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="glass shadow-lg hover:shadow-xl smooth-transition hover:scale-105">
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
          className="mt-10 sm:mt-20 relative max-w-5xl mx-auto"
        >
          {/* Window Frame */}
          <div className="rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-slate-900 shadow-2xl shadow-slate-900/20 dark:shadow-black/40 overflow-hidden ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-sm smooth-transition hover:shadow-3xl hover:scale-[1.01]">
            {/* Window Header */}
            <div className="flex items-center px-4 py-3 glass-lg border-b border-slate-700/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-sm" />
              </div>
              <div className="mx-auto text-xs font-mono text-slate-300 tracking-wide">spark-optimization-lab.py</div>
            </div>
            
            {/* Content Area */}
            <div className="relative bg-[#0F1117]">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />
              
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
                  
                  <div className="mt-8 p-4 rounded-xl glass border border-purple-500/30 dark:border-purple-500/20 relative group cursor-pointer hover:border-purple-500/60 smooth-transition hover:scale-[1.02] shadow-lg shadow-purple-500/10">
                    <div className="absolute -top-3 left-4">
                      <Badge size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none shadow-md shadow-purple-500/30">
                        Suggestion
                      </Badge>
                    </div>
                    <p className="text-slate-300 text-xs mb-2">
                      Detected extensive shuffle on high-cardinality column &quot;user_id&quot;. 
                    </p>
                    <div className="text-blue-400 text-xs font-bold flex items-center gap-1 hover:text-blue-300 smooth-transition">
                      <Zap className="w-3 h-3" /> Apply salting strategy
                    </div>
                  </div>
                </div>

                {/* Execution/Visual Side */}
                <div className="p-6 bg-slate-900/30 relative overflow-hidden min-h-[300px] flex items-center justify-center">
                   <SparkExecutionAnimation className="w-full max-w-[320px] shadow-none bg-transparent" />
                   
                   {/* Overlay UI elements to mimic playground tools */}
                   <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <div className="px-3 py-1.5 rounded-lg glass border border-blue-500/20 text-xs text-slate-200 flex items-center gap-2 shadow-md hover:scale-105 smooth-transition">
                         <Cpu className="w-3 h-3 text-blue-400" /> Executor 1: 85%
                      </div>
                      <div className="px-3 py-1.5 rounded-lg glass border border-green-500/20 text-xs text-slate-200 flex items-center gap-2 shadow-md hover:scale-105 smooth-transition">
                         <Cpu className="w-3 h-3 text-green-400" /> Executor 2: 42%
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reflection/Glow below */}
          <div className="absolute -bottom-24 left-10 right-10 h-24 bg-gradient-to-t from-blue-500/20 via-purple-500/10 to-transparent blur-[80px] opacity-30" />
        </motion.div>
      </div>
    </section>
  );
}
