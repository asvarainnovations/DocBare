import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ThinkingDisplayProps {
  isThinking: boolean;
  thinkingContent: string;
  onComplete?: () => void;
}

export function ThinkingDisplay({ isThinking, thinkingContent, onComplete }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayContent, setDisplayContent] = useState('');
  const [thinkingTime, setThinkingTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format thinking content by removing "THINKING:" prefixes and organizing it
  const formatThinkingContent = (content: string) => {
    // Split by THINKING: and clean up
    const parts = content
      .split('THINKING:')
      .map(part => part.trim())
      .filter(part => part.length > 0);
    
    // Join all parts and return - AI now formats content properly
    return parts.join('\n\n');
  };

  useEffect(() => {
    if (isThinking && thinkingContent) {
      // Start timing when thinking begins
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        setThinkingTime(0); // Reset timer for new thinking session
        intervalRef.current = setInterval(() => {
          setThinkingTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
        }, 1000);
      }
      setDisplayContent(formatThinkingContent(thinkingContent));
    } else if (!isThinking && thinkingContent) {
      // Stop timing when thinking is complete
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Calculate final thinking time
      if (startTimeRef.current) {
        const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setThinkingTime(finalTime);
        startTimeRef.current = null; // Reset for next thinking session
      }
      setDisplayContent(formatThinkingContent(thinkingContent));
      // Keep content visible for a few seconds after completion
      setTimeout(() => {
        setIsExpanded(false);
        onComplete?.();
      }, 3000);
    }
  }, [isThinking, thinkingContent, onComplete]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!thinkingContent && !isThinking) return null;

  return (
    <div className="mb-4 border border-gray-600 rounded-lg bg-gray-800 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-white hover:bg-gray-700 transition-colors rounded-t-lg"
      >
        <span className="flex items-center">
          {isThinking ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span>AI is analyzing...</span>
            </div>
          ) : (
            <span>Thought for {thinkingTime} seconds</span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>
      
             {isExpanded && (
         <div className="px-4 pb-4">
           <div className="prose prose-sm max-w-none">
             <div className="text-gray-300 text-sm bg-gray-900 p-4 rounded border max-h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono">
               {displayContent}
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
