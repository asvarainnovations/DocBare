import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminUtils';

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const rating = searchParams.get('rating'); // 'good', 'bad'

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (rating) where.rating = rating;

    // Get feedbacks with pagination
    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
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
        },
        skip,
        take: limit
      }),
      prisma.feedback.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('🟥 [admin_feedbacks][ERROR] Failed to fetch feedbacks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch feedbacks' 
    }, { status: 500 });
  }
}

 