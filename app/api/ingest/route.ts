import { NextRequest, NextResponse } from 'next/server';
import firestore from '@/lib/firestore';
import OpenAI from 'openai';

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
  const { documentId } = await req.json();
  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }
  // Fetch document metadata from Firestore
  const docRef = firestore.collection('documents').doc(documentId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  const doc = docSnap.data();

  // For demo, assume doc.text exists (replace with actual file retrieval if needed)
  const text = doc.text || '';
  if (!text) {
    return NextResponse.json({ error: 'No text found in document metadata' }, { status: 400 });
  }

  // Split and embed
  const chunks = splitIntoChunks(text);
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkDoc = {
      documentId,
      chunkIndex: i,
      text: chunkText,
      tokenCount: countTokens(chunkText),
      createdAt: new Date(),
    };
    const chunkRef = await firestore.collection('document_chunks').add(chunkDoc);
    const embeddingResp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunkText,
    });
    const embeddingDoc = {
      chunkId: chunkRef.id,
      vector: embeddingResp.data[0].embedding,
      model: 'text-embedding-3-small',
      createdAt: new Date(),
    };
    await firestore.collection('embeddings').add(embeddingDoc);
  }
  await docRef.update({ status: 'processed' });
  return NextResponse.json({ status: 'ok', chunks: chunks.length });
} 