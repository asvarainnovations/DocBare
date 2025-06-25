import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '@/lib/mongo';
import { Feedback } from '@/lib/mongoSchemas';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const { sessionId, userId, rating, comments } = await req.json();
  if (!sessionId || !userId || !rating) {
    return NextResponse.json({ error: 'Missing sessionId, userId, or rating' }, { status: 400 });
  }
  const db = await getMongo();
  const feedback: Feedback = {
    sessionId: new ObjectId(sessionId),
    userId,
    rating,
    comments,
    createdAt: new Date(),
  };
  await db.collection('feedback').insertOne(feedback);
  return NextResponse.json({ status: 'ok' });
}
