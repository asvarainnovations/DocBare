'use client';

import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { DocumentIcon } from '@heroicons/react/24/outline';

interface Page {
  id: string;
  title: string;
  content: string;
}

export default function Canvas() {
  const [pages, setPages] = useState<Page[]>([
    {
      id: '1',
      title: 'Page 1',
      content: 'This is the first page of the document...',
    },
    {
      id: '2',
      title: 'Page 2',
      content: 'This is the second page of the document...',
    },
  ]);

  return (
    <div className="flex-1 bg-surface p-4 overflow-y-auto">
      <Reorder.Group axis="y" values={pages} onReorder={setPages}>
        {pages.map((page) => (
          <Reorder.Item
            key={page.id}
            value={page}
            className="mb-4"
            whileDrag={{
              scale: 1.02,
              boxShadow: '0 0 20px rgba(0,0,0,0.2)',
            }}
          >
            <motion.div
              className="bg-slate rounded-lg p-6 cursor-move"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center mb-4">
                <DocumentIcon className="w-5 h-5 text-gray-400 mr-2" />
                <h3 className="text-white font-medium">{page.title}</h3>
              </div>
              <p className="text-gray-300 text-sm">{page.content}</p>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
} 