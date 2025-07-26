'use client';

import { useState, useEffect, useCallback } from 'react';
import InputBar from './components/InputBar';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; status: 'uploading' | 'done' | 'error'; url?: string; error?: string }[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docActionMsg, setDocActionMsg] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadingFirstPrompt, setLoadingFirstPrompt] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!session?.user?.id) return;
    if (acceptedFiles.length === 1) {
      // Single file upload (backward compatible)
      const file = acceptedFiles[0];
      setUploadedFiles(prev => [...prev, { name: file.name, status: 'uploading' }]);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session.user.id);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        const result = data.results ? data.results[0] : data.document ? { name: file.name, status: 'done', url: data.document.path } : { name: file.name, status: 'error', error: data.error || 'Upload failed' };
        setUploadedFiles(prev => prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? result
            : f
        ));
      } catch (err: any) {
        setUploadedFiles(prev => prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? { name: file.name, status: 'error', error: err.message || 'Upload failed' }
            : f
        ));
      }
    } else if (acceptedFiles.length > 1) {
      // Multiple file upload
      for (const file of acceptedFiles) {
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'uploading' }]);
      }
      const formData = new FormData();
      for (const file of acceptedFiles) {
        formData.append('files', file);
      }
      formData.append('userId', session.user.id);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          setUploadedFiles(prev => prev.map(f => {
            const result = data.results.find((r: any) => r.name === f.name);
            return result ? result : f;
          }));
        } else {
          // fallback: mark all as error
          setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'error', error: 'Upload failed' })));
        }
      } catch (err: any) {
        setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'error', error: err.message || 'Upload failed' })));
      }
    }
  }, [session?.user?.id]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // Fetch user documents
  const fetchDocuments = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents/list?userId=${session.user.id}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) fetchDocuments();
  }, [session?.user?.id, fetchDocuments]);

  // After upload, refresh document list
  useEffect(() => {
    if (uploadedFiles.some(f => f.status === 'done')) {
      fetchDocuments();
    }
    // eslint-disable-next-line
  }, [uploadedFiles]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Preload chat page route for snappier navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.prefetch && router.prefetch('/c/placeholder');
    }
  }, [router]);

  if (status !== 'authenticated') {
    return null;
  }

  async function handleFirstPrompt(msg: string) {
    if (!session?.user?.id) {
      signIn();
      return;
    }
    setLoadingFirstPrompt(true);
    try {
      // Optimistically store the first message for the chat page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('optimisticFirstMessage', msg);
      }
      const sessionRes = await axios.post('/api/create_chat_session', { firstMessage: msg, userId: session.user.id });
      const { chatId } = sessionRes.data;
      // Mark this chat as just created for the chat page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('justCreatedChatId', chatId);
      }
      router.push(`/c/${chatId}`);
    } finally {
      setLoadingFirstPrompt(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center min-h-screen">
      <div className="flex flex-col items-center w-full">
        <h1 className="text-2xl font-medium text-white mb-6 text-center">What's on your mind today?</h1>
        {/* Attachment pills/cards UI */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 w-full max-w-2xl justify-start">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center bg-[#23242b] rounded-lg px-3 py-2 gap-2 shadow border border-gray-700">
                {/* File icon (PDF, etc.) */}
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-600 text-white font-bold text-xs">
                  {file.name.split('.').pop()?.toUpperCase() || 'DOC'}
                </span>
                <span className="truncate max-w-[120px] text-xs text-white">{file.name}</span>
                {file.status === 'uploading' && <span className="text-blue-400 text-xs">Uploading…</span>}
                {file.status === 'done' && <span className="text-green-400 text-xs">Uploaded</span>}
                {file.status === 'error' && <span className="text-red-400 text-xs">Error</span>}
                <button
                  className="ml-1 text-gray-400 hover:text-red-400 text-xs"
                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                  aria-label="Remove attachment"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mx-auto max-w-2xl w-full">
          <InputBar onSend={handleFirstPrompt} loading={loadingFirstPrompt} />
        </div>
        {/* Loading overlay for first prompt */}
        {loadingFirstPrompt && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 text-white text-xl font-semibold">
            <svg className="animate-spin w-10 h-10 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="#fff" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Creating your chat...
          </div>
        )}
      </div>
      <input {...getInputProps()} tabIndex={-1} className="hidden" />
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white text-2xl font-semibold pointer-events-none">
          Drop files to attach
        </div>
      )}
    </div>
  );
}