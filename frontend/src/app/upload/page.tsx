'use client';

/**
 * Event Log & Notebook Upload Page
 * 
 * Handles Spark event log file upload and redirects to analysis view.
 * Also handles notebook upload (.ipynb, .py) for intent extraction.
 * Supports both file upload and drag-and-drop.
 */

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'error';
type FileType = 'event-log' | 'notebook';

interface UploadError {
  title: string;
  detail: string;
}

/**
 * Determine file type from extension
 */
function getFileType(filename: string): FileType | null {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'json' || ext === 'txt' || ext === 'log') {
    return 'event-log';
  }
  if (ext === 'ipynb' || ext === 'py') {
    return 'notebook';
  }
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  // File type detection is done inline, we just use local variable
  
  const handleUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    setError(null);
    setUploadState('uploading');
    setProgress(0);

    // Determine file type
    const detectedType = getFileType(file.name);
    if (!detectedType) {
      setError({
        title: 'Unsupported file type',
        detail: 'Please upload .json, .txt, .log (event logs) or .ipynb, .py (notebooks)',
      });
      setUploadState('error');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError({
        title: 'File too large',
        detail: 'Files must be under 100MB.',
      });
      setUploadState('error');
      return;
    }

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Choose endpoint based on file type
      const endpoint = detectedType === 'notebook' 
        ? '/api/upload/notebook' 
        : '/api/upload/event-log';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Upload failed');
      }

      setProgress(100);
      setUploadState('analyzing');

      const result = await response.json();
      
      // Artificial delay for UX
      setTimeout(() => {
        if (detectedType === 'notebook') {
          sessionStorage.setItem('inferredIntent', JSON.stringify(result));
          router.push('/intent');
        } else {
          sessionStorage.setItem('analysisResult', JSON.stringify(result));
          router.push('/analysis');
        }
      }, 800);

    } catch (err) {
      clearInterval(progressInterval);
      setError({
        title: 'Upload failed',
        detail: err instanceof Error ? err.message : 'Unknown error occurred',
      });
      setUploadState('error');
    }
  }, [router]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleRetry = useCallback(() => {
    setUploadState('idle');
    setError(null);
    setProgress(0);
    setFileName(null);
  }, []);

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-5xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Upload Artifacts
          </span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg max-w-2xl mx-auto">
          Drop your Spark event logs to visualize execution, or upload a notebook to extract intent.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => uploadState !== 'uploading' && uploadState !== 'analyzing' && fileInputRef.current?.click()}
          className={cn(
            "relative group border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ease-in-out cursor-pointer overflow-hidden",
            isDragOver 
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]" 
              : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
            (uploadState === 'uploading' || uploadState === 'analyzing') && "pointer-events-none opacity-90"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json,.log,.txt,.ipynb,.py"
            onChange={handleFileSelect}
          />

          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            
            <AnimatePresence mode="wait">
              {uploadState === 'idle' || uploadState === 'error' ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center"
                >
                  <div className={cn(
                    "p-6 rounded-full mb-4 transition-colors",
                    isDragOver ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-white dark:bg-slate-700 shadow-sm text-slate-400 group-hover:text-blue-500 group-hover:scale-110 duration-300"
                  )}>
                    <Upload className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Click to upload or drag and drop
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Spark Logs (.json, .log) or Notebooks (.ipynb)
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-mono">
                    Max file size: 100MB
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center w-full max-w-sm"
                >
                  {uploadState === 'analyzing' ? (
                     <div className="p-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mb-6 animate-pulse">
                        <CheckCircle className="w-10 h-10" />
                     </div>
                  ) : (
                      <div className="p-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-6 animate-spin">
                        <Loader2 className="w-10 h-10" />
                      </div>
                  )}
                  
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {uploadState === 'uploading' ? 'Uploading...' : 'Analyzing Artifact...'}
                  </h3>
                  
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-4">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm font-mono text-slate-500 mt-2">{fileName}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-300">{error.title}</h4>
                <p className="text-sm text-red-700 dark:text-red-400/80">{error.detail}</p>
              </div>
              <button
                onClick={handleRetry}
                className="ml-auto text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Databricks Logs</h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    Download from <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Spark UI &gt; Event Log</span>.
                 </p>
                 <div className="flex gap-2">
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">.json</span>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">.zip</span>
                 </div>
            </div>
            <div className="p-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                 <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Intent Detection</h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    Upload a notebook to extract its structural shape and simulate optimization.
                 </p>
                 <div className="flex gap-2">
                    <span className="text-xs font-mono bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">.ipynb</span>
                    <span className="text-xs font-mono bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">.py</span>
                 </div>
            </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            🔒 Files are processed locally where possible and are discarded after your session.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
