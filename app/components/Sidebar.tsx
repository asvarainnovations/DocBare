"use client";

import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import SidebarNavBar from "./SidebarNavBar";
import { useSession, signIn, signOut } from "next-auth/react";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import ConfirmationDialog from "./ConfirmationDialog";
import { useChat } from "./ChatContext";

interface Chat {
  id: string;
  sessionName: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  const { chats, updateChat, removeChat, refreshTrigger, addChat, setChatsFromAPI } = useChat();

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(null));
  useClickOutside(userDropdownRef, () => setUserDropdownOpen(false));

  // Import usePathname to detect current route
  const pathname = usePathname();

  // Fetch chat sessions for the current user
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    async function fetchChats() {
      try {
        const res = await axios.get("/api/user_chats", {
          params: { userId: session?.user?.id },
        });

        // Update chats through context
        if (res.data.chats) {
          setChatsFromAPI(res.data.chats);
        }
      } catch (err: any) {
        console.error("Failed to fetch chats:", err);
      }
    }
    fetchChats();
  }, [status, session?.user?.id, refreshTrigger]);

  // Handle rename functionality
  const handleRename = async (chatId: string, newTitle: string) => {
    try {
      await axios.patch(`/api/sessions/${chatId}/rename`, { title: newTitle });
      // Update the chat in the local state
      updateChat(chatId, { sessionName: newTitle });
      setRenamingId(null);
      setRenameValue("");
    } catch (error) {
      console.error("Failed to rename chat:", error);
      alert("Failed to rename chat.");
    }
  };

  // Handle delete functionality
  const handleDelete = async () => {
    if (!chatToDelete) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/api/sessions/${chatToDelete.id}`);
      removeChat(chatToDelete.id);
      if (selectedChatId === chatToDelete.id && onSelectChat) {
        onSelectChat("");
      }
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Failed to delete chat.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isGoogleUser = !!session?.user?.image;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.3,
          }}
          className={clsx(
            "fixed top-0 left-0 min-h-screen h-screen bg-sidebar-bg border-r border-gray-800 flex flex-col z-30",
            // Mobile: full width when open
            "w-full sm:w-80",
            // Tablet: medium width
            "md:w-80",
            // Desktop: larger width
            "lg:w-64"
          )}
        >
          {/* SidebarNavBar for Desktop */}
          <div className="hidden lg:block">
            <SidebarNavBar onToggle={onToggle} />
          </div>

          {/* Sidebar Header with Close Button (Mobile) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex items-center justify-between p-4 border-b border-gray-700 lg:hidden"
          >
            <span className="text-xl font-semibold text-white">DocBare</span>
            <button
              onClick={onToggle}
              className="p-2 rounded hover:bg-gray-700 transition-colors"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </motion.div>

          {/* Buttons */}
          <motion.div
            className="flex flex-col gap-1 px-2 py-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.2 }}
          >
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate/30 transition-colors text-white"
              aria-label="Create new chat"
            >
              <PlusIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">New chat</span>
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate/30 transition-colors text-white"
              aria-label="Search chats"
            >
              <MagnifyingGlassIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Search chats</span>
            </button>
          </motion.div>

          {/* Chats */}
          <div className="text-xs text-gray-400 px-3 py-2">Chats</div>
          <motion.div
            className="flex-1 overflow-y-auto px-2 pb-20 sm:pb-48"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <ul className="space-y-1">
              {chats.map((chat, index) => (
                <motion.li
                  key={chat.id || `chat-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.4 + index * 0.05,
                    duration: 0.2,
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
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
                      {chat.sessionName || "Untitled Chat"}
                    </span>
                    {/* 3-dot menu, only visible on hover */}
                    <div
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(chat.id === menuOpen ? null : chat.id);
                      }}
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                    </div>
                    {/* Dropdown menu */}
                    {menuOpen === chat.id && (
                      <motion.div
                        key={`chat-menu-${chat.id}`}
                        ref={menuRef}
                        className="absolute right-2 top-10 z-30 bg-[#23272f] border border-gray-700 rounded-lg shadow-lg py-1 w-32 sm:w-36 flex flex-col"
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                      >
                        <button
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white hover:bg-gray-700 hover:text-gray-100 transition-all duration-200 rounded-t-lg group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(chat.id);
                            setRenameValue(chat.sessionName || "");
                            setMenuOpen(null);
                          }}
                        >
                          <PencilIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                          Rename
                        </button>
                        <button
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-600 hover:text-white transition-all duration-200 rounded-b-lg group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(null);
                            setChatToDelete(chat);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <TrashIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Rename Input Modal */}
          {renamingId && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Rename Chat
                  </h3>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRename(renamingId, renameValue);
                      } else if (e.key === "Escape") {
                        setRenamingId(null);
                        setRenameValue("");
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new chat name..."
                    autoFocus
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setRenamingId(null);
                        setRenameValue("");
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRename(renamingId, renameValue)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Rename
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* User Profile Section (Mobile/Tablet) - Similar to ChatGPT */}
          <motion.div
            className="border-t border-gray-700 p-4 lg:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.2 }}
          >
            {status === "authenticated" ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full p-2 rounded hover:bg-gray-700 transition-colors"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label="User menu"
                >
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border border-gray-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {session.user.name?.charAt(0) ||
                          session.user.email?.charAt(0) ||
                          "U"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="text-white text-sm font-medium truncate">
                      {session.user.name || session.user.email}
                    </div>
                    <div className="text-gray-400 text-xs">Free Plan</div>
                  </div>
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      key="user-dropdown"
                      className="absolute bottom-full left-0 right-0 mb-2 bg-[#23272f] border border-gray-700 rounded-lg shadow-lg py-2 z-50"
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isGoogleUser ? (
                        <div className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-400 cursor-default select-text opacity-70">
                          <UserIcon className="w-5 h-5" />
                          <span className="truncate">{session.user.email}</span>
                        </div>
                      ) : (
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-700 text-white"
                        >
                          <UserIcon className="w-5 h-5" /> Profile
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-700 text-white"
                      >
                        <Cog6ToothIcon className="w-5 h-5" /> Settings
                      </Link>
                      <button
                        type="button"
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-700 text-red-400"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="w-full text-white bg-accent px-4 py-2 rounded text-sm hover:bg-accent/80 transition-colors"
              >
                Login
              </button>
            )}
          </motion.div>
        </motion.aside>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setChatToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Chat"
        message={`Are you sure you want to delete "${
          chatToDelete?.sessionName || "this chat"
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </AnimatePresence>
  );
}
