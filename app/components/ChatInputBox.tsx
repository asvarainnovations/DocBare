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
      <form
        className="w-full max-w-2xl mx-auto flex flex-col rounded-2xl shadow-lg"
        style={{ boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)' }}
        onSubmit={onSend}
      >
        {/* Textarea (upper section) */}
        <textarea
          className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 text-base px-2 py-2 rounded-xl resize-none min-h-[36px] max-h-32 mb-2"
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
        {/* Bottom row: Attach + Send */}
        <div className="flex flex-row items-center justify-between mt-0">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-slate/60 transition-colors text-gray-300 flex-shrink-0"
            aria-label="Add attachment"
            disabled={loading || disabled}
            style={{ minWidth: 36, minHeight: 36 }}
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          <button
            type="submit"
            className={clsx(
              'p-2 rounded-full transition-colors flex-shrink-0',
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
      {error && <div className="text-red-400 text-sm text-center mt-2">{error}</div>}
    </>
  );
} 