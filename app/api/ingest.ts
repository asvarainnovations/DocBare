import { NextRequest, NextResponse } from 'next/server';
import { getMongo } from '../../lib/mongo';
import { supabase } from '../../lib/supabaseClient';
import OpenAI from 'openai';
import { DocumentChunk, Embedding, MongoDocument } from '../../lib/mongoSchemas';
import { ObjectId } from 'mongodb';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function splitIntoChunks(text: string, chunkSize = 1000): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function countTokens(text: string): number {
  return text.split(/\s+/).length;
}

export async function POST(req: NextRequest) {
  const { mongoDocumentId } = await req.json();
  if (!mongoDocumentId) {
    return NextResponse.json({ error: 'Missing mongoDocumentId' }, { status: 400 });
  }
  const db = await getMongo();
  const documentsCol = db.collection<MongoDocument>('documents');
  const chunksCol = db.collection<DocumentChunk>('document_chunks');
  const embeddingsCol = db.collection<Embedding>('embeddings');

  const doc = await documentsCol.findOne({ _id: new ObjectId(mongoDocumentId) });
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Fetch file from Supabase Storage (assume filename is unique)
  // You may want to store the Supabase path in MongoDB for reliability
  // For now, use doc.filename
  // (You may need to adjust this logic to match your storage setup)
  // This is a placeholder for actual file retrieval logic
  // const { data, error } = await supabase.storage.from('documents').download(doc.filename);
  // if (error || !data) {
  //   return NextResponse.json({ error: error?.message || 'File not found' }, { status: 404 });
  // }
  // const text = await data.text();
  // For demo, assume doc.metadata.text exists
  const text = doc.metadata?.text || '';
  if (!text) {
    return NextResponse.json({ error: 'No text found in document metadata' }, { status: 400 });
  }

  // Split and embed
  const chunks = splitIntoChunks(text);
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkDoc: DocumentChunk = {
      documentId: doc._id!,
      chunkIndex: i,
      text: chunkText,
      tokenCount: countTokens(chunkText),
      createdAt: new Date(),
    };
    const chunkInsert = await chunksCol.insertOne(chunkDoc);
    const { data: embeddingData } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunkText,
    });
    const embeddingDoc: Embedding = {
      chunkId: chunkInsert.insertedId,
      vector: embeddingData[0].embedding,
      model: 'text-embedding-3-small',
      createdAt: new Date(),
    };
    await embeddingsCol.insertOne(embeddingDoc);
  }
  await documentsCol.updateOne({ _id: doc._id }, { $set: { status: 'processed' } });
  return NextResponse.json({ status: 'ok', chunks: chunks.length });
} 