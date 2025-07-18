import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';
import { getSignedUrl } from '@/lib/gcs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const documentId = searchParams.get('documentId');
  if (!userId || !documentId) {
    return NextResponse.json({ error: 'Missing userId or documentId' }, { status: 400 });
  }
  const docSnap = await firestore.collection('documents').doc(documentId).get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  const doc = docSnap.data();
  if (!doc) {
    return NextResponse.json({ error: 'Document data missing' }, { status: 404 });
  }
  if (doc.userId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  // Assume GCS path is stored in doc.gcsPath or doc.path
  const gcsPath = doc.gcsPath || doc.path;
  if (!gcsPath) {
    return NextResponse.json({ error: 'No GCS path found for document' }, { status: 400 });
  }
  // Remove bucket URL prefix if present
  const filePath = gcsPath.replace(/^https:\/\/storage.googleapis.com\/[\w-]+\//, '');
  const url = await getSignedUrl(filePath);
  return NextResponse.json({ url });
} 