import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, UserIcon, Bars3Icon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useSidebar } from './SidebarContext';

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
  const { sidebarOpen } = useSidebar();
  useClickOutside(dropdownRef, () => setDropdownOpen(false));

  const isGoogleUser = !!session?.user?.image;

  return (
    <header className={clsx(
      'flex items-center justify-between px-3 sm:px-4 py-2 fixed top-0 z-40',
      'background-transparent',
      // Responsive positioning based on sidebar state
      'left-0 right-0',
      // Desktop: adjust left position when sidebar is open
      sidebarOpen ? 'lg:left-64 lg:right-0' : 'lg:left-0 lg:right-0',
      // Hide on mobile/tablet when sidebar is open
      sidebarOpen ? 'hidden lg:flex' : 'flex'
    )}>
      <div className="flex items-center gap-2 sm:gap-3">
        {showSidebarToggle && (
          <button
            className="p-1.5 sm:p-2 rounded hover:bg-slate/40 transition-colors"
            onClick={onSidebarToggle}
            aria-label="Open sidebar"
          >
            <Bars3Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        )}
        {/* DocBare Text */}
        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-white select-none pl-2 sm:pl-4">DocBare</span>
      </div>
      {/* User Avatar and Auth Button - Only visible on desktop */}
      <div className="hidden lg:flex items-center gap-2 sm:gap-4">
        {status === 'authenticated' ? (
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 p-1.5 sm:p-2 rounded hover:bg-slate/40 transition-colors"
              onClick={() => setDropdownOpen((v) => !v)}
              aria-label="User menu"
            >
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-600"
                  onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
                />
              ) : (
                <UserCircleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-slate border border-gray-700 rounded shadow-lg z-30">
                {isGoogleUser ? (
                  <div className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-400 cursor-default select-text opacity-70">
                    <UserIcon className="w-4 h-4" />
                    <span className="truncate">{session.user.email}</span>
                  </div>
                ) : (
                  <Link href="/profile" className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-700 text-white">
                    <UserIcon className="w-4 h-4" /> Profile
                  </Link>
                )}
                <Link href="/settings" className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-700 text-white">
                  <Cog6ToothIcon className="w-4 h-4" /> Settings
                </Link>
                <button className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-700 text-red-400" onClick={() => signOut({ callbackUrl: '/' })}>
                  <ArrowRightOnRectangleIcon className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => signIn()} className="text-white bg-accent px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm">Login</button>
        )}
      </div>
    </header>
  );
} 