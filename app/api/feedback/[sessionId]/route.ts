import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  req: NextRequest, 
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Missing sessionId' 
      }, { status: 400 });
    }

    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get feedbacks for the specific session
    const feedbacks = await prisma.feedback.findMany({
      where: {
        sessionId: sessionId
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true
          }
        },
        session: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ 
      feedbacks: feedbacks.map(feedback => ({
        id: feedback.id,
        sessionId: feedback.sessionId,
        userId: feedback.userId,
        rating: feedback.rating,
        messageIndex: feedback.messageIndex,
        comments: feedback.comments,
        createdAt: feedback.createdAt.toISOString(),
        user: feedback.user,
        session: feedback.session
      }))
    });

  } catch (error) {
    console.error('🟥 [feedback][ERROR] Failed to fetch session feedbacks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch session feedbacks' 
    }, { status: 500 });
  }
}

 