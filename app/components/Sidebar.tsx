"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import SidebarNavBar from "./SidebarNavBar";
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

function useClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function Sidebar({
  open,
  onToggle,
  selectedChatId,
  onSelectChat,
}: {
  open: boolean;
  onToggle: () => void;
  selectedChatId?: string;
  onSelectChat?: (id: string) => void;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(null));

  // Fetch chat sessions for the current user
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    async function fetchChats() {
      try {
        // Firestore REST API: /api/user_chats?userId=xxx (let's use this endpoint)
        const res = await axios.get('/api/user_chats', { params: { userId: session?.user?.id } });
        setChats(res.data.chats || []);
      } catch (err) {
        setChats([]);
      }
    }
    fetchChats();
  }, [status, session?.user?.id, selectedChatId]);

  // Remove router.events code

  async function handleNewChat() {
    if (!session?.user?.id) return;
    try {
      const res = await axios.post('/api/create_chat_session', { firstMessage: '', userId: session.user.id });
      const chatId = res.data.chatId;
      // Refetch chats after creating
      const chatsRes = await axios.get('/api/user_chats', { params: { userId: session.user.id } });
      setChats(chatsRes.data.chats || []);
      onSelectChat?.(chatId);
    } catch (err) {}
  }

  // Rename and delete logic would require backend endpoints; for now, just disable them

  return (
    <aside
      className={clsx(
        "fixed top-0 left-0 min-h-screen h-screen bg-surface border-r border-gray-800 flex flex-col transition-all duration-300 z-20",
        open ? "w-60 md:w-64" : "w-0 invisible"
      )}
      style={{ transitionProperty: "width, visibility", overflow: "hidden" }}
    >
      {/* Sidebar NavBar */}
      {open && <SidebarNavBar onToggle={onToggle} />}
      {/* Buttons */}
      <div className="flex flex-col gap-1 px-2 py-3">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate/30 transition-colors text-white"
          aria-label="Create new chat"
        >
          <PlusIcon className="w-5 h-5" />
          {open && <span className="hidden sm:inline">New chat</span>}
        </button>
        <button 
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate/30 transition-colors text-white"
          aria-label="Search chats"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
          {open && <span className="hidden sm:inline">Search chats</span>}
        </button>
      </div>
      {/* Chats */}
      <div className="flex-1 overflow-y-auto px-2 pb-48">
        <div className="text-xs text-gray-400 px-3 py-2 hidden sm:block">Chats</div>
        <ul className="space-y-1">
          {chats.map((chat) => (
            <li
              key={chat.id}
              className={clsx(
                "group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-800/60 transition-colors",
                "relative",
                selectedChatId === chat.id && "bg-gray-800/80"
              )}
              onClick={() => {
                router.push(`/c/${chat.id}`);
                if (onSelectChat) onSelectChat(chat.id);
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <span className="truncate text-white text-sm flex-1 min-w-0">
                  {chat.sessionName || chat.title || 'Untitled Chat'}
                </span>
                {/* 3-dot menu, only visible on hover */}
                <div
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => { e.stopPropagation(); setMenuOpen(chat.id === menuOpen ? null : chat.id); }}
                >
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                </div>
                {/* Dropdown menu */}
                {menuOpen === chat.id && (
                  <div ref={menuRef} className="absolute right-2 top-10 z-30 bg-[#23272f] border border-gray-700 rounded-lg shadow-lg py-1 w-36 flex flex-col animate-fade-in">
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-gray-700 rounded-t-lg"
                      onClick={e => { e.stopPropagation(); setRenamingId(chat.id); setRenameValue(chat.sessionName || chat.title || ''); setMenuOpen(null); }}
                    >
                      <PencilIcon className="w-4 h-4" /> Rename
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-700 rounded-b-lg"
                      onClick={async e => {
                        e.stopPropagation();
                        setMenuOpen(null);
                        if (!window.confirm('Are you sure you want to delete this chat?')) return;
                        try {
                          await axios.delete(`/api/sessions/${chat.id}`);
                          setChats(prev => prev.filter(c => c.id !== chat.id));
                          if (selectedChatId === chat.id && onSelectChat) {
                            onSelectChat('');
                          }
                        } catch (err) {
                          alert('Failed to delete chat.');
                        }
                      }}
                    >
                      <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
