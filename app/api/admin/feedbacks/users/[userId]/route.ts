import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        feedbacks: {
          include: {
            session: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const feedbacks = user.feedbacks;
    const totalChats = new Set(feedbacks.map(f => f.sessionId)).size;
    const goodCount = feedbacks.filter(f => f.rating === 'good').length;
    const badCount = feedbacks.filter(f => f.rating === 'bad').length;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.name || 'Unknown User',
        image: user.image,
        totalChats,
        goodCount,
        badCount
      }
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user feedback' },
      { status: 500 }
    );
  }
} 