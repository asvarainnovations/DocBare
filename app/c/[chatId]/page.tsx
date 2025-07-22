'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import Sidebar from '../../components/Sidebar';
import NavBar from '../../components/NavBar';
import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession, signIn } from 'next-auth/react';
import FeedbackBar from './FeedbackBar';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { ClipboardIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import ChatInputBox from '../../components/ChatInputBox';

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionMeta, setSessionMeta] = useState<any>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(params.chatId);
  const chatRef = useRef<HTMLDivElement>(null);
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

  // Auto-trigger AI response if only one user message exists
  useEffect(() => {
    if (!loadingMessages && messages.length === 1 && messages[0].role === 'USER' && !loadingAI) {
      (async () => {
        setLoadingAI(true);
        try {
          const aiRes = await axios.post('/api/query', { query: messages[0].content, sessionId: params.chatId });
          setMessages(prev => [
            ...prev,
            {
              sessionId: params.chatId,
              userId: 'ai',
              role: 'ASSISTANT',
              content: aiRes.data.answer,
              createdAt: new Date(),
            },
          ]);
        } catch (err) {
          setSendError('Failed to get AI response.');
        } finally {
          setLoadingAI(false);
        }
      })();
    }
  }, [loadingMessages, messages, loadingAI, params.chatId]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loadingAI]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    console.info('🟦 [chat_ui][INFO] handleSend called with input:', input);
    setSendError(null);
    if (!input.trim()) return;
    if (!session?.user?.id) {
      signIn();
      return;
    }
    const userId = session.user.id;
    const newMsg = {
      sessionId: params.chatId,
      userId,
      role: 'USER',
      content: input,
    };
    try {
      await axios.post('/api/chat', newMsg);
      setMessages([...messages, { ...newMsg, createdAt: new Date() }]);
      setInput('');
      setLoadingAI(true);
      const aiRes = await axios.post('/api/query', { query: input, sessionId: params.chatId });
      setMessages((prev) => [
        ...prev,
        {
          sessionId: params.chatId,
          userId: 'ai',
          role: 'ASSISTANT',
          content: aiRes.data.answer,
          createdAt: new Date(),
        },
      ]);
      setLoadingAI(false);
    } catch (err) {
      setLoadingAI(false);
      setSendError('Failed to send message or get AI response.');
    }
  }

  return (
    <div className="min-h-screen flex" {...getRootProps()}>
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
      <div className={clsx('flex-1 flex flex-col min-h-screen transition-all', sidebarOpen ? 'ml-60' : 'ml-0', 'bg-black')}> 
        <NavBar showSidebarToggle={!sidebarOpen} onSidebarToggle={() => setSidebarOpen((v) => !v)} />
        {/* Chat session metadata */}
        {loadingMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-slate text-white animate-pulse text-sm md:text-base">Loading session info…</div>
        ) : errorMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-red-900 text-red-300 text-sm md:text-base">{errorMeta}</div>
        ) : sessionMeta && (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-slate flex flex-col md:flex-row md:items-center md:justify-between text-white text-sm md:text-base">
            <div>
              <div className="font-semibold">Chat with {sessionMeta.user.name}</div>
              <div className="text-xs text-gray-400">Started: {new Date(sessionMeta.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-400 break-all">Session ID: {sessionMeta.id}</div>
          </div>
        )}
        {/* Chat history */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-2 md:px-0 py-4 md:py-8 flex flex-col gap-3 md:gap-4 max-w-2xl w-full mx-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                    'px-3 py-2 md:px-4 md:py-2 rounded-lg max-w-[90vw] md:max-w-[70%] text-sm md:text-base break-words',
                    msg.role === 'USER'
                      ? 'self-end bg-accent text-white'
                      : 'self-start bg-slate text-white'
                  )}
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {msg.content}
                  {/* Per-response feedback for AI responses only */}
                  {msg.role === 'ASSISTANT' && (
                    <div className="flex items-center gap-2 mt-2">
                      {/* Copy button */}
                      <button
                        className="p-1 rounded hover:bg-gray-700 text-gray-300"
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        title="Copy response"
                      >
                        <ClipboardIcon className="w-5 h-5" />
                      </button>
                      {/* Good button */}
                      <button
                        className={clsx(
                          'p-1 rounded',
                          feedback[idx] === 'good' ? 'bg-green-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                        )}
                        onClick={() => {
                          if (!feedback[idx]) {
                            setFeedback(f => ({ ...f, [idx]: 'good' }));
                            axios.post('/api/feedback', {
                              sessionId: params.chatId,
                              userId: session?.user?.id,
                              rating: 1,
                              messageIndex: idx,
                              messageId: msg.id,
                            });
                          }
                        }}
                        disabled={!!feedback[idx]}
                        title="Good response"
                      >
                        <HandThumbUpIcon className="w-5 h-5" />
                      </button>
                      {/* Bad button */}
                      <button
                        className={clsx(
                          'p-1 rounded',
                          feedback[idx] === 'bad' ? 'bg-red-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                        )}
                        onClick={() => {
                          if (!feedback[idx]) {
                            setFeedback(f => ({ ...f, [idx]: 'bad' }));
                            axios.post('/api/feedback', {
                              sessionId: params.chatId,
                              userId: session?.user?.id,
                              rating: -1,
                              messageIndex: idx,
                              messageId: msg.id,
                            });
                          }
                        }}
                        disabled={!!feedback[idx]}
                        title="Bad response"
                      >
                        <HandThumbDownIcon className="w-5 h-5" />
                      </button>
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
                  className="self-start px-3 py-2 md:px-4 md:py-2 rounded-lg max-w-[90vw] md:max-w-[70%] text-sm md:text-base bg-slate text-white opacity-70 animate-pulse"
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  AI is typing…
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        {/* Use ChatInputBox component at bottom */}
        <ChatInputBox
          value={input}
          onChange={setInput}
          onSend={handleSend}
          loading={loadingAI}
          error={sendError}
        />
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