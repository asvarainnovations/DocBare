import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function POST(req: NextRequest) {
  const { userId, sessionName, documentIds } = await req.json();
  if (!userId || !documentIds) {
    return NextResponse.json({ error: 'Missing userId or documentIds' }, { status: 400 });
  }
  const session = {
    userId,
    sessionName,
    createdAt: new Date(),
    lastAccessed: new Date(),
    documentIds,
    memory: [],
    agentState: {},
    status: 'running',
    result: {},
  };
  const result = await firestore.collection('rag_sessions').add(session);
  return NextResponse.json({ sessionId: result.id });
}

export async function PATCH(req: NextRequest) {
  const { sessionId, memory, agentState, status, result } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const update: any = { lastAccessed: new Date() };
  if (memory) update.memory = memory;
  if (agentState) update.agentState = agentState;
  if (status) update.status = status;
  if (result) update.result = result;
  await firestore.collection('rag_sessions').doc(sessionId).update(update);
  return NextResponse.json({ status: 'updated' });
} 