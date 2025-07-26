'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { PaperAirplaneIcon, PaperClipIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function InputBar({
  onSend,
  loading = false,
  error = false,
}: {
  onSend?: (msg: string) => Promise<void> | void;
  loading?: boolean;
  error?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 240) + 'px';
    }
  }, [message]);

  // Accessibility: announce typing
  useEffect(() => {
    if (isTyping && liveRegionRef.current) {
      liveRegionRef.current.textContent = '[User is typing]';
    } else if (liveRegionRef.current) {
      liveRegionRef.current.textContent = '';
    }
  }, [isTyping]);

  // Error state
  useEffect(() => {
    if (error) {
      setShowError(true);
      setTimeout(() => setShowError(false), 1200);
    }
  }, [error]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload logic here
    console.info('🟦 [input_bar][INFO] Files dropped:', acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const handleSend = async () => {
    if (message.trim() && !loading) {
      onSend?.(message);
      setMessage('');
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Question sent. Awaiting AI response.';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    setIsTyping(true);
  };

  const handleBlur = () => setIsTyping(false);

  return (
    <motion.div
      className={clsx(
        'flex justify-center items-end',
        isDragActive && 'border-accent',
        showError && 'animate-shake'
      )}
      animate={{
        borderColor: error ? '#E53E3E' : isDragActive ? '#007BFF' : '#2E303A',
        boxShadow: error
          ? '0 0 0 2px #E53E3E'
          : isDragActive
          ? '0 0 0 2px #007BFF, 0 0 16px #007BFF44'
          : undefined,
      }}
    >
      <div {...getRootProps()} className="w-full max-w-2xl relative">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className={clsx(
            'relative flex flex-col w-full',
            'rounded-2xl bg-[#1A1C23] border border-[#2E303A] shadow-inner',
            'px-4 py-3',
            'transition-all duration-150',
            error && 'border-[#E53E3E]',
            isDragActive && 'border-[#007BFF] shadow-[0_0_16px_#007BFF44]'
          )}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            aria-label="Type your question here"
            className={clsx(
              'resize-none bg-transparent text-white text-base font-normal placeholder:italic placeholder:text-[#6E6F77] placeholder:font-semibold',
              'outline-none focus:ring-0',
              'min-h-[3rem] max-h-[240px]',
              'transition-colors duration-150',
              error
                ? 'border-[#E53E3E]'
                : 'focus:border-[#007BFF]'
            )}
            style={{
              border: 'none',
              boxShadow: 'none',
              padding: 0,
              margin: 0,
              lineHeight: '1.5',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Ask your legal question…"
            disabled={loading}
            rows={2}
          />
          {/* Buttons row below textarea */}
          <div className="flex flex-row items-center mt-0 gap-2 justify-between">
            {/* Left: Attachment Icon with Tooltip */}
            <div className="flex items-center relative group">
              <button
                type="button"
                tabIndex={-1}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Upload document or image"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                Upload document or image
              </span>
            </div>
            {/* Right: Send Button */}
            <motion.button
              type="submit"
              className={clsx(
                'flex items-center justify-center rounded-full w-10 h-10',
                'bg-[#007BFF] text-white',
                'transition-all duration-150',
                message.trim() && !loading ? 'animate-pulse' : 'opacity-50 cursor-not-allowed',
                loading && 'pointer-events-none'
              )}
              disabled={!message.trim() || loading}
              whileHover={message.trim() && !loading ? { scale: 1.08 } : {}}
              whileTap={message.trim() && !loading ? { scale: 0.95 } : {}}
              aria-label="Send"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#fff"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="#fff"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </motion.button>
          </div>
          {/* Error message */}
          <AnimatePresence>
            {showError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-0 right-0 -top-8 text-center text-[#E53E3E] text-sm"
              >
                Oops, something went wrong. Please try again.
              </motion.div>
            )}
          </AnimatePresence>
          {/* Live region for screen readers */}
          <div ref={liveRegionRef} className="sr-only" aria-live="polite" />
          {/* Hidden input for dropzone */}
          <input {...getInputProps()} tabIndex={-1} className="hidden" />
        </form>
        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-lg rounded-2xl">
            Drop files to attach
          </div>
        )}
      </div>
    </motion.div>
  );
} 