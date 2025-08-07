import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
}

export function useChatMessages(chatId: string, userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      if (!chatId) return;
      try {
        const res = await axios.get(`/api/sessions/${chatId}`);
        const fetchedMessages = res.data.messages || [];
        setMessages(fetchedMessages);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to load messages';
        setErrorMessages(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoadingMessages(false);
      }
    }
    fetchMessages();
  }, [chatId, userId]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  return {
    messages,
    setMessages,
    loadingMessages,
    errorMessages,
    addMessage,
    updateMessage,
    removeMessage
  };
} 