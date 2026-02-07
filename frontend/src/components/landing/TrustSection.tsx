'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui';

const stats = [
  { label: 'Active Users', value: '2,000+' },
  { label: 'Queries Simulated', value: '150k+' },
  { label: 'Cloud Costs Saved', value: '$500k+' },
];

export function TrustSection() {
  return (
    <section className="py-12 border-y border-slate-800 bg-slate-950/50">
      <div className="container px-4 mx-auto text-center">
        <div className="mb-8">
          <Badge variant="default" size="md" className="bg-transparent border-transparent text-slate-500">
            Trusted by Data Engineering teams at
          </Badge>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Mock Logos - Text for now */}
          {['Databricks', 'Netflix', 'Uber', 'Airbnb', 'Spotify'].map((company) => (
            <span key={company} className="text-xl font-bold font-mono text-slate-400 hover:text-white transition-colors cursor-default">
              {company}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 border-t border-slate-800 pt-12 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
               <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
               <div className="text-sm text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
