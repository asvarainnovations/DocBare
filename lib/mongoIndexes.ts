import { getMongo } from './mongo';

export async function ensureMongoIndexes() {
  const db = await getMongo();

  // documents
  await db.collection('documents').createIndex({ userId: 1 });
  await db.collection('documents').createIndex({ status: 1, uploadDate: -1 });

  // document_chunks
  await db.collection('document_chunks').createIndex({ documentId: 1, chunkIndex: 1 }, { unique: true });

  // embeddings
  await db.collection('embeddings').createIndex({ chunkId: 1 });
  // Vector index: handled via Atlas UI or vector DB

  // rag_sessions
  await db.collection('rag_sessions').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('rag_sessions').createIndex({ status: 1 });

  // feedback
  await db.collection('feedback').createIndex({ sessionId: 1, userId: 1 });
} 