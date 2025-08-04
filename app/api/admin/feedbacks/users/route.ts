import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange');

    // Build where clause for user search
    const userWhere: any = {
      feedbacks: {
        some: {}
      }
    };

    if (search) {
      userWhere.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with feedback
    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        feedbacks: {
          include: {
            session: true
          }
        }
      }
    });

    // Process users to get aggregated data
    const processedUsers = users.map(user => {
      const feedbacks = user.feedbacks;
      const totalChats = new Set(feedbacks.map(f => f.sessionId)).size;
      const goodCount = feedbacks.filter(f => f.rating === 'good').length;
      const badCount = feedbacks.filter(f => f.rating === 'bad').length;
      
      // Get last activity (most recent feedback)
      const lastActivity = feedbacks.length > 0 
        ? Math.max(...feedbacks.map(f => f.createdAt.getTime()))
        : 0;

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.name || 'Unknown User',
        image: user.image,
        totalChats,
        goodCount,
        badCount,
        lastActivity: new Date(lastActivity).toISOString()
      };
    });

    // Sort by last activity (most recent first)
    processedUsers.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    return NextResponse.json({
      users: processedUsers
    });
  } catch (error) {
    console.error('Error fetching users with feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 