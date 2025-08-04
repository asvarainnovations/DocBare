import { useState } from 'react';
import axios from 'axios';

export default function FeedbackBar({ sessionId, userId }: { sessionId: string; userId: string }) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Convert numeric rating to string format
      const ratingString = rating > 0 ? 'good' : 'bad';
      
      await axios.post('/api/feedback', {
        sessionId,
        userId,
        rating: ratingString,
        comments: comment,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('🟥 [FEEDBACK][ERROR] Failed to submit feedback:', err);
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return <div className="text-green-400 text-sm mt-2">Thank you for your feedback!</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4 bg-slate rounded p-4 max-w-2xl mx-auto">
      {error && (
        <div className="text-red-400 text-sm mb-2">{error}</div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-white">Rate this session:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={star <= rating ? 'text-yellow-400' : 'text-gray-400'}
            onClick={() => setRating(star)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="bg-black/30 text-white rounded p-2 mt-2"
        placeholder="Leave a comment (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
      />
      <button
        type="submit"
        className="bg-accent text-white px-4 py-2 rounded mt-2 self-end disabled:opacity-50"
        disabled={loading || rating === 0}
      >
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
} 