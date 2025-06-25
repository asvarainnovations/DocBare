'use client';

import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import Sidebar from '../../components/Sidebar';
import NavBar from '../../components/NavBar';
import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession, signIn } from 'next-auth/react';
import FeedbackBar from './FeedbackBar';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loadingAI]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="min-h-screen flex">
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
      <div className={clsx('flex-1 flex flex-col min-h-screen transition-all', sidebarOpen ? 'md:ml-72' : 'md:ml-16', 'bg-black')}> 
        <NavBar onSidebarToggle={() => setSidebarOpen((v) => !v)} />
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
        {/* Input bar fixed at bottom */}
        <form
          className="w-full max-w-2xl mx-auto flex items-center bg-slate rounded-xl shadow-lg px-2 md:px-4 py-2 md:py-3 gap-2 mb-4 md:mb-6 sticky bottom-0 z-10"
          onSubmit={handleSend}
        >
          {/* Attach Button */}
          <button
            type="button"
            className="p-2 md:p-2.5 rounded hover:bg-slate/60 transition-colors text-gray-300"
            aria-label="Add attachment"
            disabled={loadingAI || loadingMessages}
            style={{ minWidth: 36, minHeight: 36 }}
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          {/* Input */}
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-sm md:text-base px-2"
            placeholder="Ask anything"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loadingAI || loadingMessages}
            style={{ minHeight: 36 }}
            autoComplete="off"
          />
          {/* Send Button */}
          <button
            type="submit"
            className={clsx(
              'p-2 md:p-2.5 rounded transition-colors',
              input.trim() && !loadingAI && !loadingMessages ? 'bg-accent hover:bg-accent/80 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
            aria-label="Send"
            disabled={!input.trim() || loadingAI || loadingMessages}
            style={{ minWidth: 36, minHeight: 36 }}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
        {sendError && <div className="text-red-400 text-sm text-center mt-2">{sendError}</div>}
        {/* Feedback bar */}
        {session?.user?.id && (
          <div className="px-2 md:px-0">
            <FeedbackBar sessionId={params.chatId} userId={session.user.id} />
          </div>
        )}
      </div>
    </div>
  );
} 