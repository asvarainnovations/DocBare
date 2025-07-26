import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserIcon, Bars3Icon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

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
  const { data: session, status } = useSession();
  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  const isGoogleUser = !!session?.user?.image;

  return (
    <header className={clsx(
      'flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm',
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
      {/* User Avatar and Auth Button */}
      <div className="flex items-center gap-4">
        {status === 'authenticated' ? (
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 p-2 rounded hover:bg-slate/40 transition-colors"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-label="User menu"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-gray-600"
                  onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
                />
              ) : (
                <UserCircleIcon className="w-8 h-8 text-white" />
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate border border-gray-700 rounded shadow-lg z-30">
                {isGoogleUser ? (
                  <div className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-400 cursor-default select-text opacity-70">
                    <UserIcon className="w-4 h-4" />
                    <span className="truncate">{session.user.email}</span>
                  </div>
                ) : (
                  <Link href="/profile" className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700 text-white">
                    <UserIcon className="w-4 h-4" /> Profile
                  </Link>
                )}
                <Link href="/settings" className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700 text-white">
                  <Cog6ToothIcon className="w-4 h-4" /> Settings
                </Link>
                <button className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700 text-red-400" onClick={() => signOut({ callbackUrl: '/' })}>
                  <ArrowRightOnRectangleIcon className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => signIn()} className="text-white bg-accent px-4 py-2 rounded">Login</button>
        )}
      </div>
    </header>
  );
} 