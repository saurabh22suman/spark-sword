'use client';

import { motion } from 'framer-motion';
import { Network, Sliders, DollarSign, BookOpen } from 'lucide-react';
import { Card, CardContent, GradientText } from '@/components/ui';
import { LucideIcon } from 'lucide-react';

const features = [
  {
    title: "Visual Execution DAGs",
    description: "Don't just read the plan—see it. Watch data flow through stages, visualize shuffles, and spot bottlenecks instantly.",
    icon: Network,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-blue-500/5 to-transparent",
    border: "group-hover:border-blue-500/50",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconGlow: "group-hover:shadow-blue-500/25",
    ringColor: "ring-blue-500/20",
  },
  {
    title: "Interactive Simulations",
    description: "Tweak standard configs like `spark.sql.shuffle.partitions` and see the immediate impact on job duration without starting a cluster.",
    icon: Sliders,
    className: "",
    bg: "bg-gradient-to-br from-purple-500/5 to-transparent",
    border: "group-hover:border-purple-500/50",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    iconGlow: "group-hover:shadow-purple-500/25",
    ringColor: "ring-purple-500/20",
  },
  {
    title: "Cost Impact Analysis",
    description: "Translate 'seconds saved' into 'dollars saved'. Understand the cloud cost implications of skew and spill.",
    icon: DollarSign,
    className: "",
    bg: "bg-gradient-to-br from-green-500/5 to-transparent",
    border: "group-hover:border-green-500/50",
    iconBg: "bg-green-500/10 dark:bg-green-500/20",
    iconColor: "text-green-600 dark:text-green-400",
    iconGlow: "group-hover:shadow-green-500/25",
    ringColor: "ring-green-500/20",
  },
  {
    title: "Step-by-Step Tutorials",
    description: "Guided scenarios that take you from 'Out of Memory' to 'Highly Optimized' with explained solutions.",
    icon: BookOpen,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-yellow-500/5 to-transparent",
    border: "group-hover:border-yellow-500/50",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconGlow: "group-hover:shadow-amber-500/25",
    ringColor: "ring-amber-500/20",
  },
];

function AnimatedIcon({ icon: Icon, bg, color, glow, ring }: { icon: LucideIcon; bg: string; color: string; glow: string; ring: string }) {
  return (
    <motion.div
      whileHover={{ rotate: [0, -8, 8, -4, 0] }}
      transition={{ duration: 0.5 }}
      className={`
        w-14 h-14 rounded-2xl ${bg} ${color} ${glow}
        flex items-center justify-center mb-6
        ring-1 ${ring}
        group-hover:scale-110 group-hover:shadow-lg
        transition-all duration-300 ease-out
      `}
    >
      <Icon className="w-7 h-7" strokeWidth={1.8} />
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
        {/* Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent opacity-50" />
      
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Everything you need to <br/>
            <GradientText>master Spark internals</GradientText>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Built for Data Engineers who want to move beyond &quot;it works&quot; to &quot;it works efficiently.&quot;
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group relative ${feature.className}`}
            >
              <Card 
                variant="default" 
                padding="lg" 
                hover
                className={`bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/70 ${feature.border}`}
              >
                <div className={`absolute inset-0 rounded-2xl ${feature.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                
                <CardContent className="relative z-10 p-0">
                  <AnimatedIcon 
                    icon={feature.icon}
                    bg={feature.iconBg}
                    color={feature.iconColor}
                    glow={feature.iconGlow}
                    ring={feature.ringColor}
                  />
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
