import { ChatBubbleLeftRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function SidebarNavBar({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-surface">
      <Image src="/logo-white.png" alt="DocBare Logo" width={64} height={28} className="object-contain" />
      <button
        className="p-2 rounded hover:bg-slate/40 transition-colors"
        onClick={onToggle}
        aria-label="Toggle sidebar"
      >
        <ChevronLeftIcon className="w-6 h-6 text-white" />
      </button>
    </div>
  );
} 