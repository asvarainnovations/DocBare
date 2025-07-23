'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperClipIcon, DocumentIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  type: 'ai' | 'user';
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'I can help you draft a legal document. What type of document do you need?',
      type: 'ai',
    },
    {
      id: '2',
      content: 'I need an NDA template for a software development project.',
      type: 'user',
      attachments: [
        {
          id: 'a1',
          name: 'project_scope.pdf',
          type: 'pdf',
          url: '#',
        },
      ],
    },
  ]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              'flex',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[70%] rounded-lg p-4',
                message.type === 'ai'
                  ? 'bg-slate text-white'
                  : 'bg-accent text-white'
              )}
            >
              {message.type === 'ai' ? (
                <div className="prose prose-invert text-sm">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
              
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center p-2 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-colors"
                    >
                      <DocumentIcon className="w-4 h-4 mr-2" />
                      <span className="text-xs">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
} 