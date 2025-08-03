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
        .orderBy('accessedAt', 'desc')
        .limit(limit);

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

      // Update access count and timestamp for retrieved memories
      await this.updateMemoryAccess(memories.map(m => m.id));

      aiLogger.info('Memories retrieved', { 
        sessionId, 
        count: memories.length,
        types: types || 'all'
      });

      return memories;
    } catch (error) {
      aiLogger.error('Failed to retrieve memories', { error, sessionId, userId });
      return [];
    }
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(sessionId: string, limit: number = 20): Promise<MemoryEntry[]> {
    return this.retrieveMemories(sessionId, '', '', limit, ['conversation']);
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
   * Generate memory-enhanced context for AI
   */
  async generateMemoryContext(sessionId: string, userId: string, currentQuery: string): Promise<string> {
    try {
      const [conversationHistory, reasoningChain, relevantContext] = await Promise.all([
        this.getConversationHistory(sessionId, 5),
        this.getReasoningChain(sessionId, 3),
        this.getRelevantContext(sessionId, currentQuery, 3)
      ]);

      let context = '';

      // Add conversation history
      if (conversationHistory.length > 0) {
        context += '\n\n## Previous Conversation:\n';
        conversationHistory.forEach(memory => {
          context += `- ${memory.content}\n`;
        });
      }

      // Add reasoning chain
      if (reasoningChain.length > 0) {
        context += '\n\n## Previous Reasoning:\n';
        reasoningChain.forEach(memory => {
          context += `- ${memory.content}\n`;
        });
      }

      // Add relevant context
      if (relevantContext.length > 0) {
        context += '\n\n## Relevant Context:\n';
        relevantContext.forEach(memory => {
          context += `- ${memory.content}\n`;
        });
      }

      aiLogger.info('Memory context generated', { 
        sessionId, 
        contextLength: context.length,
        conversationCount: conversationHistory.length,
        reasoningCount: reasoningChain.length,
        contextCount: relevantContext.length
      });

      return context;
    } catch (error) {
      aiLogger.error('Failed to generate memory context', { error, sessionId, userId });
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