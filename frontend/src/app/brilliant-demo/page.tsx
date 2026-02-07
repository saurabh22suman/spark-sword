'use client';

/**
 * Brilliant-Style Learning Demo
 * 
 * Showcase of all new learning components in action
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap } from 'lucide-react';
import { Card, CardContent, Badge, Button, PageContainer, PageHeader } from '@/components/ui';
import {
  PredictionChallenge,
  ConceptRevealer,
  MythBuster,
  SparkTerm,
} from '@/components/learning';
import { PartitionFundamentalsTutorial } from '@/components/tutorials/PartitionFundamentalsTutorial';
import type { PredictionChallenge as PredictionChallengeType, ConceptStep, Myth } from '@/types/learning';

type DemoView = 'intro' | 'prediction' | 'revealer' | 'myth' | 'tutorial';

export default function BrilliantDemoPage() {
  const [view, setView] = useState<DemoView>('intro');

  // Sample prediction challenge
  const sampleChallenge: PredictionChallengeType = {
    id: 'shuffle-prediction',
    question: 'What happens when you call .groupBy() on a 10GB DataFrame?',
    context: 'The DataFrame is currently distributed across 200 partitions.',
    options: [
      {
        id: 'no-shuffle',
        label: 'No shuffle — processed in place',
        description: 'Data stays where it is',
      },
      {
        id: 'shuffle',
        label: 'Full shuffle across network',
        description: 'All data moves between executors',
      },
      {
        id: 'partial',
        label: 'Partial shuffle — only some data moves',
        description: 'Optimized movement',
      },
    ],
    correctAnswerId: 'shuffle',
    explanation: 'groupBy() triggers a full shuffle because rows with the same key must land on the same partition. This means network transfer, disk spills, and serialization overhead.',
    commonMisconception: 'Some think Spark can group data "in place" without moving it. This is impossible - rows with the same key are initially scattered across different partitions.',
    relatedConcepts: ['shuffle', 'wide transformation', 'network cost'],
    difficulty: 'medium',
  };

  // Sample concept steps
  const sampleSteps: ConceptStep[] = [
    {
      id: 'narrow-transformation',
      title: 'Narrow Transformations',
      concept: 'Operations that work on one partition at a time',
      explanation: 'Narrow transformations like map(), filter(), and select() process each partition independently. No data needs to move between partitions.',
      keyTakeaway: 'Narrow = No shuffle = Fast',
    },
    {
      id: 'wide-transformation',
      title: 'Wide Transformations',
      concept: 'Operations that require data from multiple partitions',
      explanation: 'Wide transformations like groupBy(), join(), and repartition() need to reorganize data. This requires a shuffle - moving data across the network.',
      keyTakeaway: 'Wide = Shuffle = Expensive',
    },
    {
      id: 'why-shuffles-hurt',
      title: 'Why Shuffles Are Expensive',
      concept: 'Shuffles involve network, disk, and serialization',
      explanation: 'During a shuffle, Spark must: (1) Serialize data, (2) Write to disk, (3) Transfer over network, (4) Read from disk, (5) Deserialize. Each step adds latency.',
      keyTakeaway: 'Minimize shuffles by using pre-partitioned data and broadcast joins',
    },
  ];

  // Sample myth
  const sampleMyth: Myth = {
    id: 'more-memory-faster',
    statement: 'Adding more memory always makes Spark jobs faster',
    category: 'Performance',
    truthValue: 'false',
    explanation: 'Memory helps avoid spills, but most Spark jobs are CPU or I/O bound, not memory bound. Adding memory beyond what\'s needed for your data provides no benefit. The real bottlenecks are usually shuffles, skew, or inefficient algorithms.',
    counterexample: 'A job with heavy shuffles will take the same time whether you have 8GB or 80GB per executor - the network transfer time dominates.',
    relatedScenarios: ['cache-oom'],
    relatedTutorials: ['memory-spills'],
  };

  return (
    <PageContainer className="max-w-5xl">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex justify-center"
        >
          <Badge variant="info" size="lg" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Brilliant-Style Learning
          </Badge>
        </motion.div>
        <PageHeader
          title="Interactive Learning Components"
          description="Predict before reveal • Progressive disclosure • Misconception addressing"
        />
      </div>

      {/* Navigation */}
      {view === 'intro' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          <Card
            variant="gradient"
            className="cursor-pointer hover:scale-105 transition-all"
            onClick={() => setView('prediction')}
          >
            <CardContent className="p-8">
              <Brain className="w-12 h-12 text-blue-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Prediction Challenge</h3>
              <p className="text-slate-400">
                Predict Spark&apos;s behavior before seeing the answer
              </p>
            </CardContent>
          </Card>

          <Card
            variant="gradient"
            className="cursor-pointer hover:scale-105 transition-all"
            onClick={() => setView('revealer')}
          >
            <CardContent className="p-8">
              <Zap className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Concept Revealer</h3>
              <p className="text-slate-400">
                Step-by-step progressive concept disclosure
              </p>
            </CardContent>
          </Card>

          <Card
            variant="gradient"
            className="cursor-pointer hover:scale-105 transition-all"
            onClick={() => setView('myth')}
          >
            <CardContent className="p-8">
              <Sparkles className="w-12 h-12 text-orange-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Myth Buster</h3>
              <p className="text-slate-400">
                Interactive myth debunking with proof
              </p>
            </CardContent>
          </Card>

          <Card
            variant="gradient"
            className="cursor-pointer hover:scale-105 transition-all"
            onClick={() => setView('tutorial')}
          >
            <CardContent className="p-8">
              <Brain className="w-12 h-12 text-green-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Full Tutorial</h3>
              <p className="text-slate-400">
                Complete Brilliant-style learning experience
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Demo Content */}
      <Card variant="default">
        <CardContent className="p-8">
          {view === 'intro' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                How It Works
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                These components transform passive reading into active learning. Every interaction
                follows the Brilliant.org pattern: predict, reveal, explain, apply.
              </p>
              
              <Card variant="bordered" className="bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>Example:</strong> Hover over{' '}
                    <SparkTerm term="shuffle">shuffle</SparkTerm> or{' '}
                    <SparkTerm term="partition">partition</SparkTerm> to see contextual tooltips in action!
                  </p>
                </CardContent>
              </Card>

              <p className="text-slate-600 dark:text-slate-400">
                Click any card above to explore each component.
              </p>
            </div>
          )}

          {view === 'prediction' && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('intro')}
                className="mb-6"
              >
                ← Back
              </Button>
              <PredictionChallenge challenge={sampleChallenge} />
            </div>
          )}

          {view === 'revealer' && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('intro')}
                className="mb-6"
              >
                ← Back
              </Button>
              <ConceptRevealer steps={sampleSteps} />
            </div>
          )}

          {view === 'myth' && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('intro')}
                className="mb-6"
              >
                ← Back
              </Button>
              <MythBuster myth={sampleMyth} />
            </div>
          )}

          {view === 'tutorial' && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('intro')}
                className="mb-6"
              >
                ← Back
              </Button>
              <PartitionFundamentalsTutorial />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {view === 'intro' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid md:grid-cols-3 gap-6 text-center"
        >
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">5</div>
              <div className="text-sm text-slate-400">Core Components</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-400 mb-2">17</div>
              <div className="text-sm text-slate-400">Tutorials to Transform</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">∞</div>
              <div className="text-sm text-slate-400">Learning Possibilities</div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </PageContainer>
  );
}
