'use client';

import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Sidebar from './components/Sidebar';
import NavBar from './components/NavBar';
import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import InputBar from './components/InputBar';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>('1');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; status: 'uploading' | 'done' | 'error'; url?: string; error?: string }[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docActionMsg, setDocActionMsg] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!session?.user?.id) return;
    for (const file of acceptedFiles) {
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
        setUploadedFiles(prev => prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? data.document
              ? { name: file.name, status: 'done', url: data.document.path }
              : { name: file.name, status: 'error', error: data.error || 'Upload failed' }
            : f
        ));
      } catch (err: any) {
        setUploadedFiles(prev => prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? { name: file.name, status: 'error', error: err.message || 'Upload failed' }
            : f
        ));
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

  // Download document
  const handleDownload = async (doc: any) => {
    if (!session?.user?.id) return;
    setDocActionMsg('Generating download link...');
    try {
      const res = await fetch(`/api/documents/signed_url?userId=${session.user.id}&documentId=${doc.id}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
        setDocActionMsg(null);
      } else {
        setDocActionMsg('Failed to get download link.');
      }
    } catch {
      setDocActionMsg('Failed to get download link.');
    }
  };

  // Delete document
  const handleDelete = async (doc: any) => {
    if (!session?.user?.id) return;
    if (!window.confirm('Delete this document?')) return;
    setDocActionMsg('Deleting...');
    try {
      const res = await fetch(`/api/documents/delete?userId=${session.user.id}&documentId=${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'deleted') {
        setDocActionMsg('Document deleted.');
        fetchDocuments();
      } else {
        setDocActionMsg(data.error || 'Delete failed.');
      }
    } catch {
      setDocActionMsg('Delete failed.');
    }
    setTimeout(() => setDocActionMsg(null), 1500);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return null;
  }

  async function handleFirstPrompt(msg: string) {
    if (!session?.user?.id) {
      signIn();
      return;
    }
    const sessionRes = await axios.post('/api/create_chat_session', { firstMessage: msg, userId: session.user.id });
    const { chatId } = sessionRes.data;
    router.push(`/c/${chatId}`);
  }

  return (
    <div {...getRootProps()} className="min-h-screen flex relative" style={{ width: '100vw' }}>
      {/* Sidebar and overlay */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}
      {/* Main area */}
      <div className={clsx('flex-1 flex flex-col min-h-screen transition-all', sidebarOpen ? 'md:ml-60' : 'md:ml-0')}> 
        {/* Always render NavBar at the top, pass showSidebarToggle only when sidebar is closed */}
        <NavBar showSidebarToggle={!sidebarOpen} onSidebarToggle={() => setSidebarOpen(true)} />
        {/* Auth buttons */}
        {/* Removed Login/Logout button from here; now handled in NavBar */}
        {/* Centered content below NavBar */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-0">
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
            <div className="w-full max-w-2xl">
              <InputBar onSend={handleFirstPrompt} />
            </div>
          </div>
        </div>
        <input {...getInputProps()} tabIndex={-1} className="hidden" />
        {isDragActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white text-2xl font-semibold pointer-events-none">
            Drop files to attach
          </div>
        )}
      </div>
    </div>
  );
}