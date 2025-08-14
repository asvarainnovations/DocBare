"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface Chat {
  id: string;
  sessionName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  refreshChats: () => void;
  refreshTrigger: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const addChat = useCallback((chat: Chat) => {
    setChats((prev) => {
      // Check if chat already exists
      const exists = prev.find((c) => c.id === chat.id);
      if (exists) {
        return prev;
      }
      return [chat, ...prev];
    });
  }, []);

  const updateChat = useCallback((chatId: string, updates: Partial<Chat>) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, ...updates } : chat))
    );
  }, []);

  const removeChat = useCallback((chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
  }, []);

  const refreshChats = useCallback(() => {
    // Trigger a refresh by incrementing the trigger
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        addChat,
        updateChat,
        removeChat,
        refreshChats,
        refreshTrigger,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
