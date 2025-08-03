import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export interface MemoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  type: 'conversation' | 'reasoning' | 'decision' | 'context' | 'insight';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

export interface UseMemoryOptions {
  sessionId?: string;
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMemory(options: UseMemoryOptions = {}) {
  const { sessionId, userId, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async (
    context?: string,
    limit?: number,
    types?: MemoryEntry['type'][]
  ) => {
    if (!sessionId || !userId) {
      setError('Session ID and User ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sessionId,
        userId,
        ...(context && { context }),
        ...(limit && { limit: limit.toString() }),
        ...(types && types.length > 0 && { types: types.join(',') }),
      });

      const response = await axios.get(`/api/memory?${params}`);
      
      if (response.data.success) {
        setMemories(response.data.memories);
      } else {
        setError('Failed to fetch memories');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch memories';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId]);

  const storeMemory = useCallback(async (
    type: MemoryEntry['type'],
    content: string,
    metadata?: Record<string, any>
  ) => {
    if (!sessionId || !userId) {
      setError('Session ID and User ID are required');
      return false;
    }

    try {
      const response = await axios.post('/api/memory', {
        sessionId,
        userId,
        type,
        content,
        metadata,
      });

      if (response.data.success) {
        // Add the new memory to the local state
        const newMemory: MemoryEntry = {
          id: response.data.memoryId,
          sessionId,
          userId,
          type,
          content,
          metadata,
          createdAt: new Date(),
          accessedAt: new Date(),
          accessCount: 1,
        };

        setMemories(prev => [newMemory, ...prev]);
        return true;
      } else {
        setError('Failed to store memory');
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to store memory';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [sessionId, userId]);

  const storeConversationMemory = useCallback(async (
    role: 'user' | 'assistant',
    content: string
  ) => {
    return storeMemory('conversation', `[${role.toUpperCase()}]: ${content}`, {
      role,
      source: 'chat',
      relevance: 1.0,
    });
  }, [storeMemory]);

  const storeReasoningMemory = useCallback(async (
    reasoning: string,
    metadata?: Record<string, any>
  ) => {
    return storeMemory('reasoning', reasoning, {
      source: 'ai_reasoning',
      confidence: metadata?.confidence || 0.8,
      ...metadata,
    });
  }, [storeMemory]);

  const storeDecisionMemory = useCallback(async (
    decision: string,
    metadata?: Record<string, any>
  ) => {
    return storeMemory('decision', decision, {
      source: 'ai_decision',
      confidence: metadata?.confidence || 0.9,
      ...metadata,
    });
  }, [storeMemory]);

  const getConversationHistory = useCallback(async (limit: number = 20) => {
    return fetchMemories('', limit, ['conversation']);
  }, [fetchMemories]);

  const getReasoningChain = useCallback(async (limit: number = 10) => {
    return fetchMemories('', limit, ['reasoning']);
  }, [fetchMemories]);

  const getRelevantContext = useCallback(async (query: string, limit: number = 5) => {
    return fetchMemories(query, limit, ['context']);
  }, [fetchMemories]);

  const cleanupOldMemories = useCallback(async (daysOld: number = 30) => {
    if (!sessionId) {
      setError('Session ID is required');
      return false;
    }

    try {
      const params = new URLSearchParams({
        sessionId,
        daysOld: daysOld.toString(),
      });

      const response = await axios.delete(`/api/memory?${params}`);
      
      if (response.data.success) {
        toast.success(`Cleaned up ${response.data.deletedCount} old memories`);
        return true;
      } else {
        setError('Failed to cleanup memories');
        return false;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to cleanup memories';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [sessionId]);

  return {
    memories,
    loading,
    error,
    fetchMemories,
    storeMemory,
    storeConversationMemory,
    storeReasoningMemory,
    storeDecisionMemory,
    getConversationHistory,
    getReasoningChain,
    getRelevantContext,
    cleanupOldMemories,
  };
} 