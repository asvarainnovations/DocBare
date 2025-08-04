import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { chatId } = params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        feedbacks: true
      }
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Generate title from first user message
    const firstUserMessage = chatSession.messages.find(m => m.role === 'USER');
    const title = firstUserMessage 
      ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : `Chat ${chatSession.id.substring(0, 8)}`;

    // Process messages to include feedback information
    const processedMessages = chatSession.messages.map(message => {
      // Find feedback for this message (by messageIndex or by matching content)
      const feedback = chatSession.feedbacks.find(f => 
        f.messageIndex !== null && 
        chatSession.messages.indexOf(message) === f.messageIndex
      );

      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        feedback: feedback ? {
          id: feedback.id,
          rating: feedback.rating,
          comments: feedback.comments,
          createdAt: feedback.createdAt.toISOString()
        } : null
      };
    });

    return NextResponse.json({
      id: chatSession.id,
      title,
      createdAt: chatSession.createdAt.toISOString(),
      messages: processedMessages
    });
  } catch (error) {
    console.error('Error fetching chat detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat detail' },
      { status: 500 }
    );
  }
} 