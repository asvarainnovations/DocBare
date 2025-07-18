import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';
import { Storage } from '@google-cloud/storage';
import { prisma } from '@/lib/prisma';

const storage = new Storage({
  keyFilename: process.env.GCS_KEYFILE_PATH,
  projectId: process.env.FIRESTORE_PROJECT_ID,
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const documentId = searchParams.get('documentId');
  if (!userId || !documentId) {
    return NextResponse.json({ error: 'Missing userId or documentId' }, { status: 400 });
  }
  const docRef = firestore.collection('documents').doc(documentId);
  const docSnap = await docRef.get();
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
  try {
    await bucket.file(filePath).delete();
    await docRef.delete();
    // Also delete from Postgres
    await prisma.document.delete({ where: { id: documentId } });
    return NextResponse.json({ status: 'deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
} 