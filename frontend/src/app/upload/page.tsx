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
import Link from 'next/link';

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
  const [fileType, setFileType] = useState<FileType | null>(null);

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
    setFileType(detectedType);

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
      
      // Store result in sessionStorage and redirect appropriately
      if (detectedType === 'notebook') {
        sessionStorage.setItem('inferredIntent', JSON.stringify(result));
        router.push('/intent');
      } else {
        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        router.push('/analysis');
      }
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
    setFileType(null);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold">
              <span className="text-orange-500">Spark</span>
              <span className="text-yellow-500">-Sword</span>
            </h1>
          </Link>
          <h2 className="text-2xl font-semibold text-white mb-2">
            Upload Spark Files
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Upload event logs to analyze past executions, or notebooks to 
            extract intent and explore hypothetical scenarios.
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          {uploadState === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                p-12 border-2 border-dashed rounded-xl cursor-pointer
                transition-all duration-200 text-center
                ${isDragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,.log,.ipynb,.py"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="text-5xl mb-4">📁</div>
              <p className="text-lg text-white mb-2">
                Drop your file here
              </p>
              <p className="text-sm text-slate-400 mb-4">
                or click to browse
              </p>
              
              {/* File types info */}
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Event Logs (analyze past runs)</p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 bg-slate-800 rounded">.json</span>
                    <span className="px-2 py-1 bg-slate-800 rounded">.txt</span>
                    <span className="px-2 py-1 bg-slate-800 rounded">.log</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Notebooks (extract intent)</p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 bg-purple-900/50 border border-purple-700/50 rounded">.ipynb</span>
                    <span className="px-2 py-1 bg-purple-900/50 border border-purple-700/50 rounded">.py</span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-slate-500">
                Max 100MB
              </div>
            </div>
          )}

          {(uploadState === 'uploading' || uploadState === 'analyzing') && (
            <div className="p-12 bg-slate-900/50 border border-slate-700 rounded-xl text-center">
              <div className="text-5xl mb-4 animate-pulse">
                {uploadState === 'uploading' ? '⬆️' : (fileType === 'notebook' ? '🔍' : '📊')}
              </div>
              <p className="text-lg text-white mb-2">
                {uploadState === 'uploading' 
                  ? 'Uploading...' 
                  : (fileType === 'notebook' 
                      ? 'Extracting intent...' 
                      : 'Analyzing execution...')}
              </p>
              {fileName && (
                <p className="text-sm text-slate-400 mb-4">{fileName}</p>
              )}
              
              {/* Progress bar */}
              <div className="w-full max-w-sm mx-auto bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">{progress}%</p>
            </div>
          )}

          {uploadState === 'error' && error && (
            <div className="p-12 bg-slate-900/50 border border-red-500/50 rounded-xl text-center">
              <div className="text-5xl mb-4">❌</div>
              <p className="text-lg text-red-400 mb-2">{error.title}</p>
              <p className="text-sm text-slate-400 mb-6">{error.detail}</p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="max-w-2xl mx-auto mt-12">
          <h3 className="text-lg font-semibold text-white mb-4">
            Where to find event logs
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-orange-400 mb-2">
                Databricks
              </h4>
              <p className="text-xs text-slate-400">
                Cluster UI → Spark UI → Event Log tab → Download
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-orange-400 mb-2">
                Local Spark
              </h4>
              <p className="text-xs text-slate-400">
                Set <code className="text-slate-300">spark.eventLog.enabled=true</code> and check <code className="text-slate-300">spark.eventLog.dir</code>
              </p>
            </div>
          </div>
        </div>

        {/* Data Privacy */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-xs text-slate-500">
            🔒 Your data stays private. Event logs are processed locally and never stored on our servers.
          </p>
        </div>
      </div>
    </main>
  );
}
