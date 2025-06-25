import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '@/lib/mongo';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const db = await getMongo();
  const feedback = await db.collection('feedback').find({ sessionId: new ObjectId(sessionId) }).toArray();
  return NextResponse.json({ feedback });
} 