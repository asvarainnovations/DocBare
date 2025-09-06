import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import { apiLogger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const loadMore = searchParams.get('loadMore') === 'true';

    apiLogger.info('Session messages request received', { 
      sessionId: params.sessionId,
      limit,
      offset,
      loadMore
    });

    // Try to get messages from Firestore first (primary storage)
    try {
      // Get all messages for the session (no ordering to avoid index requirement)
      let query = firestore.collection('chat_messages')
        .where('sessionId', '==', params.sessionId);

      // Apply limit
      query = query.limit(loadMore ? limit + offset : limit);

      const snapshot = await query.get();
      
      const messages = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        documents: doc.data().documents || null, // Include document information
      }));

      // Get session metadata to add document context to old messages
      let sessionDocumentContext: any[] = [];
      try {
        const sessionDoc = await firestore.collection('chat_sessions').doc(params.sessionId).get();
        if (sessionDoc.exists) {
          const sessionData = sessionDoc.data();
          sessionDocumentContext = sessionData?.documentContext || [];
        }
      } catch (sessionError) {
        console.log('🟦 [sessions][DEBUG] Could not retrieve session metadata for document context');
      }

      // Add document context to old messages that don't have it
      messages.forEach((msg) => {
        if (msg.role === 'USER' && (!msg.documents || msg.documents.length === 0) && sessionDocumentContext.length > 0) {
          msg.documents = sessionDocumentContext;
          console.log(`🟦 [sessions][DEBUG] Added document context to old message:`, {
            messageId: msg.id,
            documents: msg.documents
          });
        }
      });

      // Debug logging for each message
      messages.forEach((msg, idx) => {
        console.log(`🟦 [sessions][DEBUG] Message ${idx}:`, {
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 50),
          documents: msg.documents,
          createdAt: msg.createdAt,
          timestamp: msg.createdAt?.toDate?.() ? msg.createdAt.toDate().getTime() : new Date(msg.createdAt).getTime()
        });
      });

      // Sort in memory to avoid index requirements
      // Since we're getting messages in descending order, reverse to get chronological order
      messages.sort((a, b) => {
        // Handle Firestore timestamps properly
        const aTime = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        
        // console.log(`🟦 [sessions][DEBUG] Sorting messages:`, {
        //   aId: a.id,
        //   aRole: a.role,
        //   aTime: aTime,
        //   aCreatedAt: a.createdAt,
        //   bId: b.id,
        //   bRole: b.role,
        //   bTime: bTime,
        //   bCreatedAt: b.createdAt,
        //   diff: aTime - bTime,
        //   sortOrder: aTime - bTime < 0 ? 'a before b' : 'b before a'
        // });
        
        return aTime - bTime; // Ascending order (oldest first)
      });

      // Check if there are more messages
      const hasMore = messages.length === limit;
      const totalMessages = messages.length + offset;

      apiLogger.info('Session messages retrieved from Firestore', { 
        sessionId: params.sessionId,
        messageCount: messages.length,
        hasMore,
        totalMessages
      });

      return NextResponse.json({
        sessionId: params.sessionId,
        messages,
        pagination: {
          hasMore,
          totalMessages,
          limit,
          offset
        }
      });
    } catch (firestoreError) {
      apiLogger.warn('Firestore fetch failed, trying Prisma', { 
        sessionId: params.sessionId, 
        error: firestoreError 
      });

      // Fallback to Prisma if Firestore fails
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: params.sessionId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      });

      apiLogger.info('Session messages retrieved from Prisma', { 
        sessionId: params.sessionId,
        messageCount: messages.length 
      });

      return NextResponse.json({
        sessionId: params.sessionId,
        messages,
      });
    }
  } catch (error) {
    apiLogger.error('Error fetching session messages', error);
    return NextResponse.json(
      { error: 'Failed to fetch session messages' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  try {
    // Delete all chat messages in Firestore
    const messagesSnap = await firestore.collection('chat_messages').where('sessionId', '==', sessionId).get();
    const batch = firestore.batch();
    messagesSnap.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
    // Delete chat session in Firestore
    await firestore.collection('chat_sessions').doc(sessionId).delete();
    // Delete all chat messages in Postgres (if any)
    try {
      await prisma.chatMessage.deleteMany({ where: { sessionId } });
      await prisma.chatSession.delete({ where: { id: sessionId } });
    } catch (err) {
      // Ignore if not found or not supported
    }
    return NextResponse.json({ status: 'deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
} 