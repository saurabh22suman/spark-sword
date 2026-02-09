'use client';

import Link from 'next/link';
import { ArrowRight, Upload, Play, BookOpen, Zap, Sparkles } from 'lucide-react';
import { PageContainer, PageHeader, Card, CardContent, IconBox, Button, GradientText } from '@/components/ui';

export default function DashboardPage() {
  const features = [
    {
      title: 'Upload Event Log',
      description: 'Analyze your Spark event logs to understand execution patterns',
      href: '/upload',
      icon: Upload,
      color: 'blue' as const,
    },
    {
      title: 'DataFrame Playground',
      description: 'Simulate transformations without running actual Spark jobs',
      href: '/playground',
      icon: Play,
      color: 'green' as const,
    },
    {
      title: 'Interactive Tutorials',
      description: 'Learn Spark optimization through guided scenarios',
      href: '/tutorials',
      icon: BookOpen,
      color: 'purple' as const,
    },
    {
      title: 'Real-Life Scenarios',
      description: 'Explore common optimization challenges with solutions',
      href: '/scenarios',
      icon: Zap,
      color: 'amber' as const,
    },
    {
      title: 'Expert Tools',
      description: 'Advanced simulators: AQE, DPP, bucketing, and more',
      href: '/expert',
      icon: Sparkles,
      color: 'purple' as const,
    },
  ];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={<GradientText variant="primary">Welcome to Spark Sword</GradientText>}
        description="Choose where you'd like to start your Spark optimization journey"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className="group">
            <Card variant="default" hover className="h-full smooth-transition hover:shadow-xl hover:scale-[1.02] glass-sm">
              <CardContent className="p-4 sm:p-8">
                <div className="flex items-start gap-4">
                  <IconBox icon={feature.icon} variant={feature.color} size="lg" className="group-hover:scale-110 smooth-transition shadow-lg" />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-gradient smooth-transition">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">{feature.description}</p>
                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                      <span>Get Started</span>
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 smooth-transition" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card variant="gradient" className="mt-8 sm:mt-12 bg-gradient-to-br from-blue-50 via-purple-50/30 to-pink-50/20 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/10 glass shadow-xl smooth-transition hover:shadow-2xl hover:scale-[1.01]">
        <CardContent className="p-4 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            New to Spark Optimization?
          </h2>
          <p className="text-slate-700 dark:text-slate-300 mb-6">
            Start with our interactive tutorials to learn the fundamentals of Spark execution and optimization strategies.
          </p>
          <Link href="/tutorials">
            <Button variant="primary" size="lg" className="shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 smooth-transition hover:scale-105">
              <BookOpen className="mr-2 w-5 h-5" />
              Start Learning
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
