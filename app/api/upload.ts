import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { getMongo } from '@/lib/mongo';
import { MongoDocument } from '@/lib/mongoSchemas';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const userId = formData.get('userId') as string;

  if (!file || !userId) {
    return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const { data, error } = await supabase.storage.from('documents').upload(fileName, file);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      userId,
      fileName,
      path: data.path,
      originalName: file.name,
      mimeType: file.type,
    },
  });

  const db = await getMongo();
  const mongoDoc: MongoDocument = {
    userId,
    filename: file.name,
    contentType: file.type,
    uploadDate: new Date(),
    status: 'pending',
    metadata: {},
  };
  const mongoResult = await db.collection('documents').insertOne(mongoDoc);

  return NextResponse.json({ document: doc, mongoId: mongoResult.insertedId });
} 