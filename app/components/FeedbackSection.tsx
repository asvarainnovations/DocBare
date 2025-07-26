'use client';

import { useState } from 'react';
import clsx from 'clsx';
import axios from 'axios';
import { HandThumbUpIcon, HandThumbDownIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  const [state, setState] = useState<'init' | 'good' | 'bad' | 'badDialog' | 'done'>('init');
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Good feedback
  const handleGood = async () => {
    setSubmitting(true);
    try {
      console.info('🟦 [feedback][INFO] Submitting good feedback for message:', messageId);
      await axios.post('/api/feedback', {
        sessionId,
        userId,
        rating: 1,
        messageIndex,
        messageId,
      });
      console.info('🟩 [feedback][SUCCESS] Good feedback submitted successfully');
      setState('good');
      onFeedback('good');
      setTimeout(() => setState('done'), 1200);
    } catch (err) {
      console.error('🟥 [feedback][ERROR] Failed to submit good feedback:', err);
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
      console.info('🟦 [feedback][INFO] Submitting bad feedback for message:', messageId);
      await axios.post('/api/feedback', {
        sessionId,
        userId,
        rating: -1,
        messageIndex,
        messageId,
        comments: comment,
      });
      console.info('🟩 [feedback][SUCCESS] Bad feedback submitted successfully');
      setState('bad');
      onFeedback('bad', comment);
      setTimeout(() => setState('done'), 1200);
    } catch (err) {
      console.error('🟥 [feedback][ERROR] Failed to submit bad feedback:', err);
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
          className="bg-black/30 text-white rounded p-2 mt-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Your comment (required)"
          value={comment}
          onChange={e => { setComment(e.target.value); setCommentError(''); }}
          rows={2}
          disabled={submitting}
        />
        {commentError && <div className="text-xs text-red-400">{commentError}</div>}
        <div className="flex gap-2 justify-end">
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setState('init')}
            type="button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 rounded bg-accent text-white text-sm disabled:opacity-50 hover:bg-accent/80 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleBadSubmit}
            disabled={submitting}
          >
            Submit
          </button>
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
          'focus:outline-none focus:ring-2 focus:ring-blue-400',
          submitting && 'opacity-50 pointer-events-none'
        )}
        onClick={handleGood}
        disabled={submitting}
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
          submitting && 'opacity-50 pointer-events-none'
        )}
        onClick={handleBad}
        disabled={submitting}
        title="Bad response"
        aria-label="Mark as bad response"
      >
        <HandThumbDownIcon className="w-5 h-5" />
      </button>
    </div>
  );
} 