'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, IconBox } from '@/components/ui';
import './landing-animations.css';

type SimulationState = 'idle' | 'running' | 'completed';
type Option = 'option1' | 'option2' | 'option3';

export function LandingInteractive() {
  const [activeSimulation, setActiveSimulation] = useState<Option | null>(null);
  const [simState, setSimState] = useState<SimulationState>('idle');
  const [showExplanation, setShowExplanation] = useState(false);

  // Simulation logic
  useEffect(() => {
    if (simState === 'running' && activeSimulation) {
      const timer = setTimeout(() => {
        setSimState('completed');
        setShowExplanation(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [simState, activeSimulation]);

  const runSimulation = (option: Option) => {
    setActiveSimulation(option);
    setSimState('running');
    setShowExplanation(false);
  };

  const getExecutorClass = (index: number) => {
    if (simState !== 'running') return '';
    
    if (activeSimulation === 'option1') {
      // Skewed: Executor 0 overloaded, others idle
      return index === 0 ? 'overloaded bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-700 text-slate-400';
    }
    if (activeSimulation === 'option2') {
      // Optimized: All balanced
      return 'active bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]';
    }
    return '';
  };

  return (
    <section className="py-24 bg-slate-50 border-y border-slate-200 relative overflow-hidden">
      {/* Ambient background glow - Light Mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100 rounded-full blur-[100px] opacity-60 -z-10 pointer-events-none" />

      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Don&apos;t memorize. <span className="text-blue-600">Simulate.</span>
            </h2>
            <p className="text-slate-600 text-lg">
              Experience the &quot;Aha!&quot; moments of distributed computing without the cluster costs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* Interactive Control Panel - Light Mode Glass Version */}
            <Card variant="glass" padding="lg" className="glass-card">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 mb-6">
                  <IconBox icon={Zap} variant="warning" size="sm" className="bg-yellow-100 text-yellow-600" />
                  <div>
                    <h3 className="text-slate-900 font-semibold">The Skew Problem</h3>
                    <p className="text-xs text-slate-500">Optimization Challenge #1</p>
                  </div>
                </div>

              <p className="text-slate-700 mb-6 text-sm leading-relaxed">
                You have a 100GB dataset keyed by <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs border border-slate-200">user_id</code>. Key distribution is highly skewed (one user has 20GB). 
                Which strategy prevents OOM errors?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => runSimulation('option1')}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-300 relative group overflow-hidden ${
                    activeSimulation === 'option1' 
                      ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-300 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                  }`}
                >
                  <div className="relative z-10 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-800">Default Shuffle</span>
                    {activeSimulation === 'option1' && simState === 'running' && <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />}
                    {activeSimulation === 'option1' && simState === 'completed' && <X className="w-5 h-5 text-red-500" />}
                  </div>
                </button>

                <button
                  onClick={() => runSimulation('option2')}
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-300 relative group overflow-hidden ${
                    activeSimulation === 'option2' 
                      ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                  }`}
                >
                  <div className="relative z-10 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-800">Salting (Random Prefix)</span>
                    {activeSimulation === 'option2' && simState === 'running' && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                    {activeSimulation === 'option2' && simState === 'completed' && <Check className="w-5 h-5 text-green-500" />}
                  </div>
                </button>
              </div>

              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 pt-6 border-t border-slate-200"
                  >
                    <p className={`text-sm ${activeSimulation === 'option2' ? 'text-green-600' : 'text-red-500'} font-semibold mb-2`}>
                      {activeSimulation === 'option2' ? 'Correct!' : 'OOM Error Detected'}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeSimulation === 'option2' 
                        ? "Salting the key distributes the massive user group across multiple executors, allowing parallel processing." 
                        : "One executor received the entire 20GB partition, causing it to run out of memory while others sat idle."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              </CardContent>
            </Card>

            {/* Visual Simulation Display - Kept Dark for "Terminal" Feel */}
            <Card variant="default" padding="lg" className="relative h-[400px] bg-slate-900 border-slate-800 flex flex-col justify-between overflow-hidden shadow-2xl">
              {/* Grid Background */}
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" />
              
              {/* Label */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Cluster State</span>
                {simState === 'running' && (
                  <span className="text-xs font-mono text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Processing
                  </span>
                )}
              </div>

              {/* Executors Visualization */}
              <div className="space-y-4 relative z-10">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                     <span className="text-xs font-mono text-slate-500 w-8">EX-{i}</span>
                     
                     {/* Executor Core (The Bar) */}
                     <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50">
                        {/* CSS Animated Bar */}
                        <div 
                          className={`h-full rounded-full executor-core transition-all duration-1000 ease-out 
                            ${getExecutorClass(i)}
                          `}
                          style={{ 
                            width: simState === 'idle' ? '0%' : 
                                   simState === 'running' ? 
                                       (activeSimulation === 'option1' && i === 0 ? '100%' : 
                                        activeSimulation === 'option1' ? '5%' : 
                                        '60%') 
                                   : (activeSimulation === 'option1' && i === 0 ? '100%' : 
                                      activeSimulation === 'option1' ? '5%' : '0%')
                          }}
                        />
                     </div>
                     
                     <span className="text-xs font-mono w-12 text-right text-slate-500">
                        {simState === 'running' ? 
                          (activeSimulation === 'option1' && i === 0 ? 'FAIL' : 
                           activeSimulation === 'option1' ? 'IDLE' : '60%') 
                          : '---'}
                     </span>
                  </div>
                ))}
              </div>

              {/* Data Flow Animation Layer (CSS) */}
              {simState === 'running' && (
                 <div className="absolute inset-0 pointer-events-none">
                    {activeSimulation === 'option2' ? (
                       // Balanced flow
                       Array.from({ length: 12 }).map((_, i) => (
                          <div 
                            key={i}
                            className="absolute w-2 h-2 bg-blue-400 rounded-full animate-flow-h shadow-[0_0_10px_rgba(96,165,250,0.8)]"
                            style={{ 
                               top: `${15 + Math.random() * 60}%`, 
                               left: '-10px',
                               animationDelay: `${Math.random() * 2}s`,
                               opacity: 0.8
                            }} 
                          />
                       ))
                    ) : (
                       // Skewed flow - all to top
                       Array.from({ length: 15 }).map((_, i) => (
                          <div 
                            key={i}
                            className="absolute w-3 h-3 bg-red-500 rounded-full animate-flow-h shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                            style={{ 
                               top: '25%', // Focused on top executor
                               left: '-10px',
                               animationDelay: `${Math.random() * 1.5}s`,
                               opacity: 0.9
                            }} 
                          />
                       ))
                    )}
                 </div>
              )}

              {/* Legend */}
              <div className="pt-4 border-t border-slate-800 flex gap-4 text-[10px] text-slate-500 font-mono">
                 <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div> Idle
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Balanced
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> OOM Risk
                 </div>
              </div>

            </Card>
          </div>

        </div>
      </div>
    </section>
  );
}
