import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserIcon, Bars3Icon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';

function useClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export default function NavBar({ showSidebarToggle, onSidebarToggle }: { showSidebarToggle?: boolean; onSidebarToggle?: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  return (
    <header className={clsx(
      'flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm',
      'bg-transparent'
    )}>
      <div className="flex items-center gap-3">
        {showSidebarToggle && (
          <button
            className="p-2 rounded hover:bg-slate/40 transition-colors"
            onClick={onSidebarToggle}
            aria-label="Open sidebar"
          >
            <Bars3Icon className="w-6 h-6 text-white" />
          </button>
        )}
        {/* DocBare Text */}
        <span className="text-3xl font-semibold tracking-tight text-white select-none">DocBare</span>
      </div>
      {/* User Avatar Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          className="flex items-center gap-2 p-2 rounded hover:bg-slate/40 transition-colors"
          onClick={() => setDropdownOpen((v) => !v)}
          aria-label="User menu"
        >
          <UserCircleIcon className="w-8 h-8 text-white" />
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-slate border border-gray-700 rounded shadow-lg z-30">
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700 text-white">
              <UserIcon className="w-4 h-4" /> Profile
            </button>
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700 text-white">
              <Cog6ToothIcon className="w-4 h-4" /> Settings
            </button>
            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700 text-red-400">
              <ArrowRightOnRectangleIcon className="w-4 h-4" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 