'use client';
import { useState, useRef, useEffect } from 'react';
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
  const [inputValue, setInputValue] = useState(controlledValue || '');
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const isHomeVariant = variant === 'home';

  // Update internal state when controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInputValue(controlledValue);
    }
  }, [controlledValue]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [inputValue, maxHeight]);

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || loading || disabled) return;

    onSend(trimmedValue);
    setInputValue('');
    setShowError(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Announce to screen readers
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = 'Message sent';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSend();
      }
    }
  };

  const handleBlur = () => {
    if (controlledOnChange) {
      controlledOnChange(inputValue);
    }
  };

  // Show error message
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const containerClasses = clsx(
    'w-full',
    isHomeVariant ? 'max-w-2xl mx-auto' : 'max-w-none'
  );

  const formClasses = clsx(
    'relative bg-slate rounded-2xl p-3 sm:p-4 border transition-all duration-150',
    'focus-within:border-[#007BFF] focus-within:shadow-lg',
    error ? 'border-[#E53E3E]' : 'border-gray-700',
    isHomeVariant ? 'shadow-lg' : 'shadow-md'
  );

  return (
    <motion.div className={containerClasses}>
      {/* Loading indicator message */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-blue-400 mb-2 text-center"
        >
          AI is thinking... You can type your next question below
        </motion.div>
      )}
      
      <div {...getRootProps()} className="w-full relative">
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
              'resize-none bg-transparent text-white text-sm sm:text-base font-normal w-full',
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
            placeholder={loading ? "AI is thinking... You can type your next question..." : placeholder}
            disabled={disabled}
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
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Upload document or image"
                >
                  {isHomeVariant ? <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <PaperClipIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-xs text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                  Upload document or image
                </span>
              </div>
            )}
            
            {/* Right: Send Button */}
            <motion.button
              type="submit"
              className={clsx(
                'flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10',
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
                <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
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
                <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
                className="absolute left-0 right-0 -top-8 text-center text-[#E53E3E] text-xs sm:text-sm"
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-base sm:text-lg rounded-2xl">
            Drop files to attach
          </div>
        )}
      </div>
    </motion.div>
  );
} 