import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import { apiLogger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    apiLogger.info('Session metadata request received', { sessionId: params.sessionId });

    // Try to get session from Firestore first (primary storage)
    try {
      const sessionDoc = await firestore.collection('chat_sessions').doc(params.sessionId).get();
      
      if (!sessionDoc.exists) {
        apiLogger.warn('Session not found in Firestore', { sessionId: params.sessionId });
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const sessionData = sessionDoc.data();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🟦 [session_metadata][DEBUG] Firestore session data:', {
          sessionId: params.sessionId,
          documentContext: sessionData?.documentContext,
          documentIds: sessionData?.documentIds,
          hasDocumentContext: !!sessionData?.documentContext,
          documentContextLength: sessionData?.documentContext?.length || 0
        });
      }
      
      apiLogger.info('Session metadata retrieved from Firestore', { 
        sessionId: params.sessionId,
        userId: sessionData?.userId 
      });

      return NextResponse.json({
        id: sessionDoc.id,
        sessionName: sessionData?.sessionName,
        createdAt: sessionData?.createdAt?.toDate?.() || sessionData?.createdAt,
        updatedAt: sessionData?.updatedAt?.toDate?.() || sessionData?.updatedAt,
        documentContext: sessionData?.documentContext || [],
        documentIds: sessionData?.documentIds || [],
        user: {
          id: sessionData?.userId,
          name: sessionData?.userName || sessionData?.userEmail,
          email: sessionData?.userEmail,
        },
      });
    } catch (firestoreError) {
      apiLogger.warn('Firestore fetch failed, trying Prisma', { 
        sessionId: params.sessionId, 
        error: firestoreError 
      });

      // Fallback to Prisma if Firestore fails
      const session = await prisma.chatSession.findUnique({
        where: { id: params.sessionId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!session) {
        apiLogger.warn('Session not found in Prisma', { sessionId: params.sessionId });
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      apiLogger.info('Session metadata retrieved from Prisma', { 
        sessionId: params.sessionId,
        userId: session.userId 
      });

      return NextResponse.json({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        documentContext: [], // Prisma doesn't store document context
        documentIds: [],
        user: {
          id: session.user.id,
          name: session.user.name || session.user.email,
          email: session.user.email,
        },
      });
    }
  } catch (error) {
    apiLogger.error('Error fetching session metadata', error);
    return NextResponse.json(
      { error: 'Failed to fetch session metadata' },
      { status: 500 }
    );
  }
} 