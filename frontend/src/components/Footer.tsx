'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Github, Heart, Zap } from 'lucide-react';

const FOOTER_LINKS = [
  { href: '/upload', label: 'Upload' },
  { href: '/playground', label: 'Playground' },
  { href: '/tutorials', label: 'Tutorials' },
  { href: '/scenarios', label: 'Scenarios' },
];

export function Footer() {
  return (
    <footer role="contentinfo" className="mt-auto border-t border-slate-200/50 dark:border-slate-800/50 glass">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <div className="relative w-8 h-8 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 smooth-transition shadow-md group-hover:shadow-lg group-hover:shadow-blue-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight">
                Spark Sword
              </span>
            </Link>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md leading-relaxed">
              Learn Spark the way senior engineers teach it. No boring docs — just interactive 
              visualizations that make Spark&apos;s execution model click.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
              Explore
            </h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 smooth-transition text-sm hover:translate-x-1 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://spark.apache.org/docs/latest/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 smooth-transition text-sm hover:translate-x-1 inline-block"
                >
                  Spark Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/saurabh22suman"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 smooth-transition text-sm hover:translate-x-1 inline-flex items-center gap-1"
                >
                  <Github className="w-3 h-3" />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 dark:text-slate-500 text-sm">
              © {new Date().getFullYear()} Spark Sword. Learn Spark, don&apos;t fear it.
            </p>
            
            {/* Made with love */}
            <motion.div 
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
              whileHover={{ scale: 1.05 }}
            >
              <span>Made with</span>
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  repeatType: 'loop',
                }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </motion.div>
              <span>by</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                Soloengine
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
