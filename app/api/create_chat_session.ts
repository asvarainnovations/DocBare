import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function POST(req: NextRequest) {
  const { firstMessage, userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 401 });
  }
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
  return NextResponse.json({ chatId: session.id });
} 