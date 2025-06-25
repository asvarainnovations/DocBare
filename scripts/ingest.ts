import fs from 'fs';
import readline from 'readline';
import { getMongo } from '../lib/mongo';
import OpenAI from 'openai';
import { DocumentChunk, Embedding } from '@/lib/mongoSchemas';
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
  // Simple token count (can be replaced with a tokenizer)
  return text.split(/\s+/).length;
}

async function ingest(jsonlPath: string, documentId?: string) {
  const db = await getMongo();
  const chunksCol = db.collection<DocumentChunk>('document_chunks');
  const embeddingsCol = db.collection<Embedding>('embeddings');
  const rl = readline.createInterface({
    input: fs.createReadStream(jsonlPath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line);
    const docId = documentId ? new ObjectId(documentId) : new ObjectId();
    const chunks = splitIntoChunks(rec.text);
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const chunkDoc: DocumentChunk = {
        documentId: docId,
        chunkIndex: i,
        text: chunkText,
        tokenCount: countTokens(chunkText),
        createdAt: new Date(),
      };
      const chunkInsert = await chunksCol.insertOne(chunkDoc);
      const { data } = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunkText,
      });
      const embeddingDoc: Embedding = {
        chunkId: chunkInsert.insertedId,
        vector: data[0].embedding,
        model: 'text-embedding-3-small',
        createdAt: new Date(),
      };
      await embeddingsCol.insertOne(embeddingDoc);
    }
  }
  console.log('Ingestion complete.');
}

if (require.main === module) {
  const path = process.argv[2];
  const docId = process.argv[3];
  if (!path) throw new Error('Usage: ts-node scripts/ingest.ts <file.jsonl> [documentId]');
  ingest(path, docId);
} 