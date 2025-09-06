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
  documents?: Array<{
    documentId: string;
    fileName: string;
    firestoreId?: string;
  }>;
}

export function useChatMessages(chatId: string, userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);

  // Fetch initial messages (latest 10)
  useEffect(() => {
    async function fetchMessages() {
      if (!chatId) return;
      try {
        const res = await axios.get(`/api/sessions/${chatId}?limit=10`);
        const fetchedMessages = res.data.messages || [];
        setMessages(fetchedMessages);
        setHasMore(res.data.pagination?.hasMore || false);
        setTotalMessages(res.data.pagination?.totalMessages || fetchedMessages.length);
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

  // Load more messages function
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const res = await axios.get(`/api/sessions/${chatId}?limit=10&offset=${messages.length}&loadMore=true`);
      const newMessages = res.data.messages || [];
      setMessages(prev => [...newMessages, ...prev]); // Prepend older messages
      setHasMore(res.data.pagination?.hasMore || false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load more messages';
      toast.error(errorMessage);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, messages.length, hasMore, loadingMore]);

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
    loadingMore,
    errorMessages,
    hasMore,
    totalMessages,
    addMessage,
    updateMessage,
    removeMessage,
    loadMoreMessages
  };
} 