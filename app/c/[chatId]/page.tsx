'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import axios from 'axios';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import AnimatedCopyButton from '../../components/AnimatedCopyButton';
import FeedbackSection from '../../components/FeedbackSection';
import RegenerateButton from '../../components/RegenerateButton';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useRouter } from 'next/navigation';
import ChatInput from '../../components/ChatInput';
import { useSidebar } from '../../components/SidebarContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { toast } from 'sonner';

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { sidebarOpen } = useSidebar();
  const [input, setInput] = useState('');
  
  // Debug logging for input state
  useEffect(() => {
    console.log('🟦 [chat_ui][INFO] Input state changed:', input);
  }, [input]);
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionMeta, setSessionMeta] = useState<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ [idx: number]: 'good' | 'bad' | undefined }>({});
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.info('🟦 [chat_ui][INFO] Files dropped:', acceptedFiles);
    
    if (!acceptedFiles.length || !session?.user?.id) return;
    
    try {
      // Handle file upload logic
      const formData = new FormData();
      formData.append('file', acceptedFiles[0]);
      formData.append('userId', session.user.id);
      
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          console.info('🟦 [chat_ui][INFO] Upload progress:', percentCompleted + '%');
        },
      });
      
      console.info('🟦 [chat_ui][SUCCESS] File uploaded successfully:', response.data);
      toast.success(`File "${acceptedFiles[0].name}" uploaded successfully!`);
      
      // Trigger document ingestion
      if (response.data.url) {
        try {
          await axios.post('/api/ingest', {
            documentId: response.data.documentId,
            userId: session.user.id,
          });
          console.info('🟦 [chat_ui][SUCCESS] Document ingestion started');
          toast.success('Document processing started');
        } catch (ingestError) {
          console.error('🟥 [chat_ui][ERROR] Failed to start ingestion:', ingestError);
          toast.error('Failed to start document processing');
        }
      }
      
    } catch (error: any) {
      console.error('🟥 [chat_ui][ERROR] File upload failed:', error);
      toast.error(error.response?.data?.error || 'Failed to upload file');
    }
  }, [session?.user?.id]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  // Check for optimistic first message from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const optimisticMessage = sessionStorage.getItem('optimisticFirstMessage');
      const justCreatedChatId = sessionStorage.getItem('justCreatedChatId');
      
      if (optimisticMessage && justCreatedChatId === params.chatId) {
        // Add the optimistic message to the messages array
        setMessages([{
          id: 'optimistic-user-message',
          sessionId: params.chatId,
          userId: session?.user?.id,
          role: 'USER',
          content: optimisticMessage,
          createdAt: new Date()
        }]);
        
        // Clear the sessionStorage
        sessionStorage.removeItem('optimisticFirstMessage');
        sessionStorage.removeItem('justCreatedChatId');
      }
    }
  }, [params.chatId, session?.user?.id]);

  // Fetch session metadata
  useEffect(() => {
    async function fetchMeta() {
      if (!params.chatId) return;
      try {
        const res = await axios.get(`/api/sessions/${params.chatId}/metadata`);
        setSessionMeta(res.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to load session info';
        setErrorMeta(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, [params.chatId]);

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      if (!params.chatId) return;
      try {
        const res = await axios.get(`/api/sessions/${params.chatId}`);
        const fetchedMessages = res.data.messages || [];
        
        // If we have an optimistic message, merge it with fetched messages
        const optimisticMessage = sessionStorage.getItem('optimisticFirstMessage');
        if (optimisticMessage && fetchedMessages.length === 0) {
          setMessages([{
            id: 'optimistic-user-message',
            sessionId: params.chatId,
            userId: session?.user?.id,
            role: 'USER',
            content: optimisticMessage,
            createdAt: new Date()
          }]);
        } else {
          setMessages(fetchedMessages);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to load messages';
        setErrorMessages(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoadingMessages(false);
        setPageLoading(false);
      }
    }
    fetchMessages();
  }, [params.chatId, session?.user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMsgRef.current) {
      lastMsgRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle drag and drop visual feedback
  useEffect(() => {
    setIsDragging(isDragActive);
  }, [isDragActive]);

  async function handleSend(message: string) {
    console.log('🟦 [chat_ui][INFO] handleSend called with message:', message);
    
    if (!session?.user?.id) {
      toast.error('Please log in to send messages');
      return;
    }

    if (!message.trim()) {
      console.log('🟦 [chat_ui][INFO] Message is empty, returning');
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sessionId: params.chatId,
      userId: session.user.id,
      role: 'USER',
      content: message.trim(),
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoadingAI(true);
    setSendError(null);

    let aiMessage: any = null;

    try {
      console.log('🟦 [chat_ui][INFO] Sending message to API:', { message: message.trim(), sessionId: params.chatId, userId: session.user.id });
      
      // Send message to API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message.trim(),
          sessionId: params.chatId,
          userId: session.user.id,
        }),
      });

      console.log('🟦 [chat_ui][INFO] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🟥 [chat_ui][ERROR] API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      console.log('🟦 [chat_ui][INFO] Starting to read response stream');

      let aiResponse = '';
      aiMessage = {
        id: `ai-${Date.now()}`,
        sessionId: params.chatId,
        userId: session.user.id,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      const decoder = new TextDecoder();
      let closed = false;

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          closed = true;
          break;
        }

        const chunk = decoder.decode(value);
        console.log('🟦 [chat_ui][INFO] Received chunk:', chunk);
        // The API returns plain text content directly
        aiResponse += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: aiResponse }
            : msg
        ));
      }

      console.log('🟦 [chat_ui][INFO] Stream completed, final response length:', aiResponse.length);
      reader.releaseLock();
    } catch (error: any) {
      console.error('🟥 [chat_ui][ERROR] Failed to send message:', error);
      const errorMessage = error.message || 'Failed to send message';
      setSendError(errorMessage);
      toast.error(errorMessage);
      
      // Remove the AI message if it was added
      if (aiMessage) {
        setMessages(prev => prev.filter(msg => msg.id !== aiMessage.id));
      }
    } finally {
      setLoadingAI(false);
    }
  }

  // Handle regenerating state changes
  const handleRegeneratingChange = (isRegenerating: boolean, messageIndex: number) => {
    setRegeneratingIdx(isRegenerating ? messageIndex : null);
  };

  // Handle feedback submission
  const handleFeedback = async (type: 'good' | 'bad', comment?: string, messageIndex?: number) => {
    if (messageIndex !== undefined) {
      setFeedback(prev => ({ ...prev, [messageIndex]: type }));
    }
    
    try {
      // Submit feedback to API
      await axios.post('/api/feedback', {
        sessionId: params.chatId,
        userId: session?.user?.id,
        rating: type === 'good' ? 5 : 1,
        comments: comment || `User marked message ${messageIndex} as ${type}`,
        messageIndex,
        feedbackType: type
      });
      
      console.info('🟦 [chat_ui][INFO] Feedback submitted successfully:', { type, comment, messageIndex });
      toast.success('Feedback submitted successfully!');
    } catch (err: any) {
      console.error('🟥 [chat_ui][ERROR] Failed to submit feedback:', err);
      toast.error('Failed to submit feedback');
    }
  };

  // Show loading skeleton while page is loading
  if (pageLoading || loadingMeta || loadingMessages) {
    return <LoadingSkeleton message="Loading chat..." />;
  }

  return (
    <div className="min-h-screen flex" {...getRootProps()}>
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen transition-all ml-0 bg-main-bg pb-32"> 
        {/* Chat session metadata */}
        {loadingMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-main-bg text-white animate-pulse text-sm md:text-base">Loading session info…</div>
        ) : errorMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-red-900 text-red-300 text-sm md:text-base">{errorMeta}</div>
        ) : sessionMeta && (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-main-bg flex flex-col md:flex-row md:items-center md:justify-between text-white text-sm md:text-base shadow-md border border-gray-700 bg-opacity-80">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base md:text-lg truncate">Chat with {sessionMeta.user.name}</div>
              <div className="text-xs text-gray-400">Started: {new Date(sessionMeta.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-400 break-all mt-2 md:mt-0 md:ml-4">Session ID: {sessionMeta.id}</div>
          </div>
        )}
        {/* Chat history */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto px-2 md:px-0 py-4 md:py-8 flex flex-col gap-4 md:gap-6 max-w-full w-full mx-auto bg-main-bg"
          style={{ WebkitOverflowScrolling: 'touch' }}
          role="log"
          aria-live="polite"
          aria-label="Chat conversation history"
        >
          {loadingMessages ? (
            <div className="text-white text-center animate-pulse text-base md:text-lg">Loading messages…</div>
          ) : errorMessages ? (
            <div className="text-red-300 text-center text-base md:text-lg">{errorMessages}</div>
          ) : (
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className={clsx(
                    'w-full flex mb-4',
                    msg.role === 'USER' ? 'justify-end' : 'justify-start'
                  )}
                  ref={idx === messages.length - 1 ? lastMsgRef : undefined}
                  role="group"
                  aria-label={msg.role === 'USER' ? 'User message' : 'AI response'}
                >
                  {msg.role === 'ASSISTANT' ? (
                    <div className="w-full max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2">
                      <div className="markdown-content max-w-none bg-transparent">
                        <ReactMarkdown
                          components={{
                            // Headings
                            h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-4 mt-6 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold text-white mb-3 mt-5 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-sm font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h4>,
                            
                            // Paragraphs
                            p: ({ children }) => <p className="text-white mb-3 leading-relaxed last:mb-0">{children}</p>,
                            
                            // Lists
                            ul: ({ children }) => <ul className="text-white mb-4 space-y-1 list-disc list-inside">{children}</ul>,
                            ol: ({ children }) => <ol className="text-white mb-4 space-y-1 list-decimal list-inside">{children}</ol>,
                            li: ({ children }) => <li className="text-white leading-relaxed">{children}</li>,
                            
                            // Code blocks
                            code: ({ children, className }) => {
                              const isInline = !className;
                              if (isInline) {
                                return <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
                              }
                              const language = className?.replace('language-', '') || 'text';
                              return (
                                <div className="my-4">
                                  <SyntaxHighlighter
                                    language={language}
                                    style={atomDark}
                                    customStyle={{
                                      margin: 0,
                                      borderRadius: '0.5rem',
                                      fontSize: '0.875rem',
                                    }}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            },
                            
                            // Blockquotes
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-blue-500 pl-4 my-4 text-gray-300 italic">
                                {children}
                              </blockquote>
                            ),
                            
                            // Tables
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border border-gray-600">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border border-gray-600 px-3 py-2 text-left text-white bg-gray-800">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-gray-600 px-3 py-2 text-white">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Action buttons for AI messages */}
                      <div className="flex items-center gap-2 mt-4">
                        <AnimatedCopyButton content={msg.content} />
                        <RegenerateButton 
                          sessionId={params.chatId}
                          userId={session?.user?.id || ''}
                          messageIndex={idx}
                          messages={messages}
                          onRegenerate={(newContent) => {
                            // Update the message content
                            setMessages(prev => prev.map(m => 
                              m.id === msg.id ? { ...m, content: newContent } : m
                            ));
                          }}
                          onRegeneratingChange={(isRegenerating) => handleRegeneratingChange(isRegenerating, idx)}
                        />
                        <FeedbackSection 
                          sessionId={params.chatId}
                          userId={session?.user?.id || ''}
                          messageId={msg.id}
                          messageIndex={idx}
                          onFeedback={(type, comment) => handleFeedback(type, comment, idx)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2">
                      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-md max-w-full">
                        <p className="text-sm md:text-base leading-relaxed break-words">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {/* Loading indicator for AI response */}
          {loadingAI && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-start mb-4"
            >
              <div className="max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2">
                <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Fixed ChatInput at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-main-bg shadow-[0_-4px_20px_0_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ChatInput 
            variant="chat"
            onSend={handleSend}
            loading={loadingAI}
            error={sendError}
            showAttachments={true}
            value={input}
            onChange={(value) => {
              console.log('🟦 [chat_ui][INFO] Input onChange:', value);
              setInput(value);
            }}
            userId={session?.user?.id}
          />
        </div>
      </div>

      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-main-bg/80 text-white text-lg sm:text-2xl font-semibold pointer-events-none">
          Drop files to attach
        </div>
      )}

      {/* Screen reader announcements */}
      <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
} 