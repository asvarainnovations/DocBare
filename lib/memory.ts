import { prisma } from './prisma';
import firestore from './firestore';
import { FieldValue } from '@google-cloud/firestore';
import { aiLogger } from './logger';

export interface MemoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  type: 'conversation' | 'reasoning' | 'decision' | 'context' | 'insight';
  content: string;
  metadata?: {
    source?: string;
    confidence?: number;
    relevance?: number;
    tags?: string[];
    [key: string]: any;
  };
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

export interface AgentMemory {
  sessionId: string;
  userId: string;
  conversationHistory: MemoryEntry[];
  reasoningChain: MemoryEntry[];
  decisions: MemoryEntry[];
  context: MemoryEntry[];
  insights: MemoryEntry[];
  lastUpdated: Date;
}

export class MemoryManager {
  private static instance: MemoryManager;
  
  private constructor() {}
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Store a new memory entry
   */
  async storeMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'accessedAt' | 'accessCount'>): Promise<string> {
    try {
      const memoryEntry: Omit<MemoryEntry, 'id'> = {
        ...entry,
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1
      };

      // Store in Firestore for real-time access
      const docRef = await firestore.collection('agent_memory').add(memoryEntry);
      
      // Also store in Prisma for analytics and backup (when available)
      try {
        await prisma.agentMemory.create({
          data: {
            id: docRef.id,
            sessionId: entry.sessionId,
            userId: entry.userId,
            type: entry.type,
            content: entry.content,
            metadata: entry.metadata || {},
            createdAt: memoryEntry.createdAt,
            accessedAt: memoryEntry.accessedAt,
            accessCount: memoryEntry.accessCount
          }
        });
      } catch (prismaError) {
        // If Prisma model doesn't exist yet, continue with Firestore only
        aiLogger.warn('Prisma AgentMemory model not available, using Firestore only', { error: prismaError });
      }

      aiLogger.info('Memory stored successfully', { 
        sessionId: entry.sessionId, 
        type: entry.type,
        contentLength: entry.content.length 
      });

      return docRef.id;
    } catch (error) {
      aiLogger.error('Failed to store memory', { error, entry });
      throw error;
    }
  }

  /**
   * Retrieve relevant memories for a given context
   */
  async retrieveMemories(
    sessionId: string, 
    userId: string, 
    context: string, 
    limit: number = 10,
    types?: MemoryEntry['type'][]
  ): Promise<MemoryEntry[]> {
    try {
      let query = firestore.collection('agent_memory')
        .where('sessionId', '==', sessionId)
        .where('userId', '==', userId)
        .limit(limit * 2); // Get more to account for sorting

      if (types && types.length > 0) {
        query = query.where('type', 'in', types);
      }

      const snapshot = await query.get();
      const memories: MemoryEntry[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        memories.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          accessedAt: data.accessedAt.toDate()
        } as MemoryEntry);
      });

      // Sort in memory by accessedAt descending (most recently accessed first)
      memories.sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime());

      // Take only the requested limit
      const limitedMemories = memories.slice(0, limit);

      // Update access count and timestamp for retrieved memories
      await this.updateMemoryAccess(limitedMemories.map(m => m.id));

      return limitedMemories;
    } catch (error) {
      aiLogger.error('Failed to retrieve memories', { sessionId, userId, error });
      return [];
    }
  }

  /**
   * Retrieve user-level memories across all sessions
   */
  async retrieveUserMemories(
    userId: string,
    context: string,
    limit: number = 15,
    types?: MemoryEntry['type'][],
    excludeSessionId?: string
  ): Promise<MemoryEntry[]> {
    try {
      let query = firestore.collection('agent_memory')
        .where('userId', '==', userId)
        .orderBy('accessedAt', 'desc')
        .limit(limit * 2); // Get more to filter by relevance

      if (types && types.length > 0) {
        query = query.where('type', 'in', types);
      }

      const snapshot = await query.get();
      let memories: MemoryEntry[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // Exclude current session if specified
        if (excludeSessionId && data.sessionId === excludeSessionId) {
          return;
        }
        
        memories.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          accessedAt: data.accessedAt.toDate()
        } as MemoryEntry);
      });

      // Filter by relevance to current context
      if (context.trim()) {
        memories = this.filterByRelevance(memories, context, limit);
      } else {
        memories = memories.slice(0, limit);
      }

      // Update access count and timestamp for retrieved memories
      if (memories.length > 0) {
        await this.updateMemoryAccess(memories.map(m => m.id));
      }

      return memories;
    } catch (error) {
      return [];
    }
  }

  /**
   * Filter memories by relevance to current context
   */
  private filterByRelevance(memories: MemoryEntry[], context: string, limit: number): MemoryEntry[] {
    const contextWords = context.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    return memories
      .map(memory => {
        const contentWords = memory.content.toLowerCase().split(/\s+/);
        const relevanceScore = contextWords.reduce((score, contextWord) => {
          const matches = contentWords.filter(word => word.includes(contextWord) || contextWord.includes(word));
          return score + matches.length;
        }, 0);
        
        return { ...memory, relevanceScore };
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit)
      .map(({ relevanceScore, ...memory }) => memory);
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(sessionId: string, limit: number = 20): Promise<MemoryEntry[]> {
    // Query without orderBy to avoid Firestore index requirements
    // We'll sort in memory instead
    try {
      let query = firestore.collection('agent_memory')
        .where('sessionId', '==', sessionId)
        .where('type', '==', 'conversation')
        .limit(limit * 2); // Get more to account for potential duplicates

      const snapshot = await query.get();
      const memories: MemoryEntry[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        memories.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          accessedAt: data.accessedAt.toDate()
        } as MemoryEntry);
      });

      // Sort in memory by createdAt descending (newest first)
      memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Take only the requested limit
      const limitedMemories = memories.slice(0, limit);

      // Update access count and timestamp for retrieved memories
      await this.updateMemoryAccess(limitedMemories.map(m => m.id));

      if (process.env.NODE_ENV === 'development') {
        aiLogger.info('🟦 [memory][DEBUG] Retrieved conversation memories', {
          sessionId,
          totalFound: memories.length,
          limitedTo: limitedMemories.length,
          memories: limitedMemories.map(m => ({
            id: m.id,
            role: m.metadata?.role,
            content: m.content.substring(0, 50) + '...',
            createdAt: m.createdAt
          }))
        });
      }

      return limitedMemories;
    } catch (error) {
      aiLogger.error('Failed to get conversation history', { sessionId, error });
      return [];
    }
  }

  /**
   * Get reasoning chain for the session
   */
  async getReasoningChain(sessionId: string, limit: number = 10): Promise<MemoryEntry[]> {
    return this.retrieveMemories(sessionId, '', '', limit, ['reasoning']);
  }

  /**
   * Get relevant context for current query
   */
  async getRelevantContext(sessionId: string, query: string, limit: number = 5): Promise<MemoryEntry[]> {
    // For now, return recent context memories
    // TODO: Implement semantic search for better relevance
    return this.retrieveMemories(sessionId, '', query, limit, ['context']);
  }

  /**
   * Get user-level conversation history across all sessions
   */
  async getUserConversationHistory(userId: string, context: string, limit: number = 10): Promise<MemoryEntry[]> {
    return this.retrieveUserMemories(userId, context, limit, ['conversation']);
  }

  /**
   * Get user-level reasoning chain across all sessions
   */
  async getUserReasoningChain(userId: string, context: string, limit: number = 5): Promise<MemoryEntry[]> {
    return this.retrieveUserMemories(userId, context, limit, ['reasoning']);
  }

  /**
   * Update memory access statistics
   */
  private async updateMemoryAccess(memoryIds: string[]): Promise<void> {
    try {
      const batch = firestore.batch();
      
      memoryIds.forEach(id => {
        const ref = firestore.collection('agent_memory').doc(id);
        batch.update(ref, {
          accessedAt: new Date(),
          accessCount: FieldValue.increment(1)
        });
      });

      await batch.commit();
    } catch (error) {
      aiLogger.error('Failed to update memory access', { error, memoryIds });
    }
  }

  /**
   * Get conversation history in DeepSeek API message format
   */
  async getConversationHistoryForAPI(sessionId: string, limit: number = 10): Promise<Array<{role: 'user' | 'assistant', content: string}>> {
    try {
      const memories = await this.getConversationHistory(sessionId, limit);
      
      if (process.env.NODE_ENV === 'development') {
        aiLogger.info('🟦 [memory][DEBUG] Retrieved conversation memories', {
          sessionId,
          memoryCount: memories.length,
          memories: memories.map(m => ({
            id: m.id,
            content: m.content.substring(0, 100) + '...',
            metadata: m.metadata
          }))
        });
      }
      
      // Convert memories to API message format
      const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      for (const memory of memories) {
        // Get role from metadata (stored when saving conversation memory)
        const role = memory.metadata?.role || 'assistant';
        // Extract content without the [ROLE]: prefix
        const content = memory.content.replace(/^\[(USER|ASSISTANT)\]:\s*/, '');
        messages.push({
          role: role as 'user' | 'assistant',
          content: content
        });
      }
      
      if (process.env.NODE_ENV === 'development') {
        aiLogger.info('🟦 [memory][DEBUG] Converted to API format', {
          sessionId,
          messageCount: messages.length,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content.substring(0, 50) + '...'
          }))
        });
      }
      
      return messages;
    } catch (error) {
      aiLogger.error('Failed to get conversation history for API', error);
      return [];
    }
  }

  /**
   * Generate memory-enhanced context for AI (Enhanced with user-level memories)
   */
  async generateMemoryContext(sessionId: string, userId: string, currentQuery: string): Promise<string> {
    try {
      // Get session-specific memories
      const [sessionConversationHistory, sessionReasoningChain, sessionRelevantContext] = await Promise.all([
        this.getConversationHistory(sessionId, 5),
        this.getReasoningChain(sessionId, 3),
        this.getRelevantContext(sessionId, currentQuery, 3)
      ]);

      // Get user-level memories from other sessions
      const [userConversationHistory, userReasoningChain] = await Promise.all([
        this.getUserConversationHistory(userId, currentQuery, 5),
        this.getUserReasoningChain(userId, currentQuery, 3)
      ]);

      let context = '';

      // Add current session conversation history
      if (sessionConversationHistory.length > 0) {
        context += '\n\n## Current Session Conversation:\n';
        sessionConversationHistory.forEach(memory => {
          context += `- ${memory.content}\n`;
        });
      }

      // Add current session reasoning chain
      if (sessionReasoningChain.length > 0) {
        context += '\n\n## Current Session Reasoning:\n';
        sessionReasoningChain.forEach(memory => {
          context += `- ${memory.content}\n`;
        });
      }

      // Add current session relevant context
      if (sessionRelevantContext.length > 0) {
        context += '\n\n## Current Session Context:\n';
        sessionRelevantContext.forEach(memory => {
          context += `- ${memory.content}\n`;
        });
      }

      // Add user-level conversation history from other sessions
      if (userConversationHistory.length > 0) {
        context += '\n\n## Previous Conversations (Other Sessions):\n';
        userConversationHistory.forEach(memory => {
          context += `- [Session: ${memory.sessionId.substring(0, 8)}...] ${memory.content}\n`;
        });
      }

      // Add user-level reasoning from other sessions
      if (userReasoningChain.length > 0) {
        context += '\n\n## Previous Reasoning (Other Sessions):\n';
        userReasoningChain.forEach(memory => {
          context += `- [Session: ${memory.sessionId.substring(0, 8)}...] ${memory.content}\n`;
        });
      }

      aiLogger.info('Enhanced memory context generated', { 
        sessionId, 
        contextLength: context.length,
        sessionConversationCount: sessionConversationHistory.length,
        sessionReasoningCount: sessionReasoningChain.length,
        sessionContextCount: sessionRelevantContext.length,
        userConversationCount: userConversationHistory.length,
        userReasoningCount: userReasoningChain.length
      });

      return context;
    } catch (error) {
      aiLogger.error('Failed to generate enhanced memory context', { error, sessionId, userId });
      return '';
    }
  }

  /**
   * Store conversation memory
   */
  async storeConversationMemory(
    sessionId: string, 
    userId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<string> {
    return this.storeMemory({
      sessionId,
      userId,
      type: 'conversation',
      content: `[${role.toUpperCase()}]: ${content}`,
      metadata: {
        role,
        source: 'chat',
        relevance: 1.0
      }
    });
  }

  /**
   * Store reasoning memory
   */
  async storeReasoningMemory(
    sessionId: string, 
    userId: string, 
    reasoning: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.storeMemory({
      sessionId,
      userId,
      type: 'reasoning',
      content: reasoning,
      metadata: {
        source: 'ai_reasoning',
        confidence: metadata?.confidence || 0.8,
        ...metadata
      }
    });
  }

  /**
   * Store decision memory
   */
  async storeDecisionMemory(
    sessionId: string, 
    userId: string, 
    decision: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.storeMemory({
      sessionId,
      userId,
      type: 'decision',
      content: decision,
      metadata: {
        source: 'ai_decision',
        confidence: metadata?.confidence || 0.9,
        ...metadata
      }
    });
  }

  /**
   * Clean up old memories (optional)
   */
  async cleanupOldMemories(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const snapshot = await firestore.collection('agent_memory')
        .where('createdAt', '<', cutoffDate)
        .get();

      const batch = firestore.batch();
      let count = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      aiLogger.info('Old memories cleaned up', { count, daysOld });
      return count;
    } catch (error) {
      aiLogger.error('Failed to cleanup old memories', { error });
      return 0;
    }
  }
}

export const memoryManager = MemoryManager.getInstance(); 