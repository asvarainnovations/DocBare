'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PaperAirplaneIcon, PaperClipIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface ChatInputProps {
  variant?: 'home' | 'chat';
  placeholder?: string;
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  showAttachments?: boolean;
  maxHeight?: number;
  value?: string;
  onChange?: (value: string) => void;
}

export default function ChatInput({
  variant = 'chat',
  placeholder = "Ask your legal question…",
  onSend,
  loading = false,
  disabled = false,
  error = null,
  showAttachments = true,
  maxHeight = 240,
  value: controlledValue,
  onChange: controlledOnChange
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Handle controlled vs uncontrolled value
  const inputValue = controlledValue !== undefined ? controlledValue : message;
  const setInputValue = controlledOnChange || setMessage;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
    }
  }, [inputValue, maxHeight]);

  // Error state
  useEffect(() => {
    if (error) {
      setShowError(true);
      setTimeout(() => setShowError(false), 1200);
    }
  }, [error]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.info('🟦 [chat_input][INFO] Files dropped:', acceptedFiles);
    // Handle file upload logic here
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const handleSend = async () => {
    if (inputValue.trim() && !loading && !disabled) {
      onSend(inputValue.trim());
      if (controlledOnChange) {
        controlledOnChange('');
      } else {
        setMessage('');
      }
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

  const isHomeVariant = variant === 'home';
  const containerClasses = clsx(
    'flex justify-center items-end',
    isDragActive && 'border-accent',
    showError && 'animate-shake'
  );

  const formClasses = clsx(
    'relative flex flex-col w-full',
    'rounded-2xl shadow-lg',
    isHomeVariant 
      ? 'bg-[#1A1C23] border border-[#2E303A]' 
      : 'bg-[#18181b] border border-gray-800',
    'px-4 py-3',
    'transition-all duration-150',
    error && 'border-[#E53E3E]',
    isDragActive && 'border-[#007BFF] shadow-[0_0_16px_#007BFF44]'
  );

  return (
    <motion.div className={containerClasses}>
      <div {...getRootProps()} className="w-full max-w-2xl relative">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className={formClasses}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            aria-label="Type your question here"
            className={clsx(
              'resize-none bg-transparent text-white text-base font-normal',
              'placeholder:italic placeholder:text-[#6E6F77] placeholder:font-semibold',
              'outline-none focus:ring-0',
              'min-h-[3rem]',
              'transition-colors duration-150',
              error ? 'border-[#E53E3E]' : 'focus:border-[#007BFF]'
            )}
            style={{
              border: 'none',
              boxShadow: 'none',
              padding: 0,
              margin: 0,
              lineHeight: '1.5',
              fontFamily: 'Inter, sans-serif',
            }}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={loading || disabled}
            rows={isHomeVariant ? 2 : 1}
          />
          
          {/* Buttons row */}
          <div className="flex flex-row items-center mt-0 gap-2 justify-between">
            {/* Left: Attachment Icon */}
            {showAttachments && (
              <div className="flex items-center relative group">
                <button
                  type="button"
                  tabIndex={-1}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Upload document or image"
                >
                  {isHomeVariant ? <PlusIcon className="w-5 h-5" /> : <PaperClipIcon className="w-5 h-5" />}
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  Upload document or image
                </span>
              </div>
            )}
            
            {/* Right: Send Button */}
            <motion.button
              type="submit"
              className={clsx(
                'flex items-center justify-center rounded-full w-10 h-10',
                'bg-[#007BFF] text-white',
                'transition-all duration-150',
                inputValue.trim() && !loading ? 'animate-pulse' : 'opacity-50 cursor-not-allowed',
                loading && 'pointer-events-none'
              )}
              disabled={!inputValue.trim() || loading || disabled}
              whileHover={inputValue.trim() && !loading ? { scale: 1.08 } : {}}
              whileTap={inputValue.trim() && !loading ? { scale: 0.95 } : {}}
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