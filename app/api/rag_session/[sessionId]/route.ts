import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '@/lib/mongo';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const db = await getMongo();
  const session = await db.collection('rag_sessions').findOne({ _id: new ObjectId(sessionId) });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({ session });
} 