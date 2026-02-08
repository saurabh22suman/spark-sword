import type { Metadata } from 'next';
import './globals.css';
import { LearningModeProvider } from '@/lib/LearningModeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'PrepRabbit | Interactive Spark Learning Platform',
  description: 'The interactive alternative to Spark video tutorials. Learn Apache Spark and Databricks through hands-on simulations, real-time DAG visualization, and prediction-based learning. Master Spark optimization by doing, not watching.',
  keywords: ['Apache Spark', 'Databricks', 'PySpark', 'Spark Tutorial', 'Interactive Learning', 'Spark Optimization', 'Data Engineering', 'Spark UI', 'Spark Performance'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider>
            <LearningModeProvider>
              <NavBar />
              <main className="flex-1 relative">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />
                {children}
              </main>
              <Footer />
            </LearningModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
