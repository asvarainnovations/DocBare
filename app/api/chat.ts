import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '@/lib/mongo';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { sessionId, userId, role, content } = await req.json();
  if (!session || session.user?.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!sessionId || !userId || !role || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const db = await getMongo();
  const col = db.collection('chats');
  const message = {
    sessionId,
    userId,
    role,
    content,
    createdAt: new Date(),
  };
  await col.insertOne(message);
  return NextResponse.json({ message });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const db = await getMongo();
  const col = db.collection('chats');
  const messages = await col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  return NextResponse.json({ messages });
} 