'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSession, signIn, signOut } from 'next-auth/react';

import ChatInput from './components/ChatInput';
import LoadingSkeleton from './components/LoadingSkeleton';
import { toast } from 'sonner';

export default function Home() {
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; status: 'uploading' | 'done' | 'error'; url?: string; error?: string; documentId?: string; prismaId?: string; firestoreId?: string; abortController?: AbortController }[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docActionMsg, setDocActionMsg] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadingFirstPrompt, setLoadingFirstPrompt] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleFileUpload = useCallback((file: { name: string; status: 'uploading' | 'done' | 'error'; url?: string; error?: string; documentId?: string; prismaId?: string; firestoreId?: string; abortController?: AbortController }) => {
    setUploadedFiles(prev => {
      const existingIndex = prev.findIndex(f => f.name === file.name);
      if (existingIndex >= 0) {
        // Update existing file
        const updated = [...prev];
        updated[existingIndex] = file;
        return updated;
      } else {
        // Add new file
        return [...prev, file];
      }
    });
  }, []);

  // Handle file removal with backend cleanup
  const handleFileRemove = useCallback(async (index: number) => {
    const fileToRemove = uploadedFiles[index];
    if (!fileToRemove) return;

    // Remove from UI immediately
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));

    try {
      // Cancel ongoing upload/processing if it exists
      if (fileToRemove.abortController) {
        fileToRemove.abortController.abort();
      }

      // Delete from backend if the file was successfully uploaded
      if (fileToRemove.status === 'done' && fileToRemove.prismaId && session?.user?.id) {
        
        await axios.delete('/api/documents/delete', {
          params: {
            userId: session.user.id,
            documentId: fileToRemove.prismaId,
          },
        });
        
        console.info('🟦 [file_removal][SUCCESS] File deleted from backend:', fileToRemove.name);
        toast.success(`File "${fileToRemove.name}" removed successfully`);
      } else if (fileToRemove.status === 'uploading') {
        toast.info(`Upload cancelled for "${fileToRemove.name}"`);
      } else {
        toast.info(`File "${fileToRemove.name}" removed from list`);
      }
    } catch (error: any) {
      console.error('🟥 [file_removal][ERROR] Failed to delete file from backend:', error);
      
      // Still show success since file is removed from UI
      // Backend cleanup can be handled later if needed
      if (fileToRemove.status === 'done') {
        toast.warning(`File removed from list but may need manual cleanup`);
      }
    }
  }, [uploadedFiles, session?.user?.id]);

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
      toast.error('Failed to load documents');
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
    
    // Set a flag in localStorage to indicate we're transitioning
    if (typeof window !== 'undefined') {
      localStorage.setItem('docbare_creating_chat', 'true');
    }
    
    try {
      // Create the chat session
      const sessionRes = await axios.post('/api/create_chat_session', { firstMessage: msg, userId: session.user.id });
      const { chatId } = sessionRes.data;
      
      // Navigate to the chat page immediately after creating the session
      // The AI response will be generated on the chat page with proper streaming
      router.push(`/c/${chatId}`);
      
      // Keep loading state active - it will be cleared when the new page loads
      // This ensures the "Creating your chat..." animation stays visible during navigation
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create chat session';
      setSendError(errorMessage);
      toast.error(errorMessage);
      setLoadingFirstPrompt(false); // Only clear loading on error
      
      // Clear the transition flag on error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('docbare_creating_chat');
      }
    }
  }

  // Show loading skeleton when transitioning
  if (loadingFirstPrompt || (typeof window !== 'undefined' && localStorage.getItem('docbare_creating_chat') === 'true')) {
    return <LoadingSkeleton message="Creating your chat..." />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Desktop Layout - Centered Content */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center px-4 sm:px-6 lg:px-8 -mt-24">
        <div className="flex flex-col items-center w-full max-w-4xl">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-medium text-white mb-4 sm:mb-6 text-center">What&apos;s on your mind today?</h1>
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
                    onClick={() => handleFileRemove(idx)}
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
              userId={session?.user?.id}
              onFileUpload={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout - ChatGPT Style */}
      <div className="lg:hidden flex flex-col flex-1 -mt-24">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-medium text-white mb-2">What&apos;s on your mind today?</h1>
            <p className="text-gray-400 text-sm">Ready when you are.</p>
          </div>
          
          {/* Attachment pills/cards UI for mobile */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 w-full max-w-sm justify-center">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center bg-[#23242b] rounded-lg px-2 py-1.5 gap-1.5 shadow border border-gray-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-white font-bold text-xs">
                    {file.name.split('.').pop()?.toUpperCase() || 'DOC'}
                  </span>
                  <span className="truncate max-w-[60px] text-xs text-white">{file.name}</span>
                  {file.status === 'uploading' && <span className="text-blue-400 text-xs">Uploading…</span>}
                  {file.status === 'done' && <span className="text-green-400 text-xs">Done</span>}
                  {file.status === 'error' && <span className="text-red-400 text-xs">Error</span>}
                  <button
                    className="ml-1 text-gray-400 hover:text-red-400 text-xs"
                    onClick={() => handleFileRemove(idx)}
                    aria-label="Remove attachment"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom ChatInput - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700 bg-main-bg">
          <ChatInput 
            variant="chat"
            onSend={handleFirstPrompt} 
            loading={loadingFirstPrompt} 
            error={sendError}
            showAttachments={true}
            value={input}
            onChange={setInput}
            userId={session?.user?.id}
            onFileUpload={handleFileUpload}
          />
        </div>
      </div>


    </div>
  );
}