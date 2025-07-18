import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = await params;
    console.log('[session_metadata] Received:', { sessionId });
    if (!sessionId) {
      console.error('[session_metadata] Missing sessionId');
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    console.log('[session_metadata] Prisma session object:', JSON.stringify(session, null, 2));
    if (!session) {
      console.error('[session_metadata] Session not found:', sessionId);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (!session.user) {
      console.error('[session_metadata] User relation missing for session:', sessionId);
      return NextResponse.json({ error: 'User not found for session' }, { status: 500 });
    }
    console.log('[session_metadata] Prisma user object:', JSON.stringify(session.user, null, 2));
    const userName = session.user.fullName || session.user.email || 'Unknown User';
    console.log('[session_metadata] Returning metadata:', { id: session.id, createdAt: session.createdAt, user: { id: session.user.id, name: userName, email: session.user.email } });
    return NextResponse.json({
      id: session.id,
      createdAt: session.createdAt,
      user: {
        id: session.user.id,
        name: userName,
        email: session.user.email,
      },
    });
  } catch (err) {
    console.error('[session_metadata] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 