import type { Metadata } from 'next';
import './globals.css';
import { LearningModeProvider } from '@/lib/LearningModeContext';
import { AppHeader } from '@/components/layout/AppHeader';

export const metadata: Metadata = {
  title: 'Spark-Sword | Spark Internals Explorer',
  description: 'Explain, Simulate, Suggest - Understand Spark like never before',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-spark-dark text-white min-h-screen">
        <LearningModeProvider>
          <AppHeader />
          {children}
        </LearningModeProvider>
      </body>
    </html>
  );
}
