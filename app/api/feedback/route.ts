import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId, rating, messageIndex, messageId, comments } = await req.json();
    
    console.info('🟦 [feedback][INFO] Received feedback request:', { 
      sessionId, 
      userId, 
      rating, 
      messageIndex, 
      messageId, 
      comments 
    });
    
    if (!sessionId || !userId || !rating) {
      console.error('🟥 [feedback][ERROR] Missing required fields:', { sessionId, userId, rating });
      return NextResponse.json({ 
        error: 'Missing sessionId, userId, or rating' 
      }, { status: 400 });
    }

    // Validate rating
    if (!['good', 'bad'].includes(rating)) {
      console.error('🟥 [feedback][ERROR] Invalid rating:', rating);
      return NextResponse.json({ 
        error: 'Rating must be either "good" or "bad"' 
      }, { status: 400 });
    }

    // Ensure messageIndex is a number or null
    let sanitizedMessageIndex: number | null = null;
    if (messageIndex !== undefined && messageIndex !== null && messageIndex !== '') {
      const parsed = parseInt(messageIndex.toString(), 10);
      if (!isNaN(parsed)) {
        sanitizedMessageIndex = parsed;
      } else {
        console.warn('🟨 [feedback][WARN] Invalid messageIndex:', messageIndex);
      }
    }

    console.info('🟦 [feedback][INFO] Sanitized messageIndex:', sanitizedMessageIndex);

    // Check if feedback already exists for this user, session, and messageIndex
    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        userId,
        sessionId,
        messageIndex: sanitizedMessageIndex,
      }
    });

    if (existingFeedback) {
      console.info('🟨 [feedback][INFO] Feedback already exists:', existingFeedback.id);
      return NextResponse.json({ 
        error: 'Feedback already submitted for this message' 
      }, { status: 409 });
    }

    // Create new feedback
    const feedback = await prisma.feedback.create({
      data: {
        sessionId,
        userId,
        rating,
        messageIndex: sanitizedMessageIndex,
        comments: typeof comments === 'string' ? comments : null,
        createdAt: new Date(),
      }
    });

    console.info('🟩 [feedback][SUCCESS] Feedback submitted:', { 
      feedbackId: feedback.id,
      sessionId, 
      userId, 
      rating,
      messageIndex: sanitizedMessageIndex
    });

    return NextResponse.json({ 
      success: true,
      feedbackId: feedback.id 
    });

  } catch (error: any) {
    console.error('🟥 [feedback][ERROR] Failed to submit feedback:', error);
    
    // Handle duplicate feedback submission (fallback)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Feedback already submitted for this message' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to submit feedback' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    // Build where clause
    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (userId) where.userId = userId;

    // Get feedbacks
    const feedbacks = await prisma.feedback.findMany({
      where,
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
      feedbacks: feedbacks.map((feedback: any) => ({
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
    console.error('🟥 [feedback][ERROR] Failed to fetch feedbacks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch feedbacks' 
    }, { status: 500 });
  }
}
