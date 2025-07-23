import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const snapshot = await firestore.collection('chat_messages')
    .where('sessionId', '==', sessionId)
    .orderBy('createdAt', 'asc')
    .get();
  const messages = snapshot.docs.map((doc: any) => doc.data());
  return NextResponse.json({ messages });
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