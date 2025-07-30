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

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { sidebarOpen } = useSidebar();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionMeta, setSessionMeta] = useState<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
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
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload logic here
    console.info('🟦 [chat_ui][INFO] Files dropped:', acceptedFiles);
  }, []);
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
        setErrorMeta(err.response?.data?.error || 'Failed to load session info');
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
        setErrorMessages(err.response?.data?.error || 'Failed to load messages');
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

  // Auto-trigger AI response for first message if no AI response exists
  useEffect(() => {
    if (
      !loadingMessages &&
      !loadingMeta &&
      messages.length === 1 &&
      messages[0].role === 'USER' &&
      !loadingAI &&
      !messages.some(m => m.role === 'ASSISTANT') &&
      session?.user?.id // Ensure session is available
    ) {
      (async () => {
        setLoadingAI(true);
        try {
          console.info('🟦 [chat_ui][INFO] Auto-triggering AI response', {
            query: messages[0].content,
            sessionId: params.chatId,
            userId: session?.user?.id
          });
          
          // NOTE: Axios does NOT support streaming responses in the browser.
          // For real-time AI response streaming, we must use fetch here.
          // Use axios for all other API calls in the codebase.
          // Streaming fetch for AI response
          const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: messages[0].content, 
              sessionId: params.chatId, 
              userId: session?.user?.id 
            })
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('🟥 [chat_ui][ERROR] Query API error:', res.status, errorText);
            throw new Error(`API error: ${res.status} - ${errorText}`);
          }
          
          if (!res.body) throw new Error('No response body');
          let aiMsg = { sessionId: params.chatId, userId: 'ai', role: 'ASSISTANT', content: '', createdAt: new Date() };
          setMessages(prev => [...prev, aiMsg]);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              const chunk = decoder.decode(value);
              aiMsg = { ...aiMsg, content: aiMsg.content + chunk };
              setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? aiMsg : m));
            }
          }
          setLoadingAI(false);
        } catch (err) {
          setLoadingAI(false);
          setSendError('Failed to send message or get AI response.');
        }
      })();
    }
  }, [messages, loadingMessages, loadingMeta, loadingAI, session?.user?.id, params.chatId]);

  async function handleSend(message: string) {
    if (!message.trim() || loadingAI || !session?.user?.id) return;
    
    setSendError(null);
    const userMsg = { sessionId: params.chatId, userId: session.user.id, role: 'USER', content: message, createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoadingAI(true);
    
    try {
      console.info('🟦 [chat_ui][INFO] Sending message', {
        query: message,
        sessionId: params.chatId,
        userId: session?.user?.id
      });
      
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: message, 
          sessionId: params.chatId, 
          userId: session?.user?.id 
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('🟥 [chat_ui][ERROR] Query API error:', res.status, errorText);
        throw new Error(`API error: ${res.status} - ${errorText}`);
      }
      
      if (!res.body) throw new Error('No response body');
      let aiMsg = { sessionId: params.chatId, userId: 'ai', role: 'ASSISTANT', content: '', createdAt: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          aiMsg = { ...aiMsg, content: aiMsg.content + chunk };
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? aiMsg : m));
        }
      }
      setLoadingAI(false);
    } catch (err) {
      setLoadingAI(false);
      setSendError('Failed to send message or get AI response.');
    }
  }

  // Handle regenerating state changes
  const handleRegeneratingChange = (isRegenerating: boolean, messageIndex: number) => {
    setRegeneratingIdx(isRegenerating ? messageIndex : null);
  };

  // Handle feedback submission
  const handleFeedback = (type: 'good' | 'bad', comment?: string, messageIndex?: number) => {
    if (messageIndex !== undefined) {
      setFeedback(prev => ({ ...prev, [messageIndex]: type }));
    }
    console.info('🟦 [chat_ui][INFO] Feedback submitted:', { type, comment, messageIndex });
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
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                      lineHeight: '1.5',
                                    }}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            },
                            
                            // Blockquotes
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-accent pl-4 py-2 my-4 bg-gray-800/30 rounded-r">
                                {children}
                              </blockquote>
                            ),
                            
                            // Tables
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-4">
                                <table className="min-w-full border-collapse border border-gray-600">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr className="border-b border-gray-600">{children}</tr>,
                            th: ({ children }) => <th className="border border-gray-600 px-4 py-2 text-left text-white font-semibold">{children}</th>,
                            td: ({ children }) => <td className="border border-gray-600 px-4 py-2 text-white">{children}</td>,
                            
                            // Links
                            a: ({ href, children }) => (
                              <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                            
                            // Strong and emphasis
                            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
                            
                            // Horizontal rule
                            hr: () => <hr className="border-gray-600 my-6" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Action buttons for AI responses */}
                      <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                          <AnimatedCopyButton content={msg.content} />
                          <RegenerateButton 
                            sessionId={params.chatId}
                            userId={session?.user?.id || ''}
                            messageIndex={idx}
                            messages={messages}
                            onRegenerate={(newContent) => {
                              setMessages(prev => prev.map((m, i) => 
                                i === idx ? { ...m, content: newContent } : m
                              ));
                            }}
                            onRegeneratingChange={(isRegenerating) => handleRegeneratingChange(isRegenerating, idx)}
                          />
                        </div>
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
                      <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3">
                        <p className="text-white text-sm md:text-base leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {/* AI thinking indicator */}
          {loadingAI && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-start mb-4"
            >
              <div className="max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Fixed ChatInputBox at bottom, centered and not overlapping sidebar */}
        <div className={clsx(
          'fixed bottom-0 left-0 w-full bg-main-bg shadow-[0_-4px_20px_0_rgba(0,0,0,0.3)] py-4 z-30 transition-all',
          sidebarOpen ? 'md:left-60 md:w-[calc(100vw-15rem)]' : 'md:left-0 md:w-full'
        )}>
          <div className="w-full max-w-2xl mx-auto px-2 md:px-4 lg:px-0">
            <ChatInput
              variant="chat"
              value={input}
              onChange={setInput}
              onSend={handleSend}
              loading={loadingAI}
              error={sendError}
              showAttachments={true}
            />
          </div>
          {/* Info message below chatbox */}
          <div className="w-full flex justify-center mt-3 mb-2">
            <div className="text-xs text-gray-400 bg-transparent px-2 py-1 rounded text-center">
              ChatGPT can make mistakes. Check important info. See Cookie Preferences.
            </div>
          </div>
        </div>
      </div>
      <input {...getInputProps()} tabIndex={-1} className="hidden" />
      {isDragActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-main-bg/60 text-white text-2xl font-semibold pointer-events-none">
          Drop files to attach
        </div>
      )}
    </div>
  );
} 