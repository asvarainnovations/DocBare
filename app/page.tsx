'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import ChatInput from './components/ChatInput';
import LoadingSkeleton from './components/LoadingSkeleton';

export default function Home() {
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; status: 'uploading' | 'done' | 'error'; url?: string; error?: string }[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docActionMsg, setDocActionMsg] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadingFirstPrompt, setLoadingFirstPrompt] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!session?.user?.id) return;
    if (acceptedFiles.length === 1) {
      const file = acceptedFiles[0];
      setUploadedFiles(prev => [...prev, { name: file.name, status: 'uploading' }]);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', session.user.id);
        const res = await axios.post('/api/upload', formData);
        if (res.data.url) {
          setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done', url: res.data.url } : f));
          setDocActionMsg(`✅ ${file.name} uploaded successfully!`);
        } else {
          setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error', error: 'Upload failed' } : f));
          setDocActionMsg(`❌ Failed to upload ${file.name}`);
        }
      } catch (err) {
        setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error', error: 'Upload failed' } : f));
        setDocActionMsg(`❌ Failed to upload ${file.name}`);
      }
    } else {
      setDocActionMsg('❌ Please upload one file at a time');
    }
  }, [session?.user?.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // Fetch documents
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
    setSendError(null); // Clear previous errors
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
    } catch (err: any) {
      setSendError(err.message || 'Failed to create chat session');
    } finally {
      setLoadingFirstPrompt(false);
    }
  }

  // Show loading skeleton when transitioning
  if (loadingFirstPrompt) {
    return <LoadingSkeleton message="Creating your chat..." />;
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full max-w-4xl">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-medium text-white mb-4 sm:mb-6 text-center">What's on your mind today?</h1>
        {/* Attachment pills/cards UI */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 w-full max-w-2xl justify-start">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center bg-[#23242b] rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 gap-1.5 sm:gap-2 shadow border border-gray-700">
                {/* File icon (PDF, etc.) */}
                <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-pink-600 text-white font-bold text-xs">
                  {file.name.split('.').pop()?.toUpperCase() || 'DOC'}
                </span>
                <span className="truncate max-w-[80px] sm:max-w-[120px] text-xs text-white">{file.name}</span>
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
        <div className="mx-auto w-full max-w-2xl">
          <ChatInput 
            variant="home"
            onSend={handleFirstPrompt} 
            loading={loadingFirstPrompt} 
            error={sendError}
            showAttachments={true}
            value={input}
            onChange={setInput}
          />
        </div>
      </div>
      <input {...getInputProps()} tabIndex={-1} className="hidden" />
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-main-bg/60 text-white text-lg sm:text-2xl font-semibold pointer-events-none">
          Drop files to attach
        </div>
      )}
    </div>
  );
}