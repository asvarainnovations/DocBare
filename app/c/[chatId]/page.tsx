'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import NavBar from '../../components/NavBar';
import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { ClipboardIcon, HandThumbUpIcon, HandThumbDownIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ChatInputBox from '../../components/ChatInputBox';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionMeta, setSessionMeta] = useState<any>(null);
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
  const router = useRouter();
  // Track if this chat was just created in this session
  const [justCreated, setJustCreated] = useState(false);

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
          const aiRes = await axios.post('/api/query', { query: messages[0].content, sessionId: params.chatId, userId: session?.user?.id });
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
          setJustCreated(false); // Only trigger once
        }
      })();
    }
  }, [justCreated, loadingMessages, messages, loadingAI, params.chatId]);

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
      const aiRes = await axios.post('/api/query', { query: input, sessionId: params.chatId, userId: session?.user?.id });
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

  // Feedback UI for each AI message
  function FeedbackSection({
    sessionId,
    userId,
    messageId,
    messageIndex,
    onFeedback,
  }: {
    sessionId: string;
    userId: string;
    messageId: string;
    messageIndex: number;
    onFeedback: (type: 'good' | 'bad', comment?: string) => void;
  }) {
    const [state, setState] = useState<'init' | 'good' | 'bad' | 'badDialog' | 'done'>('init');
    const [showCopyCheck, setShowCopyCheck] = useState(false);
    const [comment, setComment] = useState('');
    const [commentError, setCommentError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Animated copy button
    const handleCopy = async (content: string) => {
      await navigator.clipboard.writeText(content);
      setShowCopyCheck(true);
      setTimeout(() => setShowCopyCheck(false), 1200);
    };

    // Good feedback
    const handleGood = async () => {
      setSubmitting(true);
      try {
        await axios.post('/api/feedback', {
          sessionId,
          userId,
          rating: 1,
          messageIndex,
          messageId,
        });
        setState('good');
        onFeedback('good');
        setTimeout(() => setState('done'), 1200);
      } finally {
        setSubmitting(false);
      }
    };

    // Bad feedback
    const handleBad = () => {
      setState('badDialog');
    };
    const handleBadSubmit = async () => {
      if (!comment.trim()) {
        setCommentError('Comment is required');
        return;
      }
      setSubmitting(true);
      try {
        await axios.post('/api/feedback', {
          sessionId,
          userId,
          rating: -1,
          messageIndex,
          messageId,
          comments: comment,
        });
        setState('bad');
        onFeedback('bad', comment);
        setTimeout(() => setState('done'), 1200);
      } finally {
        setSubmitting(false);
      }
    };

    if (state === 'good') {
      return (
        <div className="flex items-center gap-2 mt-2 text-green-400 animate-fade-in">
          <CheckCircleIcon className="w-5 h-5" /> Thank you for your feedback!
        </div>
      );
    }
    if (state === 'bad') {
      return (
        <div className="flex items-center gap-2 mt-2 text-red-400 animate-fade-in">
          <XMarkIcon className="w-5 h-5" /> Feedback received. Thank you!
        </div>
      );
    }
    if (state === 'badDialog') {
      return (
        <div className="flex flex-col gap-2 mt-2 bg-gray-900 p-3 rounded-lg border border-gray-700 max-w-xs animate-fade-in">
          <div className="text-sm text-red-300 font-semibold">Please tell us what was wrong:</div>
          <textarea
            className="bg-black/30 text-white rounded p-2 mt-1 border border-gray-700"
            placeholder="Your comment (required)"
            value={comment}
            onChange={e => { setComment(e.target.value); setCommentError(''); }}
            rows={2}
            disabled={submitting}
          />
          {commentError && <div className="text-xs text-red-400">{commentError}</div>}
          <div className="flex gap-2 justify-end">
            <button
              className="px-3 py-1 rounded bg-gray-700 text-white text-sm"
              onClick={() => setState('init')}
              type="button"
              disabled={submitting}
            >Cancel</button>
            <button
              className="px-3 py-1 rounded bg-accent text-white text-sm disabled:opacity-50"
              onClick={handleBadSubmit}
              disabled={submitting}
            >Submit</button>
          </div>
        </div>
      );
    }
    if (state === 'done') {
      return null;
    }
    // Initial state: both buttons
    return (
      <div className="flex items-center gap-2 mt-2">
        <button
          className={clsx(
            'p-1 rounded',
            'hover:bg-gray-700 text-gray-300',
            'transition-colors duration-150',
            submitting && 'opacity-50 pointer-events-none'
          )}
          onClick={handleGood}
          disabled={submitting}
          title="Good response"
        >
          <HandThumbUpIcon className="w-5 h-5" />
        </button>
        <button
          className={clsx(
            'p-1 rounded',
            'hover:bg-gray-700 text-gray-300',
            'transition-colors duration-150',
            submitting && 'opacity-50 pointer-events-none'
          )}
          onClick={handleBad}
          disabled={submitting}
          title="Bad response"
        >
          <HandThumbDownIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" {...getRootProps()}>
      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen transition-all ml-0 bg-black"> 
        <NavBar />
        {/* Chat session metadata */}
        {loadingMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-slate text-white animate-pulse text-sm md:text-base">Loading session info…</div>
        ) : errorMeta ? (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-red-900 text-red-300 text-sm md:text-base">{errorMeta}</div>
        ) : sessionMeta && (
          <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-slate flex flex-col md:flex-row md:items-center md:justify-between text-white text-sm md:text-base shadow-md border border-gray-700 bg-opacity-80">
            <div>
              <div className="font-semibold text-base md:text-lg">Chat with {sessionMeta.user.name}</div>
              <div className="text-xs text-gray-400">Started: {new Date(sessionMeta.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-400 break-all">Session ID: {sessionMeta.id}</div>
          </div>
        )}
        {/* Chat history */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-0 py-4 md:py-8 flex flex-col gap-0 max-w-full w-full mx-auto bg-black" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: '200px' }}>
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
                    'w-full flex',
                    msg.role === 'USER' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'ASSISTANT' ? (
                    <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-2">
                      <div className="prose prose-invert prose-headings:font-bold prose-headings:text-lg prose-p:my-2 prose-li:my-1 prose-code:bg-gray-800 prose-code:text-blue-300 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-xs prose-pre:p-3 prose-pre:rounded-lg bg-transparent">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <AnimatedCopyButton content={msg.content} />
                        <FeedbackSection sessionId={params.chatId} userId={session?.user?.id || ''} messageId={msg.id} messageIndex={idx} onFeedback={(type, comment) => setFeedback(f => ({ ...f, [idx]: type }))} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl mx-auto px-4 md:px-0 py-2 flex justify-end">
                      <div className="rounded-2xl px-6 py-4 mb-1 max-w-[70%] whitespace-pre-wrap break-words shadow-lg border bg-blue-600 text-white self-end border-blue-700 text-base font-medium">
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
                    <div className="prose prose-invert bg-transparent opacity-70 animate-pulse">AI is typing…</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        {/* Fixed ChatInputBox at bottom */}
        <div className="fixed bottom-0 left-0 w-full flex flex-col items-center z-30 bg-black shadow-[0_-2px_16px_0_rgba(0,0,0,0.7)]">
          <div className="w-full max-w-2xl mx-auto px-4 md:px-0 pb-2 pt-2">
            <div className="flex items-end bg-[#18181b] rounded-2xl shadow-lg border border-gray-800 px-4 py-2 gap-2">
              <ChatInputBox
                value={input}
                onChange={setInput}
                onSend={handleSend}
                loading={loadingAI}
                error={sendError}
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

function AnimatedCopyButton({ content }: { content: string }) {
  const [showCheck, setShowCheck] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setShowCheck(true);
    setTimeout(() => setShowCheck(false), 1200);
  };
  return (
    <button
      className={clsx(
        'p-1 rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150',
        showCheck && 'text-green-400 animate-bounce'
      )}
      onClick={handleCopy}
      title={showCheck ? 'Copied!' : 'Copy response'}
      aria-label="Copy response"
    >
      {showCheck ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
    </button>
  );
} 