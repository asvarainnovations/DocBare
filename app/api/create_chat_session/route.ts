import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import axios from 'axios';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

async function generateChatTitle(prompt: string) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-reasoner',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: `Summarize this user query in 5 words or less for a chat title: ${prompt}` }
      ],
      max_tokens: 16,
      temperature: 0.3,
    },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } }
  );
  return response.data.choices[0].message.content.trim().replace(/^"|"$/g, '');
}

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

    // Generate chat title using DeepSeek
    let sessionName = '';
    if (firstMessage && firstMessage.trim()) {
      try {
        sessionName = (await generateChatTitle(firstMessage)).trim();
        if (!sessionName) {
          // fallback to first 5 words of prompt
          sessionName = firstMessage.split(' ').slice(0, 5).join(' ');
        }
        console.info('🟩 [chat_session][SUCCESS] Generated session name:', sessionName);
      } catch (err) {
        sessionName = firstMessage.split(' ').slice(0, 5).join(' ');
        console.error('🟥 [chat_session][ERROR] Failed to generate session name, using fallback:', err);
      }
    } else {
      return NextResponse.json({ error: 'First message required to create chat' }, { status: 400 });
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
        // If your Postgres model supports a name/title, add: name: sessionName,
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
      sessionName,
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