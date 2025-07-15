import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { sessionId, userId, role, content } = await req.json();
  if (!session || session.user?.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!sessionId || !userId || !role || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const message = {
    sessionId,
    userId,
    role,
    content,
    createdAt: new Date(),
  };
  await firestore.collection('chat_messages').add(message);
  return NextResponse.json({ message });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
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