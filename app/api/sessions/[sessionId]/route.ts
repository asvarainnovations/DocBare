import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '@/lib/mongo';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const db = await getMongo();
  const col = db.collection('chats');
  const messages = await col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  return NextResponse.json({ messages });
} 