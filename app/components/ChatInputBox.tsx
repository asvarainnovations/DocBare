import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import React from 'react';

interface ChatInputBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
}

export default function ChatInputBox({ value, onChange, onSend, loading, disabled, error }: ChatInputBoxProps) {
  return (
    <>
      <div className="w-full flex justify-center sticky bottom-0 z-20 pointer-events-none">
        <form
          className="pointer-events-auto w-full max-w-2xl flex flex-col bg-[#23272F] rounded-2xl shadow-lg px-4 pt-3 pb-2 mb-6 border border-gray-700"
          style={{ boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)' }}
          onSubmit={onSend}
        >
          {/* Upper: Textarea */}
          <textarea
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-base px-2 rounded-xl resize-none min-h-[36px] max-h-32 mb-1"
            placeholder="Ask anything..."
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={loading || disabled}
            autoComplete="off"
            rows={1}
            style={{ minHeight: 36 }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend(e as any);
              }
            }}
          />
          {/* Lower: Attach + Send row */}
          <div className="flex flex-row items-center justify-between mt-0">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-slate/60 transition-colors text-gray-300"
              aria-label="Add attachment"
              disabled={loading || disabled}
              style={{ minWidth: 36, minHeight: 36 }}
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <button
              type="submit"
              className={clsx(
                'p-2 rounded-full transition-colors',
                value.trim() && !loading && !disabled ? 'bg-accent hover:bg-accent/80 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
              aria-label="Send"
              disabled={!value.trim() || loading || disabled}
              style={{ minWidth: 36, minHeight: 36 }}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
      {/* Message below chat input */}
      <div className="w-full flex justify-center mb-4">
        <div className="text-xs text-gray-400 bg-transparent px-2 py-1 rounded">
          ChatGPT can make mistakes. Check important info. See Cookie Preferences.
        </div>
      </div>
      {error && <div className="text-red-400 text-sm text-center mt-2">{error}</div>}
    </>
  );
} 