import { NextRequest, NextResponse } from 'next/server';
import { memoryManager } from '@/lib/memory';
import { aiLogger } from '@/lib/logger';
import { z } from 'zod';

const StoreMemorySchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  type: z.enum(['conversation', 'reasoning', 'decision', 'context', 'insight']),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
});

const RetrieveMemorySchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  context: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
  types: z.array(z.enum(['conversation', 'reasoning', 'decision', 'context', 'insight'])).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = StoreMemorySchema.safeParse(body);
    
    if (!validation.success) {
      aiLogger.error('Memory store validation failed', { errors: validation.error.errors });
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { sessionId, userId, type, content, metadata } = validation.data;
    
    aiLogger.info('Storing memory', { sessionId, userId, type, contentLength: content.length });
    
    const memoryId = await memoryManager.storeMemory({
      sessionId,
      userId,
      type,
      content,
      metadata,
    });

    return NextResponse.json({ 
      success: true, 
      memoryId,
      message: 'Memory stored successfully' 
    });
  } catch (error: any) {
    aiLogger.error('Failed to store memory', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to store memory' }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const context = searchParams.get('context') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const types = searchParams.get('types')?.split(',') as any;

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'sessionId and userId are required' }, { status: 400 });
    }

    const validation = RetrieveMemorySchema.safeParse({
      sessionId,
      userId,
      context,
      limit,
      types,
    });

    if (!validation.success) {
      aiLogger.error('Memory retrieve validation failed', { errors: validation.error.errors });
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    const { sessionId: validatedSessionId, userId: validatedUserId, context: validatedContext, limit: validatedLimit, types: validatedTypes } = validation.data;

    aiLogger.info('Retrieving memories', { 
      sessionId: validatedSessionId, 
      userId: validatedUserId,
      limit: validatedLimit,
      types: validatedTypes 
    });

    const memories = await memoryManager.retrieveMemories(
      validatedSessionId,
      validatedUserId,
      validatedContext || '', // Ensure context is never undefined
      validatedLimit,
      validatedTypes
    );

    return NextResponse.json({ 
      success: true, 
      memories,
      count: memories.length 
    });
  } catch (error: any) {
    aiLogger.error('Failed to retrieve memories', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to retrieve memories' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const daysOld = parseInt(searchParams.get('daysOld') || '30');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    aiLogger.info('Cleaning up old memories', { sessionId, daysOld });

    const count = await memoryManager.cleanupOldMemories(daysOld);

    return NextResponse.json({ 
      success: true, 
      deletedCount: count,
      message: `Cleaned up ${count} old memories` 
    });
  } catch (error: any) {
    aiLogger.error('Failed to cleanup memories', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to cleanup memories' }, 
      { status: 500 }
    );
  }
}