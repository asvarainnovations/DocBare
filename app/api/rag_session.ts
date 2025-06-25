import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '@/lib/mongo';
import { RagSession } from '@/lib/mongoSchemas';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  const { userId, sessionName, documentIds } = await req.json();
  if (!userId || !documentIds) {
    return NextResponse.json({ error: 'Missing userId or documentIds' }, { status: 400 });
  }
  const db = await getMongo();
  const session: RagSession = {
    userId,
    sessionName,
    createdAt: new Date(),
    lastAccessed: new Date(),
    documentIds: documentIds.map((id: string) => new ObjectId(id)),
    memory: [],
    agentState: {},
    status: 'running',
    result: {},
  };
  const result = await db.collection('rag_sessions').insertOne(session);
  return NextResponse.json({ sessionId: result.insertedId });
}

export async function PATCH(req: NextRequest) {
  const { sessionId, memory, agentState, status, result } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const db = await getMongo();
  const update: any = { lastAccessed: new Date() };
  if (memory) update.memory = memory;
  if (agentState) update.agentState = agentState;
  if (status) update.status = status;
  if (result) update.result = result;
  await db.collection('rag_sessions').updateOne(
    { _id: new ObjectId(sessionId) },
    { $set: update }
  );
  return NextResponse.json({ status: 'updated' });
} 