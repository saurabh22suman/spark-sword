import { LandingHero } from "@/components/landing/LandingHero";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { LandingInteractive } from "@/components/landing/LandingInteractive";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, GradientText } from "@/components/ui";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      
      {/* Hero Section */}
      <LandingHero />

      {/* Key Features (Bento Grid) */}
      <FeaturesSection />

      {/* Interactive Myth Buster */}
      <LandingInteractive />

      {/* Bottom CTA */}
      <section className="py-24 relative overflow-hidden glass border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] dark:opacity-[0.05]" />
        <div className="container px-4 mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            <GradientText variant="primary">Ready to stop guessing?</GradientText>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join thousands of data engineers mastering Spark through simulation.
            No cluster required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" className="shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 smooth-transition hover:scale-105 glow-primary">
                Start Optimizing Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
