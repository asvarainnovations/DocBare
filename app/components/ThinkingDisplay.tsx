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
  const [userManuallyToggled, setUserManuallyToggled] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedContentRef = useRef<string>('');

  // Enhanced formatting function for DeepSeek reasoning content
  const formatThinkingContent = (content: string) => {
    if (!content || content.trim().length === 0) {
      return '';
    }

    // Remove any "THINKING:" prefixes that might be present
    let cleanContent = content.replace(/THINKING:/g, '').trim();
    
    // If content is very short or fragmented, return as-is for now
    if (cleanContent.length < 50) {
      return cleanContent;
    }

    // Format the content for better readability
    let formattedContent = cleanContent
      // Ensure proper spacing around numbered lists
      .replace(/(\d+\.\s*\*\*[^*]+\*\*:)/g, '\n\n$1')
      // Ensure proper spacing around bullet points
      .replace(/(\n\s*-\s+)/g, '\n$1')
      // Clean up excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Ensure proper spacing after colons in headers
      .replace(/(\*\*[^*]+\*\*:)\s*/g, '$1\n')
      // Add spacing before new sections
      .replace(/(\n)(\d+\.\s*\*\*)/g, '$1\n$2')
      // Clean up any remaining formatting issues
      .trim();

    // If the content starts with a numbered list, ensure proper formatting
    if (formattedContent.match(/^\d+\.\s*\*\*/)) {
      formattedContent = formattedContent.replace(/^(\d+\.\s*\*\*[^*]+\*\*:)/, '\n$1');
    }

    return formattedContent;
  };

  useEffect(() => {
    if (isThinking && thinkingContent) {
      // Accumulate content during thinking phase
      accumulatedContentRef.current = thinkingContent;
      
      // Start timing when thinking begins
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        setThinkingTime(0); // Reset timer for new thinking session
        intervalRef.current = setInterval(() => {
          setThinkingTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
        }, 1000);
      }
      
      // Format and display the accumulated content
      setDisplayContent(formatThinkingContent(accumulatedContentRef.current));
      setIsExpanded(true); // Keep expanded during thinking
      setUserManuallyToggled(false); // Reset user interaction flag
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
      
      // Final formatting of the complete content
      accumulatedContentRef.current = thinkingContent;
      setDisplayContent(formatThinkingContent(accumulatedContentRef.current));
      
      // Auto-close when AI response starts streaming (if user hasn't manually toggled)
      if (!userManuallyToggled) {
        setTimeout(() => {
          setIsExpanded(false);
        }, 1000); // Small delay to show completion
      }
    }
  }, [isThinking, thinkingContent, onComplete, userManuallyToggled]);

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
        onClick={() => {
          setIsExpanded(!isExpanded);
          setUserManuallyToggled(true); // Mark that user has manually interacted
        }}
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
              {displayContent || (isThinking ? 'Analyzing...' : '')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
