import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function POST(req: NextRequest) {
  const { sessionId, userId, rating, comments } = await req.json();
  if (!sessionId || !userId || !rating) {
    return NextResponse.json({ error: 'Missing sessionId, userId, or rating' }, { status: 400 });
  }
  // Sanitize feedback data
  const feedback = {
    sessionId,
    userId,
    rating,
    comments: typeof comments === 'string' ? comments : '',
    createdAt: new Date(),
  };
  await firestore.collection('feedback').add(feedback);
  return NextResponse.json({ status: 'ok' });
}
