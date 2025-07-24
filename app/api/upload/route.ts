import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import firestore from '@/lib/firestore';
import { uploadFile } from '@/lib/gcs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const userId = formData.get('userId') as string;
  // Support both single and multiple file uploads
  const files = formData.getAll('files');
  let singleFile = formData.get('file');

  if (!userId || (!files.length && !singleFile)) {
    return NextResponse.json({ error: 'Missing file(s) or userId' }, { status: 400 });
  }

  // Normalize to array of File
  let fileList: File[] = [];
  if (files.length) {
    fileList = files.filter(f => f instanceof File) as File[];
  } else if (singleFile && singleFile instanceof File) {
    fileList = [singleFile];
  }

  const results = [];
  for (const file of fileList) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    // Upload to Google Cloud Storage
    const { url, error: gcsError } = await uploadFile(fileName, file);
    if (gcsError || !url) {
      results.push({ name: file.name, status: 'error', error: gcsError?.message || 'Upload failed' });
      continue;
    }
    // Store in Postgres
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
    results.push({ name: file.name, status: 'done', url, document: doc, firestoreId: firestoreResult.id });
  }
  return NextResponse.json({ results });
} 