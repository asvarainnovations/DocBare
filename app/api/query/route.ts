import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import fs from 'fs';
import readline from 'readline';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { getQueryEmbedding } from '@/lib/embeddings';
import { getChunkTexts } from '@/lib/chunkText';

const predictionClient = new PredictionServiceClient({
  apiEndpoint: `${process.env.VERTEX_AI_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
});
const endpoint = process.env.VERTEX_AI_INDEX_ENDPOINT;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const CHUNKS_FILE = 'kb_data/datasets/legal_kb_embeddings_batch.json';
const TOP_K = 5;

// 2. Query Vertex AI Vector Search using SDK
async function queryVertexAI(embedding: number[], topK = TOP_K) {
  // Use the endpoint directly from the env variable
  const [response] = await predictionClient.predict({
    endpoint,
    instances: [
      {
        structValue: {
          fields: {
            embedding: {
              listValue: {
                values: embedding.map((x) => ({ numberValue: x })),
              },
            },
          },
        },
      },
    ],
    parameters: {
      structValue: {
        fields: {
          neighborCount: { numberValue: topK },
        },
      },
    },
  });
  // Parse response.predictions as needed for your index output
  return response.predictions;
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

    // 2. Retrieval (Vertex AI via SDK)
    const neighbors = await queryVertexAI(embedding, TOP_K) || [];

    // 3. Get chunk texts
    const chunkIds = Array.isArray(neighbors) ? neighbors.map((n: any) => n.id) : [];
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