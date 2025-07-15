import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const snapshot = await firestore.collection('feedback')
    .where('sessionId', '==', sessionId)
    .get();
  const feedback = snapshot.docs.map((doc: any) => doc.data());
  return NextResponse.json({ feedback });
} 