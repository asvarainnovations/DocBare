import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  const snapshot = await firestore.collection('documents')
    .where('userId', '==', userId)
    .orderBy('uploadDate', 'desc')
    .get();
  const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ documents });
} 