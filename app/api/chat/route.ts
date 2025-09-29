import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import { apiLogger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, role, content, reasoningContent, documents } = body;

    apiLogger.info('Chat message received', { 
      sessionId, 
      userId, 
      role,
      contentLength: content?.length 
    });

    // Validate required fields
    if (!sessionId || !userId || !role || !content) {
      apiLogger.warn('Missing required fields', { sessionId, userId, role, hasContent: !!content });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save message to Firestore (primary storage)
    try {
      const messageData = {
        sessionId,
        userId,
        role: role as 'USER' | 'ASSISTANT' | 'SYSTEM',
        content,
        reasoningContent: reasoningContent || null, // Save reasoning content if provided
        documents: documents || null, // Save document information if provided
        createdAt: new Date(),
      };

      const docRef = await firestore.collection('chat_messages').add(messageData);
      
      // Store conversation memory for user messages
      if (role === 'USER' && sessionId && userId) {
        try {
          console.log('🟦 [DEBUG] Starting user message storage:', {
            sessionId,
            userId,
            role,
            content: content.substring(0, 100),
            timestamp: new Date().toISOString()
          });
          
          const { MemoryManager } = await import('@/lib/memory');
          const memoryManager = MemoryManager.getInstance();
          
          console.log('🟦 [DEBUG] MemoryManager imported successfully');
          
          const memoryId = await memoryManager.storeConversationMemory(
            sessionId,
            userId,
            'user',
            content
          );
          
          console.log('🟦 [DEBUG] User message stored successfully:', {
            memoryId,
            sessionId,
            userId,
            content: content.substring(0, 100)
          });
          
          if (process.env.NODE_ENV === 'development') {
            apiLogger.info('🟦 [chat][DEBUG] User message stored as conversation memory', {
              sessionId,
              userId,
              content: content.substring(0, 50) + '...'
            });
          }
          
          // DEBUG: Log the complete storage process
          if (process.env.NODE_ENV === 'development') {
            console.log('🟦 [DEBUG] User message storage completed:', {
              sessionId,
              userId,
              role,
              content: content.substring(0, 100),
              timestamp: new Date().toISOString()
            });
          }
        } catch (memoryError) {
          // Don't fail the request if memory storage fails
          console.error('🟥 [DEBUG] User message storage failed:', {
            error: memoryError,
            sessionId,
            userId,
            role,
            content: content.substring(0, 100)
          });
          
          if (process.env.NODE_ENV === 'development') {
            apiLogger.error('🟥 [chat][ERROR] Failed to store user message as memory', memoryError);
          }
        }
      } else {
        console.log('🟦 [DEBUG] User message storage skipped:', {
          role,
          sessionId,
          userId,
          reason: role !== 'USER' ? 'Not a user message' : !sessionId ? 'No sessionId' : 'No userId'
        });
      }
      
      apiLogger.success('Chat message saved to Firestore', { 
        messageId: docRef.id,
        sessionId, 
        userId 
      });

      return NextResponse.json({
        success: true,
        messageId: docRef.id,
      });
    } catch (firestoreError) {
      apiLogger.warn('Firestore save failed, trying Prisma', { 
        sessionId, 
        userId, 
        error: firestoreError 
      });

      // Fallback to Prisma if Firestore fails
      const message = await prisma.chatMessage.create({
        data: {
          sessionId,
          role: role as 'USER' | 'ASSISTANT' | 'SYSTEM',
          content,
          reasoningContent: reasoningContent || null, // Save reasoning content if provided
        },
      });

      apiLogger.success('Chat message saved to Prisma', { 
        messageId: message.id,
        sessionId, 
        userId 
      });

      return NextResponse.json({
        success: true,
        messageId: message.id,
      });
    }
  } catch (error) {
    apiLogger.error('Error saving chat message', error);
    return NextResponse.json(
      { error: 'Failed to save chat message' },
      { status: 500 }
    );
  }
} 