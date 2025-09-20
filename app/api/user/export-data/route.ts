import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        name: true,
        gender: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Get user's chat sessions
    const chatSessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Get user's documents
    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get user's feedback
    const feedbacks = await prisma.feedback.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        rating: true,
        comments: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        ...user,
        passwordHash: undefined // Don't include sensitive data
      },
      chatSessions: {
        count: chatSessions.length,
        sessions: chatSessions
      },
      documents: {
        count: documents.length,
        documents: documents
      },
      feedback: {
        count: feedbacks.length,
        feedbacks: feedbacks
      },
      metadata: {
        totalChatSessions: chatSessions.length,
        totalDocuments: documents.length,
        totalFeedback: feedbacks.length,
        accountCreated: user.createdAt,
        lastUpdated: user.updatedAt
      }
    };

    // Return as JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="docbare-data-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
