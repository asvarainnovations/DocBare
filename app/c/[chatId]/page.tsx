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

export default function ChatPage({ params }: { params: { chatId: string } }) {
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
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload logic here
    console.info('🟦 [chat_ui][INFO] Files dropped:', acceptedFiles);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });
  // Add feedback state for each AI message
  const [feedback, setFeedback] = useState<{ [idx: number]: 'good' | 'bad' | undefined }>({});
  const router = useRouter();
  // Track if this chat was just created in this session
  const [justCreated, setJustCreated] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);

  // Fetch chat session metadata
  useEffect(() => {
    async function fetchMeta() {
      setLoadingMeta(true);
      setErrorMeta(null);
      try {
        const res = await axios.get(`/api/sessions/${params.chatId}/metadata`);
        setSessionMeta(res.data);
      } catch (err) {
        setSessionMeta(null);
        setErrorMeta('Failed to load session info.');
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, [params.chatId]);

  // Fetch chat messages on load
  useEffect(() => {
    async function fetchMessages() {
      setLoadingMessages(true);
      setErrorMessages(null);
      try {
        const res = await axios.get(`/api/sessions/${params.chatId}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        setErrorMessages('Failed to load messages.');
      } finally {
        setLoadingMessages(false);
      }
    }
    fetchMessages();
  }, [params.chatId]);

  // Track if this chat was just created in this session
  useEffect(() => {
    // Check sessionStorage for justCreated flag
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('justCreatedChatId') === params.chatId) {
        setJustCreated(true);
        // Optimistically add the first message if present
        const optimisticMsg = sessionStorage.getItem('optimisticFirstMessage');
        if (optimisticMsg) {
          setMessages([{ role: 'USER', content: optimisticMsg }]);
          sessionStorage.removeItem('optimisticFirstMessage');
        }
        sessionStorage.removeItem('justCreatedChatId');
      }
    }
  }, [params.chatId]);

  // Auto-trigger AI response only if justCreated is true
  useEffect(() => {
    if (
      justCreated &&
      !loadingMessages &&
      messages.length === 1 &&
      messages[0].role === 'USER' &&
      !loadingAI &&
      !messages.some(m => m.role === 'ASSISTANT')
    ) {
      (async () => {
        setLoadingAI(true);
        try {
          // NOTE: Axios does NOT support streaming responses in the browser.
          // For real-time AI response streaming, we must use fetch here.
          // Use axios for all other API calls in the codebase.
          // Streaming fetch for AI response
          const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: messages[0].content, sessionId: params.chatId, userId: session?.user?.id })
          });
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
        } catch (err) {
          setSendError('Failed to get AI response.');
        } finally {
          setLoadingAI(false);
          setJustCreated(false); // Only trigger once
        }
      })();
    }
  }, [justCreated, loadingMessages, messages, loadingAI, params.chatId]);

  useEffect(() => {
    lastMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loadingAI, regeneratingIdx]);

  // Refactored handleSend to accept a message string
  async function handleSend(message: string) {
    console.info('🟦 [chat_ui][INFO] handleSend called with input:', message);
    setSendError(null);
    if (!message.trim()) return;
    if (!session?.user?.id) {
      signIn();
      return;
    }
    const userId = session.user.id;
    const newMsg = {
      sessionId: params.chatId,
      userId,
      role: 'USER',
      content: message,
    };
    try {
      await axios.post('/api/chat', newMsg);
      setMessages([...messages, { ...newMsg, createdAt: new Date() }]);
      setInput('');
      setLoadingAI(true);
      // Streaming fetch for AI response
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message, sessionId: params.chatId, userId: session?.user?.id })
      });
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

  // Feedback UI for each AI message


  return (
    <div className="min-h-screen flex" {...getRootProps()}>
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen transition-all ml-0 bg-black"> 
        {/* Chat session metadata */}
        {loadingMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-slate text-white animate-pulse text-sm md:text-base">Loading session info…</div>
        ) : errorMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-red-900 text-red-300 text-sm md:text-base">{errorMeta}</div>
        ) : sessionMeta && (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-slate flex flex-col md:flex-row md:items-center md:justify-between text-white text-sm md:text-base shadow-md border border-gray-700 bg-opacity-80">
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
          className="flex-1 overflow-y-auto px-2 md:px-0 py-4 md:py-8 flex flex-col gap-4 md:gap-6 max-w-full w-full mx-auto bg-black"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: '200px' }}
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
                              // Extract language from className (e.g., language-js)
                              const match = /language-(\w+)/.exec(className || '');
                              return (
                                <SyntaxHighlighter
                                  style={atomDark}
                                  language={match ? match[1] : undefined}
                                  PreTag="div"
                                  customStyle={{ borderRadius: '0.5rem', fontSize: '0.95em', margin: '0.5em 0' }}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              );
                            },
                            pre: ({ children }) => <pre className="bg-gray-900 text-gray-200 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4">{children}</pre>,
                            
                            // Blockquotes
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-300 mb-4">{children}</blockquote>,
                            
                            // Links
                            a: ({ children, href }) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            
                            // Strong and emphasis
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
                            
                            // Tables
                            table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="min-w-full border-collapse border border-gray-600">{children}</table></div>,
                            thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr className="border-b border-gray-600">{children}</tr>,
                            th: ({ children }) => <th className="border border-gray-600 px-3 py-2 text-left text-white font-semibold">{children}</th>,
                            td: ({ children }) => <td className="border border-gray-600 px-3 py-2 text-white">{children}</td>,
                            
                            // Horizontal rule
                            hr: () => <hr className="border-gray-600 my-6" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
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
                          onRegeneratingChange={(isRegenerating) => {
                            setRegeneratingIdx(isRegenerating ? idx : null);
                          }}
                        />
                        <FeedbackSection sessionId={params.chatId} userId={session?.user?.id || ''} messageId={msg.id} messageIndex={idx} onFeedback={(type, comment) => setFeedback(f => ({ ...f, [idx]: type }))} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl mx-auto px-2 md:px-4 lg:px-0 py-2 flex justify-end">
                      <div className="rounded-2xl px-3 md:px-4 py-3 max-w-[85%] md:max-w-[80%] whitespace-pre-wrap break-words bg-blue-600 text-white self-end text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {loadingAI && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full flex justify-start"
                >
                  <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-2">
                    <div className="text-white opacity-70 animate-pulse flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        {/* Fixed ChatInputBox at bottom */}
        {/* TODO: make this a component and it is causing the problem */}
        <div className="fixed bottom-0 left-0 w-full flex flex-col items-center z-30 bg-black shadow-[0_-2px_16px_0_rgba(0,0,0,0.7)]">
          <div className="w-full max-w-2xl mx-auto px-2 md:px-4 lg:px-0 pb-2 pt-2">
            <div className="flex items-end bg-[#18181b] rounded-2xl shadow-lg border border-gray-800 px-4 py-2 gap-2">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white text-2xl font-semibold pointer-events-none">
            Drop files to attach
          </div>
        )}
      </div>
    </div>
  );
} 