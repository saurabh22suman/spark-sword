'use client';

import { motion } from 'framer-motion';
import { Network, Sliders, DollarSign, BookOpen } from 'lucide-react';
import { Card, CardContent, GradientText, IconBox } from '@/components/ui';

const features = [
  {
    title: "Visual Execution DAGs",
    description: "Don't just read the plan—see it. Watch data flow through stages, visualize shuffles, and spot bottlenecks instantly.",
    icon: Network,
    iconVariant: 'blue' as const,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-blue-500/5 to-transparent",
    border: "group-hover:border-blue-500/50"
  },
  {
    title: "Interactive Simulations",
    description: "Tweak standard configs like `spark.sql.shuffle.partitions` and see the immediate impact on job duration without starting a cluster.",
    icon: Sliders,
    iconVariant: 'purple' as const,
    className: "",
    bg: "bg-gradient-to-br from-purple-500/5 to-transparent",
    border: "group-hover:border-purple-500/50"
  },
  {
    title: "Cost Impact Analysis",
    description: "Translate 'seconds saved' into 'dollars saved'. Understand the cloud cost implications of skew and spill.",
    icon: DollarSign,
    iconVariant: 'green' as const,
    className: "",
    bg: "bg-gradient-to-br from-green-500/5 to-transparent",
    border: "group-hover:border-green-500/50"
  },
  {
    title: "Step-by-Step Tutorials",
    description: "Guided scenarios that take you from 'Out of Memory' to 'Highly Optimized' with explained solutions.",
    icon: BookOpen,
    iconVariant: 'yellow' as const,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-yellow-500/5 to-transparent",
    border: "group-hover:border-yellow-500/50"
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
        {/* Background Gradients */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
      
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Everything you need to <br/>
            <GradientText>master Spark internals</GradientText>
          </h2>
          <p className="text-slate-600 text-lg">
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
                className={`bg-slate-50 border-slate-200 hover:bg-white ${feature.border}`}
              >
                <div className={`absolute inset-0 rounded-2xl ${feature.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                
                <CardContent className="relative z-10 p-0">
                  <IconBox 
                    icon={feature.icon} 
                    variant={feature.iconVariant} 
                    size="md"
                    className="mb-6 group-hover:scale-110 transition-transform duration-300 bg-white border border-slate-100 shadow-sm"
                  />
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
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
