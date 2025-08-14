import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';
import { prisma } from '@/lib/prisma';
import { apiLogger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      apiLogger.warn('Missing userId in user_chats request');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    apiLogger.info('User chats request received', { userId });

    // Try to get chats from Firestore first (primary source)
    let firestoreChats: any[] = [];
    try {
      // Use a simpler query that doesn't require complex indexes
      const firestoreSnapshot = await firestore.collection('chat_sessions')
        .where('userId', '==', userId)
        .get();
      
      firestoreChats = firestoreSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().lastAccessed?.toDate?.() || doc.data().lastAccessed || doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));

      // Sort in memory to avoid index requirements
      firestoreChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      apiLogger.info('Chats retrieved from Firestore', { 
        userId, 
        chatCount: firestoreChats.length 
      });
    } catch (firestoreError) {
      apiLogger.warn('Firestore fetch failed (likely missing index), trying Prisma', { 
        userId, 
        error: firestoreError 
      });
    }

    // If Firestore has data, return it
    if (firestoreChats.length > 0) {
      return NextResponse.json({ 
        chats: firestoreChats,
        source: 'firestore'
      });
    }

    // Fallback to Prisma if Firestore is empty or fails
    try {
      const prismaChats = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true
            }
          }
        }
      });

      const formattedChats = prismaChats.map(chat => ({
        id: chat.id,
        sessionName: `Chat ${chat.id.slice(0, 8)}`, // Fallback name
        createdAt: chat.createdAt,
        updatedAt: chat.createdAt, // Use createdAt as updatedAt for Prisma
        messageCount: chat.messages.length,
        source: 'prisma'
      }));

      apiLogger.info('Chats retrieved from Prisma', { 
        userId, 
        chatCount: formattedChats.length 
      });

      return NextResponse.json({ 
        chats: formattedChats,
        source: 'prisma'
      });
    } catch (prismaError) {
      apiLogger.error('Both Firestore and Prisma failed', { 
        userId, 
        firestoreError: firestoreChats.length === 0 ? 'No data' : 'Error',
        prismaError 
      });
      
      return NextResponse.json({ 
        chats: [],
        source: 'none',
        error: 'Failed to retrieve chats'
      });
    }
  } catch (error) {
    apiLogger.error('Error in user_chats endpoint', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 