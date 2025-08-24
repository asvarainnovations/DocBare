import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Get chat sessions for this user that have feedback
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId: userId,
        feedbacks: {
          some: {}
        }
      },
      include: {
        feedbacks: true,
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Process chat sessions to get feedback counts and generate titles
    const processedChats = chatSessions.map((session: any) => {
      const goodCount = session.feedbacks.filter((f: any) => f.rating === 'good').length;
      const badCount = session.feedbacks.filter((f: any) => f.rating === 'bad').length;
      
      // Generate title from first user message
      const firstUserMessage = session.messages.find((m: any) => m.role === 'USER');
      const title = firstUserMessage 
        ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
        : `Chat ${session.id.substring(0, 8)}`;

      return {
        id: session.id,
        title,
        createdAt: session.createdAt.toISOString(),
        goodCount,
        badCount
      };
    });

    return NextResponse.json({
      chats: processedChats
    });
  } catch (error) {
    console.error('Error fetching user chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
} 