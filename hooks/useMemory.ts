import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface MemoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  type: 'conversation' | 'reasoning' | 'decision' | 'context' | 'insight';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
  accessedAt: string;
  accessCount: number;
}

interface UseMemoryReturn {
  memories: MemoryEntry[];
  loading: boolean;
  error: string | null;
  fetchMemories: (sessionId: string, userId: string, context?: string, limit?: number, types?: string[]) => Promise<void>;
  fetchUserMemories: (userId: string, context?: string, limit?: number, types?: string[], excludeSessionId?: string) => Promise<void>;
  storeMemory: (sessionId: string, userId: string, type: string, content: string, metadata?: Record<string, any>) => Promise<string | null>;
  storeConversationMemory: (sessionId: string, userId: string, role: 'user' | 'assistant', content: string) => Promise<string | null>;
  storeReasoningMemory: (sessionId: string, userId: string, reasoning: string, metadata?: Record<string, any>) => Promise<string | null>;
  storeDecisionMemory: (sessionId: string, userId: string, decision: string, metadata?: Record<string, any>) => Promise<string | null>;
  cleanupOldMemories: (daysOld?: number) => Promise<number | null>;
}

export function useMemory(): UseMemoryReturn {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async (
    sessionId: string, 
    userId: string, 
    context: string = '', 
    limit: number = 10, 
    types?: string[]
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        sessionId,
        userId,
        context,
        limit: limit.toString(),
        ...(types && types.length > 0 && { types: types.join(',') })
      });

      const response = await axios.get(`/api/memory?${params}`);
      
      if (response.data.success) {
        setMemories(response.data.memories);
        toast.success(`Retrieved ${response.data.count} memories`);
      } else {
        throw new Error(response.data.error || 'Failed to fetch memories');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch memories';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserMemories = useCallback(async (
    userId: string, 
    context: string = '', 
    limit: number = 15, 
    types?: string[],
    excludeSessionId?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        userId,
        context,
        limit: limit.toString(),
        userLevel: 'true',
        ...(types && types.length > 0 && { types: types.join(',') }),
        ...(excludeSessionId && { excludeSessionId })
      });

      const response = await axios.get(`/api/memory?${params}`);
      
      if (response.data.success) {
        setMemories(response.data.memories);
        toast.success(`Retrieved ${response.data.count} user-level memories`);
      } else {
        throw new Error(response.data.error || 'Failed to fetch user memories');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch user memories';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const storeMemory = useCallback(async (
    sessionId: string, 
    userId: string, 
    type: string, 
    content: string, 
    metadata?: Record<string, any>
  ): Promise<string | null> => {
    try {
      const response = await axios.post('/api/memory', {
        sessionId,
        userId,
        type,
        content,
        metadata
      });

      if (response.data.success) {
        toast.success('Memory stored successfully');
        return response.data.memoryId;
      } else {
        throw new Error(response.data.error || 'Failed to store memory');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to store memory';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const storeConversationMemory = useCallback(async (
    sessionId: string, 
    userId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<string | null> => {
    return storeMemory(sessionId, userId, 'conversation', `[${role.toUpperCase()}]: ${content}`, {
      role,
      source: 'chat',
      relevance: 1.0
    });
  }, [storeMemory]);

  const storeReasoningMemory = useCallback(async (
    sessionId: string, 
    userId: string, 
    reasoning: string, 
    metadata?: Record<string, any>
  ): Promise<string | null> => {
    return storeMemory(sessionId, userId, 'reasoning', reasoning, {
      source: 'ai_reasoning',
      confidence: metadata?.confidence || 0.8,
      ...metadata
    });
  }, [storeMemory]);

  const storeDecisionMemory = useCallback(async (
    sessionId: string, 
    userId: string, 
    decision: string, 
    metadata?: Record<string, any>
  ): Promise<string | null> => {
    return storeMemory(sessionId, userId, 'decision', decision, {
      source: 'ai_decision',
      confidence: metadata?.confidence || 0.9,
      ...metadata
    });
  }, [storeMemory]);

  const cleanupOldMemories = useCallback(async (daysOld: number = 30): Promise<number | null> => {
    try {
      const response = await axios.delete(`/api/memory?daysOld=${daysOld}`);
      
      if (response.data.success) {
        toast.success(response.data.message);
        return response.data.count;
      } else {
        throw new Error(response.data.error || 'Failed to cleanup memories');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to cleanup memories';
      toast.error(errorMessage);
      return null;
    }
  }, []);

  return {
    memories,
    loading,
    error,
    fetchMemories,
    fetchUserMemories,
    storeMemory,
    storeConversationMemory,
    storeReasoningMemory,
    storeDecisionMemory,
    cleanupOldMemories
  };
} 