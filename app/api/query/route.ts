import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/prisma';
import firestore from '@/lib/firestore';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { MatchServiceClient } from '@google-cloud/aiplatform';
import { getQueryEmbedding } from '@/lib/embeddings';
import { getChunkTexts } from '@/lib/chunkText';

const predictionClient = new PredictionServiceClient({
  apiEndpoint: `${process.env.VERTEX_AI_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
});
const matchClient = new MatchServiceClient({
  apiEndpoint: `${process.env.VERTEX_AI_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
});
const endpoint = process.env.VERTEX_AI_INDEX_ENDPOINT;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const CHUNKS_FILE = 'kb_data/datasets/legal_kb_embeddings_batch.json';
const TOP_K = 5;

console.log('[query] NODE_ENV:', process.env.NODE_ENV);

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
    const { query, userId, sessionId } = await req.json();
    console.log('[query] Received:', { query, userId, sessionId });
    if (!query) {
      console.error('[query] Missing query');
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    let chunks = [];
    let answer = '';

    if (process.env.NODE_ENV === 'development') {
      // Use local embeddings file for retrieval (stream first 3 lines)
      const embeddingsPath = path.join(process.cwd(), 'kb_data/datasets/legal_kb_embeddings_batch.json');
      console.log('[query] Using local embeddings file:', embeddingsPath);
      const stream = fs.createReadStream(embeddingsPath);
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      chunks = [];
      for await (const line of rl) {
        if (chunks.length >= 3) break;
        try {
          const item = JSON.parse(line);
          chunks.push({ id: item.id, text: item.text });
        } catch {}
      }
      // Simple answer synthesis: concatenate the chunk texts
      answer = `Context:\n${chunks.map((c) => c.text).join('\n---\n')}\n\nUser question: ${query}\n\n(This is a development mode answer. No LLM used.)`;
      console.log('[query] Local dev answer:', answer);
    } else {
      // 1. Embedding
      const embedding = await getQueryEmbedding(query);
      console.log('[query] Embedding length:', embedding.length, 'First 5 values:', embedding.slice(0, 5));

      // 2. Retrieval (Vertex AI via SDK)
      console.log('[query] Vertex endpoint:', endpoint);
      
      let neighbors: any[] = [];
      try {
        // Use predict method for Vector Search endpoints
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
                neighborCount: { numberValue: TOP_K },
              },
            },
          },
        });
        
        console.log('[query] Vertex response:', response);
        
        // Parse the response to extract neighbors
        if (response.predictions && response.predictions.length > 0) {
          const prediction = response.predictions[0];
          if (prediction.structValue?.fields?.neighbors?.listValue?.values) {
            neighbors = prediction.structValue.fields.neighbors.listValue.values.map((n: any) => ({
              id: n.structValue?.fields?.id?.stringValue || n.structValue?.fields?.datapointId?.stringValue,
              distance: n.structValue?.fields?.distance?.numberValue,
              text: n.structValue?.fields?.text?.stringValue
            }));
          }
        }
        console.log('[query] Neighbors:', neighbors);
      } catch (vertexError: any) {
        console.error('[query] Vertex AI error details:', {
          code: vertexError.code,
          details: vertexError.details,
          message: vertexError.message,
          metadata: vertexError.metadata
        });
        throw vertexError;
      }

      // 3. Get chunk texts
      const chunkIds = Array.isArray(neighbors) ? neighbors.map((n: any) => n.id) : [];
      chunks = await getChunkTexts(chunkIds);
      console.log('[query] Chunks:', chunks);

      // 4. Build prompt
      const prompt = buildPrompt(query, chunks);
      console.log('[query] Prompt:', prompt);

      // 5. LLM answer
      answer = await callLLM(prompt);
      console.log('[query] LLM answer:', answer);
    }

    // 6. Log to Cloud SQL (Prisma)
    await prisma.ragQueryLog.create({
      data: {
        userId: userId || null,
        query,
        answer,
        sources: chunks,
      },
    });
    console.log('[query] Logged to Prisma ragQueryLog');

    // 7. Log to Firestore (chat transcript, etc.)
    await firestore.collection('docbare_rag_logs').add({
      userId: userId || null,
      query,
      answer,
      sources: chunks,
      createdAt: new Date(),
    });
    console.log('[query] Logged to Firestore docbare_rag_logs');

    // 8. Return answer and sources
    console.log('[query] Returning:', { answer, sources: chunks });
    return NextResponse.json({ answer, sources: chunks });
  } catch (err: any) {
    console.error('[query] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
} 