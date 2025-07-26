'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ClipboardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface AnimatedCopyButtonProps {
  content: string;
}

export default function AnimatedCopyButton({ content }: AnimatedCopyButtonProps) {
  const [showCheck, setShowCheck] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setShowCheck(true);
      setTimeout(() => setShowCheck(false), 1200);
    } catch (err) {
      console.error('🟥 [copy_button][ERROR] Failed to copy to clipboard:', err);
    }
  };

  return (
    <button
      className={clsx(
        'p-1 rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400',
        showCheck && 'text-green-400 animate-bounce'
      )}
      onClick={handleCopy}
      title={showCheck ? 'Copied!' : 'Copy response'}
      aria-label="Copy response"
    >
      {showCheck ? <CheckCircleIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
    </button>
  );
} 