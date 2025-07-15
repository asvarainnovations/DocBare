import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import firestore from '@/lib/firestore';
import { uploadFile } from '@/lib/gcs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string;

  if (!file || !userId) {
    return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  // Upload to Google Cloud Storage
  const { url, error: gcsError } = await uploadFile(fileName, file);

  if (gcsError) {
    return NextResponse.json({ error: gcsError.message }, { status: 500 });
  }

  if (!url) {
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      userId,
      fileName,
      path: url,
      originalName: file.name,
      mimeType: file.type,
    },
  });

  // Store document metadata in Firestore
  const firestoreDoc = {
    userId,
    filename: file.name,
    contentType: file.type,
    uploadDate: new Date(),
    status: 'pending',
    metadata: {},
  };
  const firestoreResult = await firestore.collection('documents').add(firestoreDoc);

  return NextResponse.json({ document: doc, firestoreId: firestoreResult.id });
} 