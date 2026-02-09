'use client';

/**
 * Individual Tutorial Page
 * 
 * Renders the interactive tutorial component based on the tutorial type.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, BookOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TutorialGroup, InteractiveTutorial, PredictionChallenge as PredictionChallengeType } from '@/types';
import { Card, CardContent, Badge, Button, PageContainer } from '@/components/ui';
import { useProgress, useAchievements, type Achievement } from '@/hooks';
import { AchievementUnlock } from '@/components/learn';

// Interactive Components
import { DAGVisualizer } from '@/components/tutorials/DAGVisualizer';
import { LazyEvalSimulator } from '@/components/tutorials/LazyEvalSimulator';
import { PartitionPlayground } from '@/components/tutorials/PartitionPlayground';
import { RepartitionDemo } from '@/components/tutorials/RepartitionDemo';
import { ShuffleTriggerMap } from '@/components/tutorials/ShuffleTriggerMap';
import { ShuffleCostSimulator } from '@/components/tutorials/ShuffleCostSimulator';
import { JoinStrategySimulator } from '@/components/tutorials/JoinStrategySimulator';
import { SkewExplosionDemo } from '@/components/tutorials/SkewExplosionDemo';
import { StragglerTimeline } from '@/components/tutorials/StragglerTimeline';
import { ExecutorMemorySimulator } from '@/components/tutorials/ExecutorMemorySimulator';
import { PlanTransformationViewer } from '@/components/tutorials/PlanTransformationViewer';
import { CodegenToggleDemo } from '@/components/tutorials/CodegenToggleDemo';
import { CacheGoneWrongDemo } from '@/components/tutorials/CacheGoneWrongDemo';
import { FileExplosionVisualizer } from '@/components/tutorials/FileExplosionVisualizer';
import { ConfigTradeoffSimulator } from '@/components/tutorials/ConfigTradeoffSimulator';
import { SparkUIWalkthrough } from '@/components/tutorials/SparkUIWalkthrough';
import { AQETutorial } from '@/components/tutorials/AQETutorial';
import { DPPTutorial } from '@/components/tutorials/DPPTutorial';
import { BucketingTutorial } from '@/components/tutorials/BucketingTutorial';
import { FormatBenchmarkTutorial } from '@/components/tutorials/FormatBenchmarkTutorial';
import { OOMDebugger } from '@/components/tutorials/OOMDebugger';
import { CorruptionDetective } from '@/components/tutorials/CorruptionDetective';
import { PredictionChallenge } from '@/components/tutorials/PredictionChallenge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Map component types to actual components
const COMPONENT_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'dag-visualizer': DAGVisualizer,
  'lazy-eval-simulator': LazyEvalSimulator,
  'partition-playground': PartitionPlayground,
  'repartition-demo': RepartitionDemo,
  'shuffle-trigger-map': ShuffleTriggerMap,
  'shuffle-cost-simulator': ShuffleCostSimulator,
  'join-strategy-simulator': JoinStrategySimulator,
  'skew-explosion-demo': SkewExplosionDemo,
  'straggler-timeline': StragglerTimeline,
  'executor-memory-simulator': ExecutorMemorySimulator,
  'plan-transformation-viewer': PlanTransformationViewer,
  'codegen-toggle-demo': CodegenToggleDemo,
  'cache-gone-wrong-demo': CacheGoneWrongDemo,
  'file-explosion-visualizer': FileExplosionVisualizer,
  'config-tradeoff-simulator': ConfigTradeoffSimulator,
  'spark-ui-walkthrough': SparkUIWalkthrough,
  'aqe-simulator': AQETutorial,
  'dpp-visualizer': DPPTutorial,
  'bucketing-calculator': BucketingTutorial,
  'format-benchmark': FormatBenchmarkTutorial,
  'oom-debugger': OOMDebugger,
  'corruption-detective': CorruptionDetective,
};

// Fallback component for tutorials not yet implemented
function ComingSoon({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-[400px] rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700",
      className
    )}>
      <div className="text-center p-8">
        <span className="text-6xl mb-4 block">🚧</span>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
          Coming Soon
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">
          This interactive tutorial is being built. Check back soon for a hands-on learning experience!
        </p>
      </div>
    </div>
  );
}

export default function TutorialPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const tutorialId = params.tutorialId as string;

  const [group, setGroup] = useState<TutorialGroup | null>(null);
  const [tutorial, setTutorial] = useState<InteractiveTutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChallenge, setShowChallenge] = useState(true);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [predictionStartTime, _setPredictionStartTime] = useState<number>(Date.now());
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const [selectedChallenge, setSelectedChallenge] = useState<PredictionChallengeType | null>(null);
  
  // Achievement state
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Hooks
  const { markComplete, recordPrediction } = useProgress();
  const { checkNewAchievements } = useAchievements();

  const handlePredictionComplete = async (correct: boolean, selectedIndex: number) => {
    const timeTaken = Math.floor((Date.now() - predictionStartTime) / 1000);
    
    // Record prediction attempt
    await recordPrediction(tutorial?.id || '', selectedIndex, correct, timeTaken, hintsUsedCount);
    
    // Check for new achievements
    const newAchievement = await checkNewAchievements();
    if (newAchievement) {
      setUnlockedAchievement(newAchievement);
      setShowAchievementModal(true);
    }
    
    setChallengeCompleted(true);
    setShowChallenge(false);
  };

  const handleTutorialComplete = async () => {
    if (!tutorial) return;
    
    try {
      await markComplete(tutorial.id);
      
      // Check for new achievements
      const newAchievement = await checkNewAchievements();
      if (newAchievement) {
        setUnlockedAchievement(newAchievement);
        setShowAchievementModal(true);
      }
    } catch (err) {
      console.error('Failed to mark tutorial complete:', err);
    }
  };

  useEffect(() => {
    if (!groupId) return;
    
    fetch(`${API_BASE}/api/tutorials/groups/${groupId}`)
      .then(res => res.json())
      .then(data => {
        setGroup(data);
        // Find the tutorial
        for (const topic of data.tutorial_topics || []) {
          const found = topic.tutorials.find((t: InteractiveTutorial) => t.id === tutorialId);
          if (found) {
            setTutorial(found);
            
            // Randomly select a challenge from question bank
            // Check array first, but only if it has items, otherwise fallback to singular
            const challenges = (found.prediction_challenges && found.prediction_challenges.length > 0) 
              ? found.prediction_challenges 
              : (found.prediction_challenge ? [found.prediction_challenge] : []);
            
            if (challenges.length > 0) {
              const randomIndex = Math.floor(Math.random() * challenges.length);
              setSelectedChallenge(challenges[randomIndex]);
            }
            
            break;
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [groupId, tutorialId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group || !tutorial) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🔍</span>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
            Tutorial Not Found
          </h2>
          <Link 
            href="/tutorials"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            ← Back to Tutorials
          </Link>
        </div>
      </div>
    );
  }

  const InteractiveComponent = COMPONENT_MAP[tutorial.component_type] || ComingSoon;

  return (
    <PageContainer className="pt-20 pb-16">
      {/* Back Navigation */}
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8"
      >
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => router.push('/tutorials')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tutorials
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="primary" size="sm">
            Group {group.number}
          </Badge>
          <span className="text-slate-400">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{group.title}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          {tutorial.title}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
          {tutorial.description}
        </p>
      </motion.div>

      {/* Learning Outcome Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card variant="bordered" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-1">What You&apos;ll Learn</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  {tutorial.learning_outcome}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Prediction Challenge (Brilliant-style) */}
      {selectedChallenge && showChallenge && !challengeCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <PredictionChallenge 
            challenge={selectedChallenge}
            onComplete={(correct: boolean, selectedIndex: number, hintsUsed: number) => {
              setHintsUsedCount(hintsUsed);
              handlePredictionComplete(correct, selectedIndex);
            }}
            onHintUsed={() => setHintsUsedCount(prev => prev + 1)}
          />
        </motion.div>
      )}

      {/* Interactive Component */}
      {(!selectedChallenge || challengeCompleted || !showChallenge) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: tutorial.prediction_challenge ? 0 : 0.2 }}
          className="mb-8"
        >
          <InteractiveComponent />
        </motion.div>
      )}

      {/* Refer Docs Button - Moved to end */}
      {(!selectedChallenge || challengeCompleted || !showChallenge) && tutorial.docs_url && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card variant="bordered" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300">Want to go deeper?</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200">Read the official Spark documentation for advanced details</p>
                  </div>
                </div>
                <a
                  href={tutorial.docs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" />
                  Refer docs for deep dive
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Complete Tutorial Button */}
      {challengeCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card variant="bordered" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-300 mb-1">
                    ✅ Tutorial Complete!
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Mark this tutorial as done to track your progress
                  </p>
                </div>
                <Button 
                  variant="primary"
                  onClick={handleTutorialComplete}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-400">
                  Ready to explore more?
                </span>
              </div>
              <Link href="/tutorials">
                <Button variant="primary">
                  Browse All Tutorials
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievement Unlock Modal */}
      <AchievementUnlock
        achievement={unlockedAchievement}
        show={showAchievementModal}
        onClose={() => {
          setShowAchievementModal(false);
          setUnlockedAchievement(null);
        }}
      />
    </PageContainer>
  );
}
