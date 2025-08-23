'use client';
import { useState } from 'react';
import clsx from 'clsx';
import axios from 'axios';

interface RegenerateButtonProps {
  sessionId: string;
  userId: string;
  messageIndex: number;
  messages: any[];
  onRegenerate: (newContent: string) => void;
  onRegeneratingChange: (isRegenerating: boolean) => void;
}

export default function RegenerateButton({
  sessionId,
  userId,
  messageIndex,
  messages,
  onRegenerate,
  onRegeneratingChange,
}: RegenerateButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    onRegeneratingChange(true);
    try {
      // Find the previous user message
      const previousUserMessage = messages
        .slice(0, messageIndex)
        .reverse()
        .find(msg => msg.role === 'USER');

      if (!previousUserMessage) {
        console.error('🟥 [regenerate][ERROR] No previous user message found');
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.info('🟩 [regenerate][INFO] Regenerating response for message index:', messageIndex);
        console.info('🟩 [regenerate][INFO] Previous user message:', {
          content: previousUserMessage.content.substring(0, 100),
          messageId: previousUserMessage.id
        });
      }

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: previousUserMessage.content,
          sessionId,
          userId,
        })
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      let thinkingContent = '';
      let isThinking = false;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        
        // Handle character-by-character streaming (same as useChatAI.ts)
        if (chunk.startsWith('THINKING:')) {
          const thinkingChunk = chunk.slice(9); // Remove 'THINKING:' prefix
          thinkingContent += thinkingChunk;
          isThinking = true;
          // Don't update the message content during thinking phase
        } else if (chunk.startsWith('FINAL:')) {
          // Switch from thinking to final response
          isThinking = false;
          // Don't update the message content for FINAL: prefix
        } else if (chunk.trim() && !chunk.startsWith('THINKING:') && !chunk.startsWith('FINAL:')) {
          // Regular content - this is the actual AI response
          aiResponse += chunk;
          onRegenerate(aiResponse);
        }
      }

      // Save the regenerated AI message to the database (only the final response, not thinking content)
      if (aiResponse.trim()) {
        if (process.env.NODE_ENV === 'development') {
          console.info('🟩 [regenerate][INFO] Final regenerated response:', {
            responseLength: aiResponse.length,
            thinkingContentLength: thinkingContent.length,
            isThinking: isThinking
          });
        }
        
        try {
          await axios.post('/api/chat', {
            sessionId,
            userId,
            role: 'ASSISTANT',
            content: aiResponse.trim()
          });
          console.info('🟩 [regenerate][SUCCESS] Regenerated AI message saved to database');
        } catch (saveError) {
          console.error('🟥 [regenerate][ERROR] Failed to save regenerated AI message:', saveError);
          // Don't fail the entire request if saving fails
        }
      }

      console.info('🟩 [regenerate][SUCCESS] Response regenerated successfully');
    } catch (error: any) {
      console.error('🟥 [regenerate][ERROR] Failed to regenerate response:', error);
      if (error.response?.status === 402) {
        alert('Insufficient API balance. Please add credits to continue.');
      } else {
        alert('Failed to regenerate response. Please try again.');
      }
    } finally {
      setIsRegenerating(false);
      onRegeneratingChange(false);
    }
  };

  return (
    <button
      className={clsx(
        'p-1 rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400',
        isRegenerating && 'opacity-50 pointer-events-none'
      )}
      aria-label="Regenerate response"
      title="Regenerate response"
      onClick={handleRegenerate}
      disabled={isRegenerating}
    >
      {isRegenerating ? (
        <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l5-5-5-5v4a10 10 0 1010 10h-2a8 8 0 01-8 8z"></path>
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M19.418 15A7.974 7.974 0 0020 12c0-4.418-3.582-8-8-8a7.963 7.963 0 00-7.418 5M4.582 9A7.974 7.974 0 004 12c0 4.418 3.582 8 8 8a7.963 7.963 0 007.418-5" />
        </svg>
      )}
    </button>
  );
} 