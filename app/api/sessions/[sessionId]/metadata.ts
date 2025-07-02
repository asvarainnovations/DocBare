import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: session.id,
    createdAt: session.createdAt,
    user: {
      id: session.user.id,
      name: session.user.fullName || session.user.email,
      email: session.user.email,
    },
  });
} 