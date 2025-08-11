import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface SessionMetadata {
  id: string;
  sessionName?: string;
  user: {
    name: string;
  };
  createdAt: string;
}

export function useSessionMetadata(chatId: string) {
  const [sessionMeta, setSessionMeta] = useState<SessionMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [errorMeta, setErrorMeta] = useState<string | null>(null);

  // Fetch session metadata
  useEffect(() => {
    async function fetchMeta() {
      if (!chatId) return;
      try {
        const res = await axios.get(`/api/sessions/${chatId}/metadata`);
        setSessionMeta(res.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to load session info';
        setErrorMeta(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, [chatId]);

  return {
    sessionMeta,
    loadingMeta,
    errorMeta
  };
} 