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
  const [chats, setChats] = useState([
    { id: "1", title: "Asvara Legal AI Overview" },
    { id: "2", title: "RAG Legal Knowledge Base" },
    { id: "3", title: "Visionary Tech Founder" },
    { id: "4", title: "Atharvaveda Digitalization Str..." },
    { id: "5", title: "Meta Catalyst and Asvara Ins..." },
  ]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(null));

  function handleNewChat() {
    const newId = Date.now().toString();
    setChats([{ id: newId, title: "New Chat" }, ...chats]);
    onSelectChat?.(newId);
  }
  function handleRename(id: string) {
    setRenamingId(id);
    setRenameValue(chats.find((c) => c.id === id)?.title || "");
    setMenuOpen(null);
  }
  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChats(
      chats.map((c) => (c.id === renamingId ? { ...c, title: renameValue } : c))
    );
    setRenamingId(null);
  }
  function handleDelete(id: string) {
    setChats(chats.filter((c) => c.id !== id));
    setMenuOpen(null);
    if (selectedChatId === id && chats.length > 1) {
      onSelectChat?.(chats[0].id);
    }
  }

  return (
    <aside
      className={clsx(
        "fixed top-0 left-0 h-full bg-surface border-r border-gray-800 flex flex-col transition-all duration-300 z-20",
        open ? "w-60" : "w-0 invisible"
      )}
      style={{ transitionProperty: "width, visibility", overflow: "hidden" }}
    >
      {/* Sidebar NavBar */}
      {open && <SidebarNavBar onToggle={onToggle} />}
      {/* Buttons */}
      <div className="flex flex-col gap-1 px-2 py-3">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate/30 transition-colors text-white"
        >
          <PlusIcon className="w-5 h-5" />
          {open && <span>New chat</span>}
        </button>
        <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate/30 transition-colors text-white">
          <MagnifyingGlassIcon className="w-5 h-5" />
          {open && <span>Search chats</span>}
        </button>
      </div>
      {/* Chats */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs text-gray-400 px-3 py-2">Chats</div>
        <ul className="space-y-1">
          {chats.map((chat) => (
            <li
              key={chat.id}
              className={clsx(
                "group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-800/60 transition-colors",
                "relative",
                selectedChatId === chat.id && "bg-gray-800/80"
              )}
              onClick={() => onSelectChat?.(chat.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden w-full">
                {/* Removed icon here */}
                {open &&
                  (renamingId === chat.id ? (
                    <form onSubmit={handleRenameSubmit} className="flex-1">
                      <input
                        className="bg-transparent border-b border-accent text-white text-sm px-1 w-full outline-none"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        autoFocus
                      />
                    </form>
                  ) : (
                    <span className="truncate text-white text-sm flex-1">
                      {chat.title}
                    </span>
                  ))}
              </div>
              {open && (
                <div className="relative" ref={menuRef}>
                  <button
                    className="p-1 rounded hover:bg-slate/30 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === chat.id ? null : chat.id);
                    }}
                  >
                    <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  </button>
                  {menuOpen === chat.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-slate border border-gray-700 rounded shadow-lg z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(chat.id);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-700 text-white"
                      >
                        <PencilIcon className="w-4 h-4" /> Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(chat.id);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-700 text-red-400"
                      >
                        <TrashIcon className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      {/* Bottom area (optional) */}
      <div className="h-10" />
    </aside>
  );
}
