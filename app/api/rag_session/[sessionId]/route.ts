import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const docSnap = await firestore.collection('rag_sessions').doc(sessionId).get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({ session: docSnap.data() });
} 