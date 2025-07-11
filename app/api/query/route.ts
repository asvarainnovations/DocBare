import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import fs from 'fs';
import readline from 'readline';

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const VERTEX_AI_ENDPOINT = process.env.VERTEX_AI_ENDPOINT!;
const VERTEX_AI_DEPLOYED_INDEX_ID = process.env.VERTEX_AI_DEPLOYED_INDEX_ID!;
const CHUNKS_FILE = 'kb_data/datasets/legal_kb_embeddings_batch.json';
const TOP_K = 5;

// 1. Generate embedding using DeepSeek API
async function getQueryEmbedding(query: string) {
  const response = await axios.post(
    DEEPSEEK_API_URL,
    { input: [query] },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } }
  );
  if (!response.data || !Array.isArray(response.data.embeddings) || response.data.embeddings.length === 0) {
    throw new Error('No embeddings returned from DeepSeek API');
  }
  return response.data.embeddings[0];
}

// 2. Query Vertex AI Vector Search
async function queryVertexAI(embedding: number[], topK = TOP_K) {
  const body = {
    deployedIndexId: VERTEX_AI_DEPLOYED_INDEX_ID,
    queries: [
      {
        embedding,
        neighborCount: topK,
      },
    ],
  };
  const response = await axios.post(
    VERTEX_AI_ENDPOINT,
    body,
    {
      headers: {
        'Authorization': `Bearer ${process.env.VERTEX_AI_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const neighbors = response.data.nearestNeighbors[0].neighbors;
  return neighbors.map((n: any) => ({
    id: n.datapoint.datapointId,
    distance: n.distance,
  }));
}

// 3. Retrieve chunk texts by ID
async function getChunkTexts(ids: string[]) {
  const rl = readline.createInterface({
    input: fs.createReadStream(CHUNKS_FILE),
    crlfDelay: Infinity,
  });
  const results: { id: string, text: string }[] = [];
  for await (const line of rl) {
    const rec = JSON.parse(line);
    if (ids.includes(rec.id)) {
      results.push({ id: rec.id, text: rec.text });
      if (results.length === ids.length) break;
    }
  }
  return results;
}

// 4. Construct RAG prompt
function buildPrompt(query: string, docs: { id: string, text: string }[]) {
  return `You are a legal assistant. Using the following knowledge, answer the question with clear reasoning:\n---\n${docs.map((d, i) => `[Doc${i + 1}]: ${d.text}`).join('\n')}\n---\nQuestion: ${query}\nAnswer:`;
}

// 5. Call DeepSeek LLM for answer
async function callLLM(prompt: string) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-r1-0528-maas',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      temperature: 0.2,
    },
    { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } }
  );
  return response.data.choices[0].message.content;
}

export async function POST(req: NextRequest) {
  try {
    const { query, userId } = await req.json();
    if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

    // 1. Embedding
    const embedding = await getQueryEmbedding(query);

    // 2. Retrieval
    const neighbors = await queryVertexAI(embedding, TOP_K);

    // 3. Get chunk texts
    const chunkIds = neighbors.map((n: any) => n.id);
    const chunks = await getChunkTexts(chunkIds);

    // 4. Build prompt
    const prompt = buildPrompt(query, chunks);

    // 5. LLM answer
    const answer = await callLLM(prompt);

    // 6. Log to Cloud SQL (Prisma)
    await prisma.ragQueryLog.create({
      data: {
        userId: userId || null,
        query,
        answer,
        sources: chunks,
      },
    });

    // 7. Log to Firestore (chat transcript, etc.)
    await firestore.collection('docbare_rag_logs').add({
      userId: userId || null,
      query,
      answer,
      sources: chunks,
      createdAt: new Date(),
    });

    // 8. Return answer and sources
    return NextResponse.json({ answer, sources: chunks });
  } catch (err: any) {
    console.error('DocBare RAG error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 