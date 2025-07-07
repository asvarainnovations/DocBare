'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import Sidebar from './components/Sidebar';
import NavBar from './components/NavBar';
import { PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import InputBar from './components/InputBar';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>('1');
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return null;
  }

  async function handleFirstPrompt(msg: string) {
    if (!session?.user?.id) {
      signIn();
      return;
    }
    const sessionRes = await axios.post('/api/create_chat_session', { firstMessage: msg, userId: session.user.id });
    const { chatId } = sessionRes.data;
    router.push(`/c/${chatId}`);
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar and overlay */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}
      {/* Main area */}
      <div className={clsx('flex-1 flex flex-col min-h-screen transition-all', sidebarOpen ? 'md:ml-60' : 'md:ml-0')}> 
        {/* Always render NavBar at the top, pass showSidebarToggle only when sidebar is closed */}
        <NavBar showSidebarToggle={!sidebarOpen} onSidebarToggle={() => setSidebarOpen(true)} />
        {/* Auth buttons */}
        {/* Removed Login/Logout button from here; now handled in NavBar */}
        {/* Centered content below NavBar */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-0">
          <div className="flex flex-col items-center w-full">
            <h1 className="text-2xl font-medium text-white mb-6 text-center">What's on your mind today?</h1>
            <div className="w-full max-w-2xl">
              <InputBar onSend={handleFirstPrompt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}