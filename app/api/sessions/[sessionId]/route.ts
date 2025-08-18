import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import { apiLogger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    apiLogger.info('Session messages request received', { sessionId: params.sessionId });

    // Try to get messages from Firestore first (primary storage)
    try {
      const snapshot = await firestore.collection('chat_messages')
        .where('sessionId', '==', params.sessionId)
        .get();
      
      const messages = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        documents: doc.data().documents || null, // Include document information
      }));

      // Debug logging for each message
      messages.forEach((msg, idx) => {
        console.log(`🟦 [sessions][DEBUG] Message ${idx}:`, {
          id: msg.id,
          role: msg.role,
          content: msg.content.substring(0, 50),
          documents: msg.documents,
          createdAt: msg.createdAt
        });
      });

      // Sort in memory to avoid index requirements
      messages.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        
        // Debug logging for sorting
        if (Math.abs(aTime - bTime) < 1000) { // If messages are within 1 second
          console.log(`🟦 [sessions][DEBUG] Messages with similar timestamps:`, {
            aId: a.id,
            aRole: a.role,
            aTime: aTime,
            aCreatedAt: a.createdAt,
            bId: b.id,
            bRole: b.role,
            bTime: bTime,
            bCreatedAt: b.createdAt,
            diff: aTime - bTime
          });
        }
        
        return aTime - bTime;
      });

      apiLogger.info('Session messages retrieved from Firestore', { 
        sessionId: params.sessionId,
        messageCount: messages.length 
      });

      return NextResponse.json({
        sessionId: params.sessionId,
        messages,
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