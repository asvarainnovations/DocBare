import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface ThinkingDisplayProps {
  isThinking: boolean;
  thinkingContent: string;
  onComplete?: () => void;
}

export function ThinkingDisplay({ isThinking, thinkingContent, onComplete }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayContent, setDisplayContent] = useState('');

  useEffect(() => {
    if (isThinking && thinkingContent) {
      setDisplayContent(thinkingContent);
    } else if (!isThinking && thinkingContent) {
      // Keep content visible for a few seconds after completion
      setTimeout(() => {
        setIsExpanded(false);
        onComplete?.();
      }, 3000);
    }
  }, [isThinking, thinkingContent, onComplete]);

  if (!thinkingContent && !isThinking) return null;

  return (
    <div className="mb-4 border border-gray-300 rounded-lg bg-gray-50 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <span className="flex items-center">
          {isThinking ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>AI is analyzing...</span>
            </div>
          ) : (
            <span>AI Analysis Complete</span>
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
            <pre className="whitespace-pre-wrap text-gray-600 font-mono text-xs bg-gray-100 p-3 rounded border max-h-96 overflow-y-auto">
              {displayContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
