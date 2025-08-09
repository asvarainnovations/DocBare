'use client';

import { useState, useRef } from 'react';
import clsx from 'clsx';
import axios from 'axios';
import { HandThumbUpIcon, HandThumbDownIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import FeedbackDialog from './FeedbackDialog';

interface FeedbackSectionProps {
  sessionId: string;
  userId: string;
  messageId: string;
  messageIndex: number;
  onFeedback: (type: 'good' | 'bad', comment?: string) => void;
}

export default function FeedbackSection({
  sessionId,
  userId,
  messageId,
  messageIndex,
  onFeedback,
}: FeedbackSectionProps) {
  const [state, setState] = useState<'init' | 'good' | 'bad' | 'done'>('init');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submissionRef = useRef(false); // Prevent multiple submissions across re-renders

  // Good feedback
  const handleGood = async () => {
    if (hasSubmitted || submitting || submissionRef.current) return; // Prevent multiple submissions
    
    submissionRef.current = true;
    setSubmitting(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.info('🟦 [feedback][INFO] Submitting good feedback for message:', messageId, 'index:', messageIndex);
      }
      await axios.post('/api/feedback', {
        sessionId,
        userId,
        rating: 'good',
        messageIndex: messageIndex, // Ensure messageIndex is always passed
      });
      console.info('🟩 [feedback][SUCCESS] Good feedback submitted successfully');
      setHasSubmitted(true);
      setState('good');
      onFeedback('good');
      setTimeout(() => setState('done'), 1200);
    } catch (err: any) {
      console.error('🟥 [feedback][ERROR] Failed to submit good feedback:', err);
      
      // Handle duplicate feedback submission
      if (err.response?.status === 409) {
        // Feedback already submitted - show success state
        setHasSubmitted(true);
        setState('good');
        onFeedback('good');
        setTimeout(() => setState('done'), 1200);
      } else {
        // Other error - show error state briefly
        setState('init');
        submissionRef.current = false; // Reset ref on error
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Bad feedback
  const handleBad = () => {
    setShowFeedbackDialog(true);
  };

  const handleBadSubmit = async (comment: string) => {
    if (hasSubmitted || submitting || submissionRef.current) return; // Prevent multiple submissions
    
    submissionRef.current = true;
    setSubmitting(true);
    try {
      if (process.env.NODE_ENV === 'development') {
        console.info('🟦 [feedback][INFO] Submitting bad feedback for message:', messageId, 'index:', messageIndex);
      }
      await axios.post('/api/feedback', {
        sessionId,
        userId,
        rating: 'bad',
        messageIndex: messageIndex, // Ensure messageIndex is always passed
        comments: comment,
      });
      console.info('🟩 [feedback][SUCCESS] Bad feedback submitted successfully');
      setHasSubmitted(true);
      setState('bad');
      onFeedback('bad', comment);
      setTimeout(() => setState('done'), 1200);
    } catch (err: any) {
      console.error('🟥 [feedback][ERROR] Failed to submit bad feedback:', err);
      
      // Handle duplicate feedback submission
      if (err.response?.status === 409) {
        // Feedback already submitted - show success state
        setHasSubmitted(true);
        setState('bad');
        onFeedback('bad', comment);
        setTimeout(() => setState('done'), 1200);
        return; // Don't re-throw for duplicate submissions
      }
      
      // Re-throw other errors to let the dialog handle them
      throw err;
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

  // Render the feedback dialog
  if (showFeedbackDialog) {
    return (
      <>
        <FeedbackDialog
          isOpen={showFeedbackDialog}
          onClose={() => setShowFeedbackDialog(false)}
          onSubmit={handleBadSubmit}
          title="Help us improve this response"
          placeholder="Please tell us what was wrong with this response..."
        />
        {/* Keep the buttons visible while dialog is open */}
        <div className="flex items-center gap-2 mt-2">
          <button
            className={clsx(
              'p-1 rounded',
              'hover:bg-gray-700 text-gray-300',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-400',
              (submitting || hasSubmitted) && 'opacity-50 pointer-events-none'
            )}
            onClick={handleGood}
            disabled={submitting || hasSubmitted}
            title="Good response"
            aria-label="Mark as good response"
          >
            <HandThumbUpIcon className="w-5 h-5" />
          </button>
          <button
            className={clsx(
              'p-1 rounded',
              'hover:bg-gray-700 text-gray-300',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-400',
              (submitting || hasSubmitted) && 'opacity-50 pointer-events-none'
            )}
            onClick={handleBad}
            disabled={submitting || hasSubmitted}
            title="Bad response"
            aria-label="Mark as bad response"
          >
            <HandThumbDownIcon className="w-5 h-5" />
          </button>
        </div>
      </>
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
          'focus:outline-none focus:ring-2 focus:ring-blue-400',
          (submitting || hasSubmitted) && 'opacity-50 pointer-events-none'
        )}
        onClick={handleGood}
        disabled={submitting || hasSubmitted}
        title="Good response"
        aria-label="Mark as good response"
      >
        <HandThumbUpIcon className="w-5 h-5" />
      </button>
      <button
        className={clsx(
          'p-1 rounded',
          'hover:bg-gray-700 text-gray-300',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-400',
          (submitting || hasSubmitted) && 'opacity-50 pointer-events-none'
        )}
        onClick={handleBad}
        disabled={submitting || hasSubmitted}
        title="Bad response"
        aria-label="Mark as bad response"
      >
        <HandThumbDownIcon className="w-5 h-5" />
      </button>
    </div>
  );
} 