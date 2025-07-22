import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';

export async function POST(req: NextRequest) {
  try {
    const { firstMessage, userId } = await req.json();
    console.info('🟦 [chat_session][INFO] Received:', { firstMessage, userId });
    if (!userId) {
      console.error('🟥 [chat_session][ERROR] Missing userId');
      return NextResponse.json({ error: 'Missing userId' }, { status: 401 });
    }
    // Validate user existence
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error('🟥 [chat_session][ERROR] User not found:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Create session in Postgres
    const session = await prisma.chatSession.create({
      data: {
        userId,
        messages: {
          create: {
            role: 'USER',
            content: firstMessage,
          },
        },
      },
      include: { messages: true },
    });
    console.info('🟩 [chat_session][SUCCESS] Created session in Postgres:', session.id);

    // Create session in Firestore
    const now = new Date();
    const firestoreSession = {
      userId,
      createdAt: now,
      lastAccessed: now,
      sessionName: '',
      documentIds: [],
    };
    await firestore.collection('chat_sessions').doc(session.id).set(firestoreSession);
    console.info('🟩 [chat_session][SUCCESS] Created session in Firestore:', session.id);

    // Add first message to Firestore
    if (firstMessage && firstMessage.trim()) {
      await firestore.collection('chat_messages').add({
        sessionId: session.id,
        userId,
        role: 'USER',
        content: firstMessage,
        createdAt: now,
      });
      console.info('🟩 [chat_session][SUCCESS] Added first message to Firestore:', { sessionId: session.id, userId });
    }

    return NextResponse.json({ chatId: session.id });
  } catch (err) {
    console.error('[create_chat_session] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 