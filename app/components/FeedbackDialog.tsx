"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleLeftRightIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
  title?: string;
  placeholder?: string;
  isLoading?: boolean;
}

export default function FeedbackDialog({
  isOpen,
  onClose,
  onSubmit,
  title = "Help us improve",
  placeholder = "Please tell us what was wrong with this response...",
  isLoading = false,
}: FeedbackDialogProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [comment]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setError('Please provide feedback before submitting');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(comment.trim());
      setComment('');
      onClose();
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setComment('');
      setError('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white font-legal">{title}</h3>
                    <p className="text-sm text-gray-400 font-legal-content">Your feedback helps us improve our responses</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1 rounded-lg hover:bg-gray-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Textarea */}
                  <div>
                    <label htmlFor="feedback-comment" className="block text-sm font-medium text-gray-300 mb-2 font-legal-content">
                      What went wrong?
                    </label>
                    <textarea
                      ref={textareaRef}
                      id="feedback-comment"
                      className={clsx(
                        "w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
                        "resize-none transition-all duration-200 font-legal-content",
                        "min-h-[120px] max-h-[200px]",
                        error ? "border-red-500" : "border-gray-600"
                      )}
                      placeholder={placeholder}
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        if (error) setError('');
                      }}
                      onKeyDown={handleKeyDown}
                      disabled={isSubmitting}
                      rows={4}
                    />
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mt-2 text-red-400 text-sm"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {error}
                      </motion.div>
                    )}
                  </div>

                  {/* Help text */}
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-sm text-gray-400 font-legal-content">
                      <strong>Tip:</strong> Be specific about what was incorrect, unclear, or missing. 
                      This helps us provide better legal assistance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1e1e1e] font-legal"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !comment.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1e1e1e] font-legal"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 