import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminUtils';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check admin access
    await requireAdmin();
    // Get total feedbacks
    const totalFeedbacks = await prisma.feedback.count();

    // Get good vs bad percentage
    const goodFeedbacks = await prisma.feedback.count({
      where: { rating: 'good' }
    });

    const badFeedbacks = await prisma.feedback.count({
      where: { rating: 'bad' }
    });

    const goodPercentage = totalFeedbacks > 0 
      ? Math.round((goodFeedbacks / totalFeedbacks) * 100) 
      : 0;

    // Get active users who gave feedback
    const activeUsers = await prisma.user.count({
      where: {
        feedbacks: {
          some: {}
        }
      }
    });

    return NextResponse.json({
      totalFeedbacks,
      goodPercentage,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
} 