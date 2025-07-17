import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  const snapshot = await firestore.collection('chat_sessions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  const chats = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ chats });
} 