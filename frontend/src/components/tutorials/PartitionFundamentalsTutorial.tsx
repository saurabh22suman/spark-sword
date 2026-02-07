'use client';

/**
 * Partition Fundamentals Tutorial — Brilliant Style
 * 
 * Wraps PartitionPlayground in Brilliant-style learning flow:
 * Challenge → Concepts → Interactive → Reflection
 */

import { BrilliantTutorial } from '@/components/learning';
import { PartitionPlayground } from '@/components/tutorials/PartitionPlayground';
import type { TutorialContent } from '@/types/learning';

// Simple partition visualization for challenge
function PartitionViz({ count, balanced }: { count: number; balanced: boolean }) {
  return (
    <div className="flex gap-1 items-end h-20">
      {Array.from({ length: count }).map((_, i) => {
        const height = balanced 
          ? 100 
          : i === 0 
            ? 100 
            : 20 + Math.random() * 30;
        
        return (
          <div
            key={i}
            className="flex-1 bg-blue-500 rounded-t"
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

const partitionTutorialContent: TutorialContent = {
  id: 'partition-fundamentals',
  title: 'Partition Fundamentals',
  subtitle: 'How data distributes across executors',
  estimatedMinutes: 8,
  difficulty: 'beginner',
  learningOutcome: 'Understand how Spark splits data and why partition count matters',
  prerequisites: ['spark-mental-model'],
  
  setup: {
    context: 'Spark splits your DataFrame into chunks called partitions. Each partition is processed by one task on one executor core. This is how Spark achieves parallelism.',
    motivation: 'Choosing the right partition count is crucial. Too few = underutilized cluster. Too many = scheduling overhead. This is where 70% of performance issues begin.',
  },
  
  challenge: {
    id: 'partition-distribution-challenge',
    question: 'You have 100GB of data across 2 partitions on a cluster with 100 cores. What happens?',
    context: 'Think about parallelism and how Spark processes partitions.',
    options: [
      {
        id: 'fast',
        label: '100x faster than 200 partitions',
        description: 'All 100 cores working in parallel',
        visual: <PartitionViz count={2} balanced={true} />,
      },
      {
        id: 'slow',
        label: 'Only 2 cores used, 98 cores idle',
        description: 'Spark can only process 2 tasks at once',
        visual: <PartitionViz count={2} balanced={true} />,
      },
      {
        id: 'depends',
        label: 'Depends on the transformation',
        description: 'Different operations behave differently',
      },
    ],
    correctAnswerId: 'slow',
    explanation: 'Spark processes one task per partition. With only 2 partitions, only 2 cores work at once - the other 98 sit idle! This is why "more partitions = more parallelism" (up to a point).',
    commonMisconception: 'Many believe Spark automatically splits work across all cores. It doesn\'t - it can only parallelize across partitions.',
    relatedConcepts: ['parallelism', 'task', 'executor'],
    difficulty: 'easy',
  },
  
  concepts: [
    {
      id: 'parallelism',
      title: 'Parallelism = Partition Count',
      concept: 'Spark achieves parallelism by processing partitions in parallel',
      explanation: 'Each partition becomes one task. Each task runs on one executor core. Therefore, max parallelism = min(partition count, total cores). If you have 100 cores but only 10 partitions, 90 cores sit idle.',
      keyTakeaway: 'Partition count determines your maximum parallelism level',
    },
    {
      id: 'partition-size',
      title: 'Partition Size Matters',
      concept: 'Ideal partition size: 100MB - 200MB',
      explanation: 'Too small (< 10MB) = scheduling overhead dominates. Too large (> 1GB) = memory pressure and spills. The sweet spot is 100-200MB per partition for most workloads.',
      keyTakeaway: 'Aim for 100-200MB partitions. Calculate: total_data_size / 150MB = ideal partition count',
    },
    {
      id: 'tradeoff',
      title: 'The Trade-off',
      concept: 'More partitions ≠ always better',
      explanation: 'Each partition adds overhead: task scheduling, serialization, metadata. With 100GB of data, 1 million tiny partitions would spend more time scheduling than processing. The goal is balance.',
      keyTakeaway: 'Balance parallelism (need enough partitions) with overhead (not too many)',
    },
  ],
  
  interactiveComponent: <PartitionPlayground />,
  
  reflection: {
    question: 'You have a 50GB DataFrame. Your cluster has 40 cores with 4GB memory per core. How many partitions would you choose and why?',
    guidedAnswer: 'Good answer includes: (1) Calculate based on size: 50GB / 150MB ≈ 340 partitions, (2) Consider cores: 340 partitions / 40 cores ≈ 8.5 tasks per core (reasonable), (3) Consider memory: each partition ≈ 150MB, well under 4GB limit. Final: 340-400 partitions is a good starting point.',
  },
  
  nextSteps: ['repartition-coalesce', 'shuffle-triggers'],
};

export function PartitionFundamentalsTutorial() {
  return (
    <BrilliantTutorial
      content={partitionTutorialContent}
      onComplete={(timeSpent, correct) => {
        console.log(`Tutorial completed in ${timeSpent}s, challenge ${correct ? 'correct' : 'incorrect'}`);
        // In production: save to backend
      }}
    />
  );
}
