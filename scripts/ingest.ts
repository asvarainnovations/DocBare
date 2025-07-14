import fs from 'fs';
import readline from 'readline';
import { config as dotenvConfig } from 'dotenv';
import firestore from '@/lib/firestore';
import OpenAI from 'openai';

dotenvConfig();

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

async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('No embeddings returned from OpenAI API');
  }
  return response.data[0].embedding;
}

async function ingest(jsonlPath: string, documentId?: string) {
  const rl = readline.createInterface({
    input: fs.createReadStream(jsonlPath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const rec = JSON.parse(line);
    const docId = documentId || `doc_${Math.random().toString(36).slice(2)}`;
    const chunks = splitIntoChunks(rec.text);
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const chunkDoc = {
        documentId: docId,
        chunkIndex: i,
        text: chunkText,
        tokenCount: countTokens(chunkText),
        createdAt: new Date(),
      };
      const chunkRef = await firestore.collection('document_chunks').add(chunkDoc);
      const embeddingVector = await getOpenAIEmbedding(chunkText);
      const embeddingDoc = {
        chunkId: chunkRef.id,
        vector: embeddingVector,
        model: 'text-embedding-3-small',
        createdAt: new Date(),
      };
      await firestore.collection('embeddings').add(embeddingDoc);
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