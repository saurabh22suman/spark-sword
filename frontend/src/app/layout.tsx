import type { Metadata } from 'next';
import './globals.css';
import { LearningModeProvider } from '@/lib/LearningModeContext';
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
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
          <LearningModeProvider>
            <NavBar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </LearningModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
