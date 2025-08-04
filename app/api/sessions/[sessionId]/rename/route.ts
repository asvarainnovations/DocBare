import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { title } = await req.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Update the chat session title in Firestore
    const sessionRef = firestore.collection('chat_sessions').doc(sessionId);
    await sessionRef.update({
      sessionName: title.trim(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Chat session renamed successfully' 
    });

  } catch (error: any) {
    console.error('Error renaming chat session:', error);
    
    if (error.code === 'not-found') {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to rename chat session' },
      { status: 500 }
    );
  }
} 